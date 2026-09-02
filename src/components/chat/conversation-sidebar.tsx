import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssistantAvatar } from '@/components/chat/assistant-avatar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuthContext } from '@/context/auth-context';
import { useChat } from '@/context/chat-context';
import { useSidebarOrg } from '@/hooks/use-sidebar-org';
import { useTheme } from '@/hooks/use-theme';
import { displayChatTitle } from '@/lib/chat-title';
import type { Conversation } from '@/types/chat';

export const SIDEBAR_WIDTH = Platform.OS === 'web' ? 280 : 288;
export const SIDEBAR_COLLAPSED_WIDTH = 56;

type ConversationSidebarProps = {
  variant: 'persistent' | 'overlay';
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onRequestClose?: () => void;
  /** Fired after opening a chat (select or new) so Research can switch back to Chat. */
  onActivateConversation?: () => void;
};

type GroupedChats = {
  label: string;
  items: Conversation[];
};

function groupConversations(conversations: Conversation[]): GroupedChats[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86_400_000;
  const startOfWeek = startOfToday - 7 * 86_400_000;
  const startOfMonth = startOfToday - 30 * 86_400_000;

  const buckets: GroupedChats[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Previous 7 days', items: [] },
    { label: 'Previous 30 days', items: [] },
    { label: 'Older', items: [] },
  ];

  for (const conversation of conversations) {
    const at = conversation.updatedAt;
    if (at >= startOfToday) buckets[0].items.push(conversation);
    else if (at >= startOfYesterday) buckets[1].items.push(conversation);
    else if (at >= startOfWeek) buckets[2].items.push(conversation);
    else if (at >= startOfMonth) buckets[3].items.push(conversation);
    else buckets[4].items.push(conversation);
  }

  return buckets.filter((group) => group.items.length > 0);
}

function userLabel(email?: string | null, name?: string | null) {
  if (name?.trim()) return name.trim();
  if (email) return email.split('@')[0] ?? email;
  return 'Account';
}

function userInitial(label: string) {
  return (label[0] ?? 'U').toUpperCase();
}

