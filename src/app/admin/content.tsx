import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import * as DocumentPicker from 'expo-document-picker';

import { AdminPage } from '@/components/admin/admin-page';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { functionsUrl, supabase } from '@/lib/supabase';

interface DocRow {
  id: string;
  filename: string;
  is_curriculum: boolean;
  subject: string | null;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
  chunk_count?: number;
}

type Filter = 'all' | 'curriculum' | 'user';

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeSymbol(mime: string | null): SymbolViewProps['name'] {
  if (!mime) return { ios: 'doc.fill', android: 'description', web: 'description' };
  if (mime.includes('pdf'))
    return { ios: 'doc.richtext.fill', android: 'picture_as_pdf', web: 'picture_as_pdf' };
  if (mime.includes('image'))
    return { ios: 'photo.fill', android: 'image', web: 'image' };
  if (mime.includes('latex') || mime.includes('tex'))
    return { ios: 'function', android: 'functions', web: 'functions' };
  return { ios: 'doc.text.fill', android: 'article', web: 'article' };
}

interface DocItemProps {
  doc: DocRow;
  onDelete: (id: string, filename: string) => void;
  onReindex: (id: string) => void;
  reindexing: boolean;
}

function DocItem({ doc, onDelete, onReindex, reindexing }: DocItemProps) {
  const theme = useTheme();
  const uploaded = new Date(doc.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={[styles.docRow, { borderBottomColor: theme.headerBorder }]}>
      {/* File type icon */}
      <View style={[styles.docIconWrap, { backgroundColor: theme.backgroundElement }]}>
        <SymbolView
          name={mimeSymbol(doc.mime_type)}
          size={16}
          tintColor={theme.textSecondary}
        />
      </View>

      {/* Info */}
      <View style={styles.docInfo}>
        <ThemedText style={styles.docName} numberOfLines={2}>
          {doc.filename}
        </ThemedText>
        <View style={styles.docTags}>
          {doc.is_curriculum ? (
            <View
              style={[
                styles.tag,
                { backgroundColor: theme.accentMuted, borderColor: theme.accent + '44' },
              ]}>
              <ThemedText style={[styles.tagText, { color: theme.accent }]}>
                Curriculum
              </ThemedText>
            </View>
          ) : null}
          {doc.subject ? (
            <View
              style={[
                styles.tag,
                { backgroundColor: theme.backgroundElement, borderColor: theme.composerBorder },
              ]}>
              <ThemedText style={[styles.tagText, { color: theme.textSecondary }]}>
                {doc.subject}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText style={styles.docMeta} themeColor="textSecondary">
          {formatBytes(doc.file_size)}
          {doc.chunk_count !== undefined ? ` · ${doc.chunk_count} chunks` : ''}
          {' · '}
          {uploaded}
        </ThemedText>
      </View>

      {/* Actions */}
      <View style={styles.docActions}>
        <Pressable
          onPress={() => onReindex(doc.id)}
          disabled={reindexing}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              borderColor: theme.composerBorder,
              backgroundColor: theme.composerBackground,
            },
            (pressed || reindexing) && { opacity: 0.5 },
          ]}>
          {reindexing ? (
            <ActivityIndicator size="small" />
          ) : (
            <ThemedText style={[styles.actionText, { color: theme.textSecondary }]}>
              Reindex
            </ThemedText>
          )}
        </Pressable>
        <Pressable
          onPress={() => onDelete(doc.id, doc.filename)}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              borderColor: theme.destructive + '44',
              backgroundColor: theme.destructive + '0C',
            },
            pressed && { opacity: 0.5 },
          ]}>
          <ThemedText style={[styles.actionText, { color: theme.destructive }]}>
            Delete
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

async function loadDocuments(): Promise<DocRow[]> {
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, filename, is_curriculum, subject, mime_type, file_size, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!docs) return [];

  const chunkCounts = await Promise.all(
    docs.map((d) =>
      supabase
        .from('chunks')
        .select('id', { count: 'exact', head: true })
        .eq('document_id', d.id)
        .then(({ count }) => ({ id: d.id, count: count ?? 0 })),
    ),
  );
  const countMap = Object.fromEntries(chunkCounts.map((c) => [c.id, c.count]));

  return docs.map((d) => ({ ...d, chunk_count: countMap[d.id] ?? 0 }));
}

async function deleteDocument(id: string) {
  await supabase.from('chunks').delete().eq('document_id', id);
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
}

