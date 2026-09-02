import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/database';

export type SidebarFolder = {
  id: string;
  name: string;
  collapsed: boolean;
};

export type SidebarOrgState = {
  pinnedIds: string[];
  folders: SidebarFolder[];
  /** conversationId → folderId */
  folderByConversationId: Record<string, string>;
};

export type SidebarOrgRemote = SidebarOrgState & {
  updatedAt: number;
};

function asJson(value: unknown): Json {
  return value as Json;
}

export async function fetchSidebarOrg(userId: string): Promise<SidebarOrgRemote | null> {
  const { data, error } = await supabase
    .from('user_sidebar_org')
    .select('pinned_ids, folders, folder_by_conversation_id, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load sidebar org: ${error.message}`);
  if (!data) return null;

  return {
    pinnedIds: Array.isArray(data.pinned_ids) ? (data.pinned_ids as string[]) : [],
    folders: Array.isArray(data.folders) ? (data.folders as SidebarFolder[]) : [],
    folderByConversationId:
      data.folder_by_conversation_id && typeof data.folder_by_conversation_id === 'object'
        ? (data.folder_by_conversation_id as Record<string, string>)
        : {},
    updatedAt: new Date(data.updated_at).getTime(),
  };
}

export async function upsertSidebarOrg(userId: string, state: SidebarOrgState): Promise<number> {
  const updatedAt = new Date().toISOString();
  const { error } = await supabase.from('user_sidebar_org').upsert(
    {
      user_id: userId,
      pinned_ids: asJson(state.pinnedIds),
      folders: asJson(state.folders),
      folder_by_conversation_id: asJson(state.folderByConversationId),
      updated_at: updatedAt,
    },
    { onConflict: 'user_id' },
  );
  if (error) throw new Error(`Failed to save sidebar org: ${error.message}`);
  return new Date(updatedAt).getTime();
}