export function ConversationSidebar({
  variant,
  collapsed = false,
  onToggleCollapsed,
  onRequestClose,
  onActivateConversation,
}: ConversationSidebarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthContext();
  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    createConversation,
    deleteConversation,
  } = useChat();
  const org = useSidebarOrg(user?.id);

  const [query, setQuery] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [accountHovered, setAccountHovered] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [folderDraft, setFolderDraft] = useState('');
  const isWeb = Platform.OS === 'web';
  const isPersistent = variant === 'persistent';
  const isOverlay = variant === 'overlay';
  const isCollapsed = isPersistent && collapsed;
  const isMobileChrome = isOverlay || !isWeb;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter((conversation) =>
      conversation.title.toLowerCase().includes(needle),
    );
  }, [conversations, query]);

  const byId = useMemo(() => new Map(filtered.map((c) => [c.id, c])), [filtered]);

  const pinnedConversations = useMemo(
    () => org.pinnedIds.map((id) => byId.get(id)).filter((c): c is Conversation => Boolean(c)),
    [org.pinnedIds, byId],
  );

  const folderSections = useMemo(() => {
    return org.folders
      .map((folder) => ({
        folder,
        items: filtered.filter((c) => org.folderByConversationId[c.id] === folder.id),
      }))
      .filter((section) => section.items.length > 0 || !query.trim());
  }, [org.folders, org.folderByConversationId, filtered, query]);

  const unfiled = useMemo(() => {
    const pinned = new Set(org.pinnedIds);
    return filtered.filter((c) => !pinned.has(c.id) && !org.folderByConversationId[c.id]);
  }, [filtered, org.pinnedIds, org.folderByConversationId]);

  const groups = useMemo(() => groupConversations(unfiled), [unfiled]);

  const conversationIdsKey = useMemo(
    () => conversations.map((c) => c.id).sort().join(','),
    [conversations],
  );

  useEffect(() => {
    if (!org.ready) return;
    org.pruneMissing(new Set(conversationIdsKey ? conversationIdsKey.split(',') : []));
    // Intentionally keyed by id list, not the whole org object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationIdsKey, org.ready, org.pruneMissing]);

  const accountName = userLabel(
    user?.email,
    typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null,
  );
  const accountSub = user?.email ?? 'Sheyon Ai';

  function closeIfOverlay() {
    onRequestClose?.();
  }

  function handleSelect(id: string) {
    setActiveConversation(id);
    onActivateConversation?.();
    closeIfOverlay();
  }

  function handleNewChat() {
    createConversation();
    onActivateConversation?.();
    closeIfOverlay();
  }

  function handleSettings() {
    closeIfOverlay();
    router.push('/settings');
  }

  function confirmDelete(conversation: Conversation) {
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        !window.confirm(`Delete “${displayChatTitle(conversation.title)}”?`)
      ) {
        return;
      }
      deleteConversation(conversation.id);
      return;
    }
    Alert.alert('Delete chat', `Delete "${displayChatTitle(conversation.title)}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteConversation(conversation.id),
      },
    ]);
  }

  function submitFolder() {
    const name = folderDraft.trim();
    if (!name) return;
    if (renamingFolderId) {
      org.renameFolder(renamingFolderId, name);
      setRenamingFolderId(null);
      setFolderDraft('');
      setCreatingFolder(false);
      return;
    }
    if (org.createFolder(name)) {
      setFolderDraft('');
      setCreatingFolder(false);
    }
  }

  function cancelFolderComposer() {
    setCreatingFolder(false);
    setRenamingFolderId(null);
    setFolderDraft('');
  }

  function promptMoveToFolder(conversation: Conversation) {
    const options = [
      ...org.folders.map((folder) => ({
        text: folder.name,
        onPress: () => org.moveToFolder(conversation.id, folder.id),
      })),
      {
        text: 'Remove from folder',
        onPress: () => org.moveToFolder(conversation.id, null),
      },
      { text: 'Cancel', style: 'cancel' as const },
    ];

    if (org.folders.length === 0) {
      Alert.alert('No folders yet', 'Create a folder first, then move chats into it.', [
        { text: 'OK' },
      ]);
      return;
    }

    Alert.alert('Move to folder', displayChatTitle(conversation.title), options);
  }

  function openChatActions(conversation: Conversation) {
    const pinned = org.isPinned(conversation.id);
    Alert.alert(displayChatTitle(conversation.title), undefined, [
      {
        text: pinned ? 'Unpin' : 'Pin chat',
        onPress: () => org.togglePin(conversation.id),
      },
      {
        text: 'Move to folder',
        onPress: () => promptMoveToFolder(conversation),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => confirmDelete(conversation),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function openFolderActions(folderId: string, folderName: string) {
    Alert.alert(folderName, undefined, [
      {
        text: 'Rename',
        onPress: () => {
          if (Platform.OS === 'ios' && typeof Alert.prompt === 'function') {
            Alert.prompt(
              'Rename folder',
              undefined,
              (value) => {
                if (value) org.renameFolder(folderId, value);
              },
              'plain-text',
              folderName,
            );
            return;
          }
          setRenamingFolderId(folderId);
          setFolderDraft(folderName);
          setCreatingFolder(true);
        },
      },
      {
        text: 'Delete folder',
        style: 'destructive',
        onPress: () => org.deleteFolder(folderId),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  if (isCollapsed) {
    return (
      <View
        style={[
          styles.collapsedRail,
          {
            backgroundColor: theme.drawerBackground,
            borderRightColor: theme.headerBorder,
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}>
        <RailButton
          label="Expand sidebar"
          onPress={onToggleCollapsed}
          icon={
            <SymbolView
              name={{ ios: 'sidebar.left', android: 'menu', web: 'menu' }}
              size={18}
              tintColor={theme.text}
            />
          }
        />
        <RailButton
          label="New chat"
          onPress={handleNewChat}
          icon={
            <SymbolView
              name={{ ios: 'square.and.pencil', android: 'edit', web: 'edit' }}
              size={17}
              tintColor={theme.text}
            />
          }
        />
        <View style={styles.flex} />
        <RailButton
          label="Settings"
          onPress={handleSettings}
          icon={
            <View style={[styles.miniAvatar, { backgroundColor: theme.accentMuted }]}>
              <ThemedText style={[styles.miniAvatarLabel, { color: theme.accent }]}>
                {userInitial(accountName)}
              </ThemedText>
            </View>
          }
        />
      </View>
    );
  }

  function renderConversationRow(conversation: Conversation, opts?: { showPin?: boolean }) {
    const isActive = conversation.id === activeConversationId;
    const pinned = org.isPinned(conversation.id);
    const showActions = Platform.OS !== 'web' || hoveredId === conversation.id || isActive;
    const isHot = hoveredId === conversation.id || isActive;

    return (
      <View
        key={conversation.id}
        onPointerEnter={() => setHoveredId(conversation.id)}
        onPointerLeave={() =>
          setHoveredId((current) => (current === conversation.id ? null : current))
        }
        style={[
          styles.item,
          isMobileChrome && styles.itemMobile,
          isHot && {
            backgroundColor: isActive ? theme.drawerItemActive : theme.backgroundElement,
          },
          isActive &&
            isMobileChrome && {
              borderColor: theme.accentMuted,
              backgroundColor: theme.accentMuted,
            },
        ]}>
        {isActive && isMobileChrome ? (
          <View style={[styles.activeBar, { backgroundColor: theme.accent }]} />
        ) : null}
        <Pressable
          onPress={() => handleSelect(conversation.id)}
          onLongPress={() => openChatActions(conversation)}
          accessibilityRole="button"
          accessibilityLabel={conversation.title}
          style={({ pressed }) => [
            styles.itemMain,
            isMobileChrome && styles.itemMainMobile,
            pressed && styles.pressed,
          ]}>
          <View style={styles.itemTitleRow}>
            {opts?.showPin || pinned ? (
              <SymbolView
                name={{ ios: 'pin.fill', android: 'push_pin', web: 'push_pin' }}
                size={11}
                tintColor={theme.accent}
              />
            ) : null}
            <ThemedText
              type="small"
              numberOfLines={1}
              style={[
                styles.itemTitle,
                isMobileChrome && styles.itemTitleMobile,
                isActive && styles.itemTitleActive,
                isActive && isMobileChrome && { color: theme.accent },
              ]}>
              {displayChatTitle(conversation.title)}
            </ThemedText>
          </View>
        </Pressable>
        {showActions ? (
          <Pressable
            onPress={() => openChatActions(conversation)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Actions for ${conversation.title}`}
            style={({ pressed }) => [
              styles.deleteHit,
              isMobileChrome && styles.deleteHitMobile,
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }}
              size={isMobileChrome ? 16 : 14}
              tintColor={theme.textSecondary}
            />
          </Pressable>
        ) : (
          <View style={styles.deleteHit} />
        )}
      </View>
    );
  }

  return (
    <View
      style={[
        isPersistent ? styles.persistent : styles.overlayPanel,
        {
          backgroundColor: theme.drawerBackground,
          borderRightColor: theme.headerBorder,
          paddingTop: isPersistent ? Math.max(insets.top, 10) : 0,
          paddingBottom: Math.max(insets.bottom, isMobileChrome ? 12 : 10),
        },
      ]}>
      <View style={[styles.brandRow, isMobileChrome && styles.brandRowMobile]}>
        <View style={styles.brandLeft}>
          <AssistantAvatar size={isMobileChrome ? 28 : 24} />
          <View style={styles.brandText}>
            <ThemedText
              type="smallBold"
              style={[styles.brandName, isMobileChrome && styles.brandNameMobile]}>
              Sheyon Ai
            </ThemedText>
            {isMobileChrome ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.brandTagline}>
                Conversations
              </ThemedText>
            ) : null}
          </View>
        </View>
        {isPersistent ? (
          <IconHit
            label="Collapse sidebar"
            onPress={onToggleCollapsed}
            icon={
              <SymbolView
                name={{ ios: 'sidebar.left', android: 'menu_open', web: 'menu_open' }}
                size={18}
                tintColor={theme.textSecondary}
              />
            }
          />
        ) : (
          <IconHit
            label="Close menu"
            onPress={onRequestClose}
            icon={
              <View style={[styles.closeChip, { backgroundColor: theme.backgroundElement }]}>
                <SymbolView
                  name={{ ios: 'xmark', android: 'close', web: 'close' }}
                  size={13}
                  weight="semibold"
                  tintColor={theme.text}
                />
              </View>
            }
          />
        )}
      </View>

      <Pressable
        onPress={handleNewChat}
        accessibilityRole="button"
        accessibilityLabel="New chat"
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.newChat,
          isMobileChrome && styles.newChatMobile,
          isMobileChrome
            ? {
                backgroundColor: theme.accent,
                borderColor: 'transparent',
                opacity: pressed ? 0.88 : 1,
              }
            : {
                backgroundColor:
                  hovered || pressed ? theme.backgroundSelected : theme.backgroundElement,
                borderColor: isWeb ? 'transparent' : theme.composerBorder,
              },
          !isMobileChrome && pressed && styles.pressed,
        ]}>
        <SymbolView
          name={{ ios: 'square.and.pencil', android: 'edit', web: 'edit' }}
          size={16}
          tintColor={isMobileChrome ? '#FFFFFF' : isWeb ? theme.accent : theme.text}
        />
        <ThemedText
          type="small"
          style={[
            styles.newChatLabel,
            isMobileChrome && styles.newChatLabelMobile,
            isMobileChrome && { color: '#FFFFFF' },
          ]}>
          New chat
        </ThemedText>
      </Pressable>

      <Pressable
        onPress={() => {
          if (creatingFolder) {
            cancelFolderComposer();
            return;
          }
          setRenamingFolderId(null);
          setFolderDraft('');
          setCreatingFolder(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="New folder"
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.newFolder,
          {
            backgroundColor:
              hovered || pressed ? theme.backgroundSelected : theme.backgroundElement,
            borderColor: theme.composerBorder,
          },
          pressed && styles.pressed,
        ]}>
        <ThemedText type="small" style={[styles.newFolderPlus, { color: theme.accent }]}>
          +
        </ThemedText>
        <ThemedText type="small" style={[styles.newFolderLabel, { color: theme.text }]}>
          New folder
        </ThemedText>
      </Pressable>

      {creatingFolder ? (
        <View
          style={[
            styles.folderComposer,
            {
              backgroundColor: theme.background,
              borderColor: theme.accent,
            },
          ]}>
          <TextInput
            value={folderDraft}
            onChangeText={setFolderDraft}
            placeholder={renamingFolderId ? 'Rename folder' : 'Folder name'}
            placeholderTextColor={theme.textSecondary}
            autoFocus
            onSubmitEditing={submitFolder}
            style={[styles.folderInput, { color: theme.text }]}
          />
          <Pressable
            onPress={cancelFolderComposer}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Cancel folder"
            style={({ pressed }) => [styles.folderCancel, pressed && styles.pressed]}>
            <ThemedText type="small" themeColor="textSecondary">
              Cancel
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={submitFolder}
            disabled={!folderDraft.trim()}
            style={({ pressed }) => [
              styles.folderSave,
              {
                backgroundColor: theme.accent,
                opacity: !folderDraft.trim() ? 0.4 : pressed ? 0.85 : 1,
              },
            ]}>
            <ThemedText type="small" style={styles.folderSaveLabel}>
              {renamingFolderId ? 'Save' : 'Add'}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      <View
        style={[
          styles.searchWrap,
          isMobileChrome && styles.searchWrapMobile,
          {
            backgroundColor: isMobileChrome ? theme.background : theme.backgroundElement,
            borderColor: isMobileChrome
              ? theme.composerBorder
              : isWeb
                ? 'transparent'
                : theme.composerBorder,
          },
        ]}>
        <SymbolView
          name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
          size={14}
          tintColor={theme.textSecondary}
        />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search chats"
          placeholderTextColor={theme.textSecondary}
          autoCorrect={false}
          autoCapitalize="none"
          style={[styles.searchInput, { color: theme.text }]}
        />
        {query.length > 0 ? (
          <Pressable
            onPress={() => setQuery('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={({ pressed }) => [styles.clearSearch, pressed && styles.pressed]}>
            <SymbolView
              name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
              size={15}
              tintColor={theme.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={isMobileChrome ? styles.listContentMobile : undefined}
        showsVerticalScrollIndicator={false}>
        {pinnedConversations.length > 0 ? (
          <View style={[styles.group, isMobileChrome && styles.groupMobile]}>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={[styles.groupLabel, isMobileChrome && styles.groupLabelMobile]}>
              Pinned
            </ThemedText>
            {pinnedConversations.map((conversation) =>
              renderConversationRow(conversation, { showPin: true }),
            )}
          </View>
        ) : null}

        {folderSections.map(({ folder, items }) => (
          <View key={folder.id} style={[styles.group, isMobileChrome && styles.groupMobile]}>
            <Pressable
              onPress={() => org.toggleFolderCollapsed(folder.id)}
              onLongPress={() => openFolderActions(folder.id, folder.name)}
              style={styles.folderHeader}>
              <SymbolView
                name={{
                  ios: folder.collapsed ? 'chevron.right' : 'chevron.down',
                  android: folder.collapsed ? 'chevron_right' : 'expand_more',
                  web: folder.collapsed ? 'chevron_right' : 'expand_more',
                }}
                size={12}
                tintColor={theme.textSecondary}
              />
              <SymbolView
                name={{ ios: 'folder.fill', android: 'folder', web: 'folder' }}
                size={13}
                tintColor={theme.accent}
              />
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={[styles.groupLabel, styles.folderLabel, isMobileChrome && styles.groupLabelMobile]}
                numberOfLines={1}>
                {folder.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.folderCount}>
                {items.length}
              </ThemedText>
            </Pressable>
            {folder.collapsed
              ? null
              : items.map((conversation) => renderConversationRow(conversation))}
          </View>
        ))}

        {groups.length === 0 &&
        pinnedConversations.length === 0 &&
        folderSections.every((section) => section.items.length === 0) ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.accentMuted }]}>
              <SymbolView
                name={{ ios: 'bubble.left.and.bubble.right', android: 'chat', web: 'chat' }}
                size={18}
                tintColor={theme.accent}
              />
            </View>
            <ThemedText type="small" style={styles.emptyTitle}>
              {query.trim() ? 'No chats found' : 'No conversations yet'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptySub}>
              {query.trim() ? 'Try a different search' : 'Start a new chat to begin'}
            </ThemedText>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.label} style={[styles.group, isMobileChrome && styles.groupMobile]}>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={[styles.groupLabel, isMobileChrome && styles.groupLabelMobile]}>
                {group.label}
              </ThemedText>
              {group.items.map((conversation) => renderConversationRow(conversation))}
            </View>
          ))
        )}
      </ScrollView>

      <Pressable
        onPress={handleSettings}
        accessibilityRole="button"
        accessibilityLabel="Open settings"
        onPointerEnter={() => setAccountHovered(true)}
        onPointerLeave={() => setAccountHovered(false)}
        style={({ pressed }) => [
          styles.accountRow,
          isMobileChrome && styles.accountRowMobile,
          {
            borderTopColor: theme.headerBorder,
            backgroundColor:
              accountHovered || pressed
                ? theme.drawerItemActive
                : isMobileChrome
                  ? theme.background
                  : 'transparent',
            borderColor: isMobileChrome ? theme.composerBorder : 'transparent',
          },
          pressed && styles.pressed,
        ]}>
        <View
          style={[
            styles.accountAvatar,
            isMobileChrome && styles.accountAvatarMobile,
            { backgroundColor: theme.accentMuted },
          ]}>
          <ThemedText
            type="smallBold"
            style={{
              color: theme.accent,
              fontSize: isMobileChrome ? 13 : 12,
              lineHeight: isMobileChrome ? 17 : 16,
            }}>
            {userInitial(accountName)}
          </ThemedText>
        </View>
        <View style={styles.accountText}>
          <ThemedText type="small" numberOfLines={1} style={styles.accountName}>
            {accountName}
          </ThemedText>
          <ThemedText
            type="small"
            themeColor="textSecondary"
            numberOfLines={1}
            style={styles.accountSub}>
            {accountSub}
          </ThemedText>
        </View>
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={13}
          tintColor={theme.textSecondary}
        />
      </Pressable>
    </View>
  );
}

