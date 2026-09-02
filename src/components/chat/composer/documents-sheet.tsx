import { useState } from 'react';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DocumentListItem } from '@/components/rag/document-list-item';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuthContext } from '@/context/auth-context';
import { useChat } from '@/context/chat-context';
import { pickDocumentFile, waitForModalDismiss } from '@/lib/document-upload';
import { nextRagScopeAfterUpload, ragUploadSuccessHint } from '@/lib/rag-scope';
import { useTheme } from '@/hooks/use-theme';
import { useDocumentStore } from '@/store/document-store';
import type { DocumentRecord } from '@/types/rag';

type DocumentsSheetProps = {
  visible: boolean;
  onClose: () => void;
  onHint: (message: string) => void;
};

export function DocumentsSheet({ visible, onClose, onHint }: DocumentsSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuthContext();
  const { activeConversationId, activeRagDocumentIds, setRagDocumentScope } = useChat();
  const {
    documents,
    isFetching,
    fetchError,
    uploadStatus,
    fetchDocuments,
    uploadDocument,
    ingestUrl,
    deleteDocument,
  } = useDocumentStore();

  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Local selection mirrors the persisted rag_document_ids for the active chat.
  // null means "all docs selected" (no scope).
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (visible) void fetchDocuments();
  }, [visible, fetchDocuments]);

  // Sync local selection from context when sheet opens.
  useEffect(() => {
    if (visible) {
      if (activeRagDocumentIds && activeRagDocumentIds.length > 0) {
        setSelectedIds(new Set(activeRagDocumentIds));
      } else {
        setSelectedIds(null);
      }
    }
  }, [visible, activeRagDocumentIds]);

  // Reset URL input state when sheet closes.
  useEffect(() => {
    if (!visible) {
      setUrlInput('');
      setShowUrlInput(false);
    }
  }, [visible]);

  async function handleUpload() {
    if (!session?.user?.id) {
      onHint('You must be signed in to upload documents.');
      return;
    }

    // Close sheet before picker so Android can show the file chooser.
    onClose();
    await waitForModalDismiss();

    try {
      const picked = await pickDocumentFile();
      if (!picked) return;

      onHint('Uploading document…');
      const doc = await uploadDocument(picked, session.user.id);

      const nextScope = nextRagScopeAfterUpload(activeRagDocumentIds, doc.id);
      if (nextScope) {
        setSelectedIds(new Set(nextScope));
        await setRagDocumentScope(nextScope).catch(() => {});
      }

      onHint(ragUploadSuccessHint(doc.chunksCreated));
      void fetchDocuments();
    } catch (err) {
      onHint(err instanceof Error ? err.message : 'Upload failed.');
    }
  }

  async function handleIngestUrl() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      onHint('Please enter a valid http/https URL.');
      return;
    }
    setUrlInput('');
    setShowUrlInput(false);
    onHint('Fetching page…');
    try {
      const doc = await ingestUrl(trimmed);

      const nextScope = nextRagScopeAfterUpload(activeRagDocumentIds, doc.id);
      if (nextScope) {
        setSelectedIds(new Set(nextScope));
        await setRagDocumentScope(nextScope).catch(() => {});
      }

      onHint('Added to your library — ask in Documents mode to use it.');
      void fetchDocuments();
    } catch (err) {
      onHint(err instanceof Error ? err.message : 'URL ingestion failed.');
    }
  }

  function toggleDoc(docId: string) {
    setSelectedIds((prev) => {
      // null = all selected; start an explicit set from all current docs.
      const current = prev ?? new Set(documents.map((d) => d.id));
      const next = new Set(current);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      // If all docs are now selected, revert to null (= no scope).
      const nextIds = [...next];
      const allSelected = nextIds.length === documents.length;
      const updated = allSelected ? null : next;
      persistScope(updated);
      return updated;
    });
  }

  function selectAll() {
    setSelectedIds(null);
    persistScope(null);
  }

  function clearAll() {
    setSelectedIds(new Set());
    persistScope(new Set());
  }

  function persistScope(ids: Set<string> | null) {
    if (!activeConversationId || activeConversationId.startsWith('draft-')) return;
    const arr = ids === null ? null : [...ids];
    setRagDocumentScope(arr).catch(() => {});
  }

  function isDocSelected(docId: string): boolean {
    if (selectedIds === null) return true; // all selected
    return selectedIds.has(docId);
  }

  const selectedCount = selectedIds === null ? documents.length : selectedIds.size;
  const hasScopedSelection = selectedIds !== null && selectedIds.size < documents.length;

  const isUploading =
    uploadStatus.stage === 'uploading' || uploadStatus.stage === 'processing';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, Spacing.three),
            },
          ]}
          onPress={(e) => e.stopPropagation()}>
          <View style={[styles.handle, { backgroundColor: theme.composerBorder }]} />

          <View style={styles.titleRow}>
            <ThemedText type="smallBold" style={styles.title}>
              Your documents
            </ThemedText>
            {documents.length > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                {selectedCount}/{documents.length} active
              </ThemedText>
            )}
          </View>

          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            Upload PDFs, Word files, text, or LaTeX (.tex) — or add a web page URL.
          </ThemedText>

          {documents.length > 1 && (
            <View style={styles.scopeActions}>
              <Pressable onPress={selectAll} style={({ pressed }) => [styles.scopeBtn, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="accent">All</ThemedText>
              </Pressable>
              <Pressable onPress={clearAll} style={({ pressed }) => [styles.scopeBtn, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="textSecondary">None</ThemedText>
              </Pressable>
              {hasScopedSelection && (
                <ThemedText type="small" themeColor="accent" style={styles.scopeLabel}>
                  Scoped to {selectedCount} doc{selectedCount !== 1 ? 's' : ''}
                </ThemedText>
              )}
            </View>
          )}

          {isFetching && documents.length === 0 ? (
            <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
          ) : fetchError ? (
            <ThemedText themeColor="destructive" style={styles.empty}>
              {fetchError}
            </ThemedText>
          ) : documents.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              No documents yet. Upload a file or add a URL below.
            </ThemedText>
          ) : (
            <FlatList<DocumentRecord>
              data={documents}
              keyExtractor={(d) => d.id}
              style={styles.list}
              renderItem={({ item }) => (
                <DocumentListItem
                  document={item}
                  onDelete={deleteDocument}
                  selected={isDocSelected(item.id)}
                  onToggleSelect={() => toggleDoc(item.id)}
                />
              )}
            />
          )}

          {showUrlInput && (
            <View style={[styles.urlRow, { borderColor: theme.composerBorder }]}>
              <TextInput
                style={[styles.urlInput, { color: theme.text, borderColor: theme.composerBorder }]}
                placeholder="https://example.com/article"
                placeholderTextColor={theme.textSecondary}
                value={urlInput}
                onChangeText={setUrlInput}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="done"
                onSubmitEditing={() => void handleIngestUrl()}
              />
              <Pressable
                onPress={() => void handleIngestUrl()}
                style={({ pressed }) => [
                  styles.urlAddBtn,
                  { backgroundColor: theme.accent, opacity: pressed ? 0.7 : 1 },
                ]}>
                <ThemedText style={styles.urlAddText}>Add</ThemedText>
              </Pressable>
            </View>
          )}

          <Pressable
            disabled={isUploading}
            onPress={() => void handleUpload()}
            style={({ pressed }) => [
              styles.uploadBtn,
              { backgroundColor: theme.accent, opacity: isUploading || pressed ? 0.7 : 1 },
            ]}>
            {isUploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={styles.uploadText}>Upload file</ThemedText>
            )}
          </Pressable>

          <Pressable
            disabled={isUploading}
            onPress={() => setShowUrlInput((v) => !v)}
            style={({ pressed }) => [
              styles.urlToggleBtn,
              {
                borderColor: theme.composerBorder,
                opacity: isUploading || pressed ? 0.6 : 1,
              },
            ]}>
            <ThemedText themeColor="textSecondary" style={styles.urlToggleText}>
              {showUrlInput ? 'Cancel URL' : 'Add from URL'}
            </ThemedText>
          </Pressable>

          <Pressable onPress={onClose} style={styles.cancel}>
            <ThemedText themeColor="textSecondary">Close</ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    maxHeight: '85%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.three,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  title: {
    fontSize: 16,
  },
  subtitle: {
    marginBottom: Spacing.two,
  },
  scopeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  scopeBtn: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
    borderRadius: 8,
  },
  scopeLabel: {
    flex: 1,
    textAlign: 'right',
  },
  pressed: {
    opacity: 0.6,
  },
  list: {
    maxHeight: 260,
    marginBottom: Spacing.two,
  },
  loader: {
    marginVertical: Spacing.four,
  },
  empty: {
    textAlign: 'center',
    marginVertical: Spacing.four,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: Spacing.two,
    overflow: 'hidden',
  },
  urlInput: {
    flex: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: 10,
    fontSize: 14,
    borderRightWidth: 1,
  },
  urlAddBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
  },
  urlAddText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  uploadBtn: {
    borderRadius: 12,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  uploadText: {
    color: '#fff',
    fontWeight: '600',
  },
  urlToggleBtn: {
    borderRadius: 12,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    marginBottom: Spacing.two,
    borderWidth: 1,
  },
  urlToggleText: {
    fontSize: 14,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
