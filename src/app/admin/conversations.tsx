import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { AdminPage } from '@/components/admin/admin-page';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

// ---- Types ---------------------------------------------------------------

type ConvRow = {
  id: string;
  title: string;
  user_email: string;
  user_id: string;
  message_count: number;
  updated_at: string;
  created_at: string;
};

type MessageRow = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

// ---- Data loading --------------------------------------------------------

async function loadConversations(search: string | null): Promise<ConvRow[]> {
  const { data, error } = await supabase.rpc('admin_list_conversations', {
    p_limit: 100,
    p_offset: 0,
    p_search: search ?? null,
  });
  if (error) throw error;
  return (data ?? []) as ConvRow[];
}

async function loadMessages(conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase.rpc('admin_conversation_messages', {
    p_conversation_id: conversationId,
  });
  if (error) throw error;
  return (data ?? []) as MessageRow[];
}

// ---- Thread detail modal --------------------------------------------------

function ThreadModal({
  conv,
  onClose,
}: {
  conv: ConvRow;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages(conv.id)
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [conv.id]);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[modalStyles.root, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[modalStyles.header, { borderBottomColor: theme.headerBorder }]}>
          <View style={modalStyles.headerText}>
            <ThemedText style={modalStyles.title} numberOfLines={1}>
              {conv.title || 'Untitled conversation'}
            </ThemedText>
            <ThemedText style={modalStyles.sub} themeColor="textSecondary" numberOfLines={1}>
              {conv.user_email} · {conv.message_count} msgs
            </ThemedText>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => [modalStyles.closeBtn, pressed && { opacity: 0.6 }]}>
            <SymbolView
              name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
              size={22}
              tintColor={theme.textSecondary}
            />
          </Pressable>
        </View>

        {loading ? (
          <View style={modalStyles.center}>
            <ActivityIndicator />
          </View>
        ) : (
          <ScrollView
            style={modalStyles.scroll}
            contentContainerStyle={modalStyles.scrollContent}>
            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  bubbleStyles.wrap,
                  msg.role === 'user' ? bubbleStyles.userWrap : bubbleStyles.assistantWrap,
                ]}>
                <View
                  style={[
                    bubbleStyles.bubble,
                    msg.role === 'user'
                      ? { backgroundColor: theme.accent }
                      : {
                          backgroundColor: theme.composerBackground,
                          borderColor: theme.headerBorder,
                          borderWidth: StyleSheet.hairlineWidth,
                        },
                  ]}>
                  <ThemedText
                    style={[
                      bubbleStyles.text,
                      { color: msg.role === 'user' ? '#fff' : theme.text },
                    ]}>
                    {msg.content}
                  </ThemedText>
                </View>
                <ThemedText style={bubbleStyles.meta} themeColor="textSecondary">
                  {msg.role === 'user' ? 'User' : 'Sheyon Ai'} ·{' '}
                  {new Date(msg.created_at).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </ThemedText>
              </View>
            ))}
            {messages.length === 0 && (
              <ThemedText style={{ textAlign: 'center', marginTop: 40 }} themeColor="textSecondary">
                No messages found.
              </ThemedText>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 12 },
  closeBtn: { padding: 2, ...Platform.select({ web: { cursor: 'pointer' } }) },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

const bubbleStyles = StyleSheet.create({
  wrap: { gap: 3 },
  userWrap: { alignItems: 'flex-end' },
  assistantWrap: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '85%',
    borderRadius: 14,
    padding: 12,
  },
  text: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 10, marginHorizontal: 4 },
});

// ---- Conversation row ----------------------------------------------------

function ConvRow({
  conv,
  onPress,
}: {
  conv: ConvRow;
  onPress: () => void;
}) {
  const theme = useTheme();
  const date = new Date(conv.updated_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        rowStyles.row,
        { borderBottomColor: theme.headerBorder },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      <View style={[rowStyles.icon, { backgroundColor: theme.backgroundElement }]}>
        <SymbolView
          name={{ ios: 'bubble.left.fill', android: 'chat', web: 'chat' }}
          size={14}
          tintColor={theme.textSecondary}
        />
      </View>
      <View style={rowStyles.content}>
        <ThemedText style={rowStyles.title} numberOfLines={1}>
          {conv.title || 'Untitled conversation'}
        </ThemedText>
        <ThemedText style={rowStyles.email} themeColor="textSecondary" numberOfLines={1}>
          {conv.user_email}
        </ThemedText>
      </View>
      <View style={rowStyles.meta}>
        <ThemedText style={rowStyles.count} themeColor="textSecondary">
          {conv.message_count} msgs
        </ThemedText>
        <ThemedText style={rowStyles.date} themeColor="textSecondary">
          {date}
        </ThemedText>
      </View>
      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        size={13}
        tintColor={theme.textSecondary}
      />
    </Pressable>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: { flex: 1, gap: 2 },
  title: { fontSize: 13, fontWeight: '600' },
  email: { fontSize: 12 },
  meta: { alignItems: 'flex-end', gap: 2 },
  count: { fontSize: 11 },
  date: { fontSize: 11 },
});

// ---- Main screen ---------------------------------------------------------

export default function AdminConversationsScreen() {
  const theme = useTheme();
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ConvRow | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const data = await loadConversations(q.trim() || null);
      setConvs(data);
    } catch (e: any) {
      console.error('Conversations load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load('');
  }, [load]);

  function handleSearchChange(text: string) {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(text), 400);
  }

  return (
    <AdminPage
      title="Conversations"
      subtitle={loading ? undefined : `${convs.length} found`}>
      <View style={styles.body}>
        {/* Search bar */}
        <View
          style={[
            styles.searchBar,
            { borderColor: theme.composerBorder, backgroundColor: theme.composerBackground },
          ]}>
          <SymbolView
            name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
            size={14}
            tintColor={theme.textSecondary}
          />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search by title or email…"
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <Pressable onPress={() => { setSearch(''); load(''); }} hitSlop={8}>
              <SymbolView
                name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
                size={14}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          )}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={convs}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <ConvRow conv={item} onPress={() => setSelected(item)} />
            )}
            onRefresh={() => load(search)}
            refreshing={loading}
            ListEmptyComponent={
              <View style={styles.center}>
                <ThemedText themeColor="textSecondary">No conversations found.</ThemedText>
              </View>
            }
            contentContainerStyle={{ flexGrow: 1 }}
          />
        )}
      </View>

      {selected && (
        <ThreadModal conv={selected} onClose={() => setSelected(null)} />
      )}
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
});