async function reindexDocument(id: string) {
  // Fetch the document to get storagePath and mimeType for the correct payload
  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('storage_path, mime_type')
    .eq('id', id)
    .single();
  if (fetchError || !doc) throw new Error('Document not found');

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const fnResponse = await fetch(`${functionsUrl}/process-document`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documentId: id,
      storagePath: doc.storage_path,
      mimeType: doc.mime_type ?? 'application/octet-stream',
    }),
  });
  if (!fnResponse.ok) {
    const text = await fnResponse.text();
    throw new Error(`Reindex failed (${fnResponse.status}): ${text}`);
  }
}

const SUBJECTS = [
  'math', 'physics', 'chemistry', 'biology',
  'english', 'history', 'geography', 'dzongkha', 'coding', 'general',
] as const;
type Subject = (typeof SUBJECTS)[number];

async function uploadCurriculumDocument(
  uri: string,
  name: string,
  mimeType: string,
  subject: Subject,
  size?: number,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Read blob from URI
  let uploadBody: Blob;
  if (Platform.OS === 'web') {
    const resp = await fetch(uri);
    uploadBody = await resp.blob();
  } else {
    const resp = await fetch(uri);
    uploadBody = await resp.blob();
  }

  const safe = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `curriculum/${subject}/${Date.now()}-${safe}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, uploadBody, { contentType: mimeType, upsert: false });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: docRow, error: insertError } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      filename: name,
      storage_path: storagePath,
      file_size: size ?? null,
      mime_type: mimeType,
      is_curriculum: true,
      subject,
    })
    .select('*')
    .single();
  if (insertError || !docRow) {
    await supabase.storage.from('documents').remove([storagePath]).catch(() => {});
    throw new Error(`Metadata insert failed: ${insertError?.message}`);
  }

  // Process
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const fnResp = await fetch(`${functionsUrl}/process-document`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documentId: docRow.id,
      storagePath,
      mimeType,
    }),
  });

  if (!fnResp.ok) {
    const text = await fnResp.text();
    // Don't delete — doc is stored, admin can reindex later
    console.warn('Process-document failed:', text);
    throw new Error(`Processing failed (${fnResp.status}). Document saved; try Reindex.`);
  }
}

// ---- Subject picker modal ------------------------------------------------

function SubjectPickerModal({
  visible,
  onCancel,
  onPick,
}: {
  visible: boolean;
  onCancel: () => void;
  onPick: (subject: Subject) => void;
}) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        style={[pickerStyles.overlay]}
        onPress={onCancel}>
        <View
          style={[
            pickerStyles.sheet,
            { backgroundColor: theme.composerBackground, borderColor: theme.headerBorder },
          ]}>
          <ThemedText style={pickerStyles.title}>Select subject</ThemedText>
          {SUBJECTS.map((s) => (
            <Pressable
              key={s}
              onPress={() => onPick(s)}
              style={({ pressed }) => [
                pickerStyles.item,
                { borderBottomColor: theme.headerBorder },
                pressed && { opacity: 0.6 },
              ]}>
              <ThemedText style={pickerStyles.itemText}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    ...Platform.select({ web: { boxShadow: '0 8px 32px rgba(0,0,0,0.2)' } }),
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    padding: 16,
    paddingBottom: 8,
  },
  item: {
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  itemText: { fontSize: 14 },
});

export default function AdminContentScreen() {
  const theme = useTheme();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    uri: string; name: string; mimeType: string; size?: number;
  } | null>(null);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await loadDocuments();
      setDocs(data);
    } catch (e: any) {
      console.error('Content load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = docs.filter((d) => {
    if (filter === 'curriculum') return d.is_curriculum;
    if (filter === 'user') return !d.is_curriculum;
    return true;
  });

  function confirmDelete(id: string, filename: string) {
    const doDelete = async () => {
      try {
        await deleteDocument(id);
        setDocs((prev) => prev.filter((d) => d.id !== id));
      } catch (e: any) {
        if (Platform.OS === 'web') alert('Delete failed: ' + e.message);
        else Alert.alert('Error', 'Delete failed: ' + e.message);
      }
    };

    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      if (confirm(`Delete "${filename}"?`)) doDelete();
    } else {
      Alert.alert('Delete document', `Delete "${filename}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  }

  async function handleReindex(id: string) {
    setReindexingId(id);
    try {
      await reindexDocument(id);
      await load();
    } catch (e: any) {
      if (Platform.OS === 'web') alert('Reindex failed: ' + e.message);
      else Alert.alert('Error', 'Reindex failed: ' + e.message);
    } finally {
      setReindexingId(null);
    }
  }

  async function handleUploadPress() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/*', 'application/msword',
             'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0]!;
    setPendingFile({
      uri: asset.uri,
      name: asset.name ?? 'document',
      mimeType: asset.mimeType ?? 'application/octet-stream',
      size: asset.size ?? undefined,
    });
    setShowSubjectPicker(true);
  }

  async function handleSubjectPicked(subject: Subject) {
    setShowSubjectPicker(false);
    if (!pendingFile) return;
    setUploading(true);
    try {
      await uploadCurriculumDocument(
        pendingFile.uri,
        pendingFile.name,
        pendingFile.mimeType,
        subject,
        pendingFile.size,
      );
      await load();
    } catch (e: any) {
      if (Platform.OS === 'web') alert('Upload failed: ' + e.message);
      else Alert.alert('Error', 'Upload failed: ' + e.message);
    } finally {
      setUploading(false);
      setPendingFile(null);
    }
  }

  const totalChunks = docs.reduce((s, d) => s + (d.chunk_count ?? 0), 0);

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: docs.length },
    { key: 'curriculum', label: 'Curriculum', count: docs.filter((d) => d.is_curriculum).length },
    { key: 'user', label: 'Uploaded', count: docs.filter((d) => !d.is_curriculum).length },
  ];

  return (
    <AdminPage
      title="Content"
      subtitle={`${docs.length} document${docs.length !== 1 ? 's' : ''} · ${totalChunks} chunks`}
      actions={
        <Pressable
          onPress={handleUploadPress}
          disabled={uploading}
          style={({ pressed }) => [
            uploadBtnStyle.btn,
            { backgroundColor: theme.accent },
            (pressed || uploading) && { opacity: 0.7 },
          ]}>
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <SymbolView
              name={{ ios: 'arrow.up.circle.fill', android: 'upload', web: 'upload' }}
              size={14}
              tintColor="#fff"
            />
          )}
          <ThemedText style={uploadBtnStyle.text}>
            {uploading ? 'Uploading…' : 'Upload Curriculum'}
          </ThemedText>
        </Pressable>
      }>
      {/* Filter tabs */}
      <View style={[styles.filterRow, { borderBottomColor: theme.headerBorder }]}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[
              styles.filterTab,
              filter === f.key && {
                borderBottomColor: theme.accent,
                borderBottomWidth: 2,
              },
            ]}>
            <ThemedText
              style={[
                styles.filterLabel,
                { color: filter === f.key ? theme.accent : theme.textSecondary },
                filter === f.key && styles.filterLabelActive,
              ]}>
              {f.label}
            </ThemedText>
            <View
              style={[
                styles.countChip,
                { backgroundColor: theme.backgroundElement },
              ]}>
              <ThemedText style={[styles.countText, { color: theme.textSecondary }]}>
                {f.count}
              </ThemedText>
            </View>
          </Pressable>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <ThemedText style={styles.loadingText} themeColor="textSecondary">
            Loading documents…
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(d) => d.id}
          renderItem={({ item }) => (
            <DocItem
              doc={item}
              onDelete={confirmDelete}
              onReindex={handleReindex}
              reindexing={reindexingId === item.id}
            />
          )}
          onRefresh={() => load(true)}
          refreshing={refreshing}
          contentContainerStyle={[
            styles.listContent,
            filtered.length === 0 && styles.listEmpty,
          ]}
          ListEmptyComponent={
            <View style={styles.center}>
              <SymbolView
                name={{ ios: 'tray.fill', android: 'inbox', web: 'inbox' }}
                size={32}
                tintColor={theme.textSecondary}
                style={{ opacity: 0.4 }}
              />
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                No documents found
              </ThemedText>
            </View>
          }
        />
      )}

      <SubjectPickerModal
        visible={showSubjectPicker}
        onCancel={() => { setShowSubjectPicker(false); setPendingFile(null); }}
        onPick={handleSubjectPicked}
      />
    </AdminPage>
  );
}

const uploadBtnStyle = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginRight: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterLabelActive: {
    fontWeight: '700',
  },
  countChip: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  docIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  docInfo: {
    flex: 1,
    gap: 4,
  },
  docName: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  docTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    alignItems: 'center',
  },
  tag: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  docMeta: {
    fontSize: 11,
    fontWeight: '500',
  },
  docActions: {
    gap: 5,
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  actionBtn: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    minWidth: 68,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 8,
  },
  listContent: {
    paddingBottom: 48,
  },
  listEmpty: {
    flex: 1,
  },
});
