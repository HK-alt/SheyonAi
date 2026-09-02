import { Image } from 'expo-image';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AttachmentFileChip } from '@/components/chat/attachment-file-chip';
import { PdfViewerModal } from '@/components/chat/pdf-viewer-modal';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { isImageAttachment, isPdfAttachment } from '@/lib/attachment-utils';
import { useTheme } from '@/hooks/use-theme';
import type { PendingAttachment } from '@/types/chat';

type AttachmentPreviewProps = {
  attachments: PendingAttachment[];
  onRemove: (id: string) => void;
};

async function openAttachmentUri(uri: string) {
  try {
    const canOpen = await Linking.canOpenURL(uri);
    if (canOpen) {
      await Linking.openURL(uri);
    }
  } catch {
    // Ignore — some local cache URIs cannot be opened by the OS.
  }
}

export function AttachmentPreview({ attachments, onRemove }: AttachmentPreviewProps) {
  const theme = useTheme();
  const [pdfViewer, setPdfViewer] = useState<{ uri: string; name: string } | null>(null);

  if (attachments.length === 0) return null;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        style={styles.container}>
        {attachments.map((attachment) => (
          <View key={attachment.id} style={styles.thumbWrap}>
            {isImageAttachment(attachment.mimeType) ? (
              <Image source={{ uri: attachment.localUri }} style={styles.thumb} contentFit="cover" />
            ) : (
              <AttachmentFileChip
                compact
                name={attachment.name}
                mimeType={attachment.mimeType}
                size={attachment.size}
                onPress={() => {
                  if (isPdfAttachment(attachment.mimeType)) {
                    setPdfViewer({ uri: attachment.localUri, name: attachment.name });
                    return;
                  }
                  void openAttachmentUri(attachment.localUri);
                }}
              />
            )}
            <Pressable
              onPress={() => onRemove(attachment.id)}
              hitSlop={6}
              style={({ pressed }) => [
                styles.removeButton,
                { backgroundColor: theme.background },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={styles.removeText}>
                ×
              </ThemedText>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <PdfViewerModal
        visible={pdfViewer !== null}
        uri={pdfViewer?.uri ?? null}
        filename={pdfViewer?.name ?? 'PDF'}
        onClose={() => setPdfViewer(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.two,
  },
  row: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    fontSize: 16,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.7,
  },
});
