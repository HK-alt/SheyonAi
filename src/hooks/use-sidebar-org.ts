import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuthContext } from '@/context/auth-context';
import { isDevBypassUser } from '@/lib/dev-session';
import { isSupabaseConfigured } from '@/lib/supabase';
import * as sidebarOrgService from '@/services/sidebar-org';
import type { SidebarFolder, SidebarOrgState } from '@/services/sidebar-org';

export type { SidebarFolder, SidebarOrgState };

type CachedSidebarOrg = SidebarOrgState & {
  updatedAt: number;
};

const EMPTY: SidebarOrgState = {
  pinnedIds: [],
  folders: [],
  folderByConversationId: {},
};

const SYNC_DEBOUNCE_MS = 450;

function storageKey(userId: string | null | undefined) {
  return `sheyonai.sidebarOrg.v1.${userId ?? 'local'}`;
}

function normalize(raw: unknown): CachedSidebarOrg {
  if (!raw || typeof raw !== 'object') {
    return { ...EMPTY, updatedAt: 0 };
  }
  const data = raw as Partial<CachedSidebarOrg>;
  const pinnedIds = Array.isArray(data.pinnedIds)
    ? data.pinnedIds.filter((id): id is string => typeof id === 'string')
    : [];
  const folders = Array.isArray(data.folders)
    ? data.folders
        .filter(
          (folder): folder is SidebarFolder =>
            !!folder &&
            typeof folder === 'object' &&
            typeof folder.id === 'string' &&
            typeof folder.name === 'string',
        )
        .map((folder) => ({
          id: folder.id,
          name: folder.name.trim() || 'Folder',
          collapsed: Boolean(folder.collapsed),
        }))
    : [];
  const folderByConversationId: Record<string, string> = {};
  if (data.folderByConversationId && typeof data.folderByConversationId === 'object') {
    for (const [conversationId, folderId] of Object.entries(data.folderByConversationId)) {
      if (typeof folderId === 'string' && folders.some((folder) => folder.id === folderId)) {
        folderByConversationId[conversationId] = folderId;
      }
    }
  }
  return {
    pinnedIds,
    folders,
    folderByConversationId,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
  };
}