function RailButton({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress?: () => void;
  icon: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.railButton,
        { backgroundColor: pressed ? theme.drawerItemActive : 'transparent' },
      ]}>
      {icon}
    </Pressable>
  );
}

function IconHit({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress?: () => void;
  icon: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconHit, pressed && styles.pressed]}>
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  persistent: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    zIndex: 2,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    ...Platform.select({
      web: {
        flexShrink: 0,
        transitionProperty: 'width',
        transitionDuration: '180ms',
      },
    }),
  },
  overlayPanel: {
    flex: 1,
    paddingHorizontal: 12,
  },
  collapsedRail: {
    width: SIDEBAR_COLLAPSED_WIDTH,
    height: '100%',
    zIndex: 2,
    borderRightWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 6,
    ...Platform.select({
      web: { flexShrink: 0 },
    }),
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingVertical: Platform.OS === 'web' ? 10 : 6,
    marginBottom: 2,
  },
  brandRowMobile: {
    paddingVertical: 10,
    marginBottom: 4,
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    flex: 1,
  },
  brandText: {
    minWidth: 0,
    gap: 0,
  },
  brandName: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.35,
  },
  brandNameMobile: {
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.35,
    fontWeight: '700',
  },
  brandTagline: {
    fontSize: 11,
    lineHeight: 14,
  },
  closeChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    borderRadius: 10,
    borderWidth: Platform.OS === 'web' ? 0 : StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    marginBottom: 8,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  newChatMobile: {
    height: 42,
    borderRadius: 12,
    borderWidth: 0,
    paddingHorizontal: 14,
    marginBottom: 8,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  newChatLabel: {
    fontWeight: '600',
  },
  newChatLabelMobile: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  newFolder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    marginBottom: 8,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  newFolderPlus: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
  },
  newFolderLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 36,
    borderRadius: 10,
    borderWidth: Platform.OS === 'web' ? 0 : StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  searchWrapMobile: {
    height: 38,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 0,
    ...Platform.select({
      web: { outlineStyle: 'none' as unknown as undefined },
    }),
  },
  clearSearch: {
    padding: 2,
  },
  folderComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingLeft: 12,
    paddingRight: 6,
    marginBottom: 8,
  },
  folderInput: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    paddingVertical: 8,
    ...Platform.select({
      web: { outlineStyle: 'none' as unknown as undefined },
    }),
  },
  folderCancel: {
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  folderSave: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  folderSaveLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    flex: 1,
    minHeight: 0,
  },
  listContentMobile: {
    paddingBottom: Spacing.one,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    gap: 4,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  emptySub: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  group: {
    marginBottom: 6,
  },
  groupMobile: {
    marginBottom: 8,
  },
  groupLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 3,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  groupLabelMobile: {
    fontSize: 10,
    paddingHorizontal: 6,
    paddingTop: 2,
    paddingBottom: 4,
    letterSpacing: 0.55,
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    minHeight: 28,
  },
  folderLabel: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: 12,
  },
  folderCount: {
    fontSize: 11,
    lineHeight: 14,
    minWidth: 16,
    textAlign: 'right',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 34,
    borderRadius: 8,
    paddingLeft: 10,
    paddingRight: 4,
    gap: 4,
    overflow: 'hidden',
  },
  itemMobile: {
    minHeight: 40,
    borderRadius: 10,
    paddingLeft: 10,
    paddingRight: 4,
    marginBottom: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  itemMain: {
    flex: 1,
    minWidth: 0,
    minHeight: 34,
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  itemMainMobile: {
    minHeight: 40,
    paddingLeft: 4,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 0,
  },
  itemTitle: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
  },
  itemTitleMobile: {
    fontSize: 13.5,
    lineHeight: 18,
  },
  itemTitleActive: {
    fontWeight: '600',
  },
  deleteHit: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteHitMobile: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  accountRowMobile: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    gap: 10,
  },
  accountAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarMobile: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  accountText: {
    flex: 1,
    minWidth: 0,
  },
  accountName: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  accountSub: {
    fontSize: 11,
    lineHeight: 14,
  },
  railButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  miniAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  iconHit: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
});