function createId() {
  return `folder_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function withoutUpdatedAt(cached: CachedSidebarOrg): SidebarOrgState {
  return {
    pinnedIds: cached.pinnedIds,
    folders: cached.folders,
    folderByConversationId: cached.folderByConversationId,
  };
}

export function useSidebarOrg(userId: string | null | undefined) {
  const { user } = useAuthContext();
  const skipServer = !userId || !isSupabaseConfigured || isDevBypassUser(user);

  const [state, setState] = useState<CachedSidebarOrg>({ ...EMPTY, updatedAt: 0 });
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    async function hydrate() {
      let local: CachedSidebarOrg = { ...EMPTY, updatedAt: 0 };
      try {
        const raw = await AsyncStorage.getItem(storageKey(userId));
        if (raw) local = normalize(JSON.parse(raw));
      } catch {
        local = { ...EMPTY, updatedAt: 0 };
      }

      if (cancelled) return;
      setState(local);
      setReady(true);

      if (skipServer || !userId) return;

      try {
        const remote = await sidebarOrgService.fetchSidebarOrg(userId);
        if (cancelled) return;

        if (!remote) {
          const hasLocal =
            local.pinnedIds.length > 0 ||
            local.folders.length > 0 ||
            Object.keys(local.folderByConversationId).length > 0;
          if (hasLocal) {
            const updatedAt = await sidebarOrgService.upsertSidebarOrg(
              userId,
              withoutUpdatedAt(local),
            );
            if (!cancelled) {
              const next = { ...local, updatedAt };
              setState(next);
              AsyncStorage.setItem(storageKey(userId), JSON.stringify(next)).catch(() => {});
            }
          }
          return;
        }

        const remoteNormalized = normalize({
          pinnedIds: remote.pinnedIds,
          folders: remote.folders,
          folderByConversationId: remote.folderByConversationId,
          updatedAt: remote.updatedAt,
        });

        if (remoteNormalized.updatedAt >= local.updatedAt) {
          setState(remoteNormalized);
          AsyncStorage.setItem(storageKey(userId), JSON.stringify(remoteNormalized)).catch(
            () => {},
          );
        } else {
          const updatedAt = await sidebarOrgService.upsertSidebarOrg(
            userId,
            withoutUpdatedAt(local),
          );
          if (!cancelled) {
            const next = { ...local, updatedAt };
            setState(next);
            AsyncStorage.setItem(storageKey(userId), JSON.stringify(next)).catch(() => {});
          }
        }
      } catch {
        // Keep local cache when offline / transient errors.
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [userId, skipServer]);

  const flushToServer = useCallback(
    (next: SidebarOrgState) => {
      if (skipServer || !userId) return;
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        void sidebarOrgService
          .upsertSidebarOrg(userId, next)
          .then((updatedAt) => {
            setState((current) => {
              const merged = { ...current, ...next, updatedAt };
              stateRef.current = merged;
              AsyncStorage.setItem(storageKey(userId), JSON.stringify(merged)).catch(() => {});
              return merged;
            });
          })
          .catch(() => {});
      }, SYNC_DEBOUNCE_MS);
    },
    [skipServer, userId],
  );

  const persist = useCallback(
    (next: SidebarOrgState) => {
      const updatedAt = Date.now();
      const cached: CachedSidebarOrg = { ...next, updatedAt };
      stateRef.current = cached;
      setState(cached);
      AsyncStorage.setItem(storageKey(userId), JSON.stringify(cached)).catch(() => {});
      flushToServer(next);
    },
    [flushToServer, userId],
  );

  const isPinned = useCallback((id: string) => stateRef.current.pinnedIds.includes(id), []);

  const togglePin = useCallback(
    (id: string) => {
      const current = stateRef.current;
      persist({
        pinnedIds: current.pinnedIds.includes(id)
          ? current.pinnedIds.filter((pinnedId) => pinnedId !== id)
          : [id, ...current.pinnedIds],
        folders: current.folders,
        folderByConversationId: current.folderByConversationId,
      });
    },
    [persist],
  );

  const createFolder = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const current = stateRef.current;
      const folder: SidebarFolder = { id: createId(), name: trimmed, collapsed: false };
      persist({
        pinnedIds: current.pinnedIds,
        folders: [...current.folders, folder],
        folderByConversationId: current.folderByConversationId,
      });
      return folder.id;
    },
    [persist],
  );

  const renameFolder = useCallback(
    (folderId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const current = stateRef.current;
      persist({
        pinnedIds: current.pinnedIds,
        folders: current.folders.map((folder) =>
          folder.id === folderId ? { ...folder, name: trimmed } : folder,
        ),
        folderByConversationId: current.folderByConversationId,
      });
    },
    [persist],
  );

  const deleteFolder = useCallback(
    (folderId: string) => {
      const current = stateRef.current;
      const folderByConversationId = { ...current.folderByConversationId };
      for (const [conversationId, mappedFolderId] of Object.entries(folderByConversationId)) {
        if (mappedFolderId === folderId) delete folderByConversationId[conversationId];
      }
      persist({
        pinnedIds: current.pinnedIds,
        folders: current.folders.filter((folder) => folder.id !== folderId),
        folderByConversationId,
      });
    },
    [persist],
  );

  const toggleFolderCollapsed = useCallback(
    (folderId: string) => {
      const current = stateRef.current;
      persist({
        pinnedIds: current.pinnedIds,
        folders: current.folders.map((folder) =>
          folder.id === folderId ? { ...folder, collapsed: !folder.collapsed } : folder,
        ),
        folderByConversationId: current.folderByConversationId,
      });
    },
    [persist],
  );

  const moveToFolder = useCallback(
    (conversationId: string, folderId: string | null) => {
      const current = stateRef.current;
      const folderByConversationId = { ...current.folderByConversationId };
      if (!folderId) {
        delete folderByConversationId[conversationId];
      } else {
        folderByConversationId[conversationId] = folderId;
      }
      persist({
        pinnedIds: current.pinnedIds,
        folders: current.folders,
        folderByConversationId,
      });
    },
    [persist],
  );

  const pruneMissing = useCallback(
    (existingIds: Set<string>) => {
      const current = stateRef.current;
      const pinnedIds = current.pinnedIds.filter((id) => existingIds.has(id));
      const folderByConversationId: Record<string, string> = {};
      for (const [conversationId, folderId] of Object.entries(current.folderByConversationId)) {
        if (existingIds.has(conversationId)) {
          folderByConversationId[conversationId] = folderId;
        }
      }
      if (
        pinnedIds.length === current.pinnedIds.length &&
        Object.keys(folderByConversationId).length ===
          Object.keys(current.folderByConversationId).length
      ) {
        return;
      }
      persist({
        pinnedIds,
        folders: current.folders,
        folderByConversationId,
      });
    },
    [persist],
  );

  return useMemo(
    () => ({
      ready,
      pinnedIds: state.pinnedIds,
      folders: state.folders,
      folderByConversationId: state.folderByConversationId,
      isPinned,
      togglePin,
      createFolder,
      renameFolder,
      deleteFolder,
      toggleFolderCollapsed,
      moveToFolder,
      pruneMissing,
    }),
    [
      ready,
      state.pinnedIds,
      state.folders,
      state.folderByConversationId,
      isPinned,
      togglePin,
      createFolder,
      renameFolder,
      deleteFolder,
      toggleFolderCollapsed,
      moveToFolder,
      pruneMissing,
    ],
  );
}
