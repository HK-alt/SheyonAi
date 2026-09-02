import { Image } from 'expo-image';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { AttachmentFileChip } from '@/components/chat/attachment-file-chip';
import { PdfViewerModal } from '@/components/chat/pdf-viewer-modal';
import { useAttachmentUri } from '@/hooks/use-attachment-uri';
import { Spacing } from '@/constants/theme';
import { isImageAttachment, isPdfAttachment } from '@/lib/attachment-utils';
import type { MessageAttachment } from '@/types/chat';

function AttachmentImage({ attachment }: { attachment: MessageAttachment }) {
  const uri = useAttachmentUri(attachment);
  if (!uri) return null;

  return <Image source={{ uri }} style={styles.image} contentFit="cover" />;
}

function AttachmentFile({
  attachment,
  onOpenPdf,
}: {
  attachment: MessageAttachment;
  onOpenPdf: (uri: string, name: string) => void;
}) {
  const uri = useAttachmentUri(attachment);

  return (
    <AttachmentFileChip
      name={attachment.name}
      mimeType={attachment.mimeType}
      size={attachment.size}
      onPress={() => {
        if (!uri) return;
        if (isPdfAttachment(attachment.mimeType)) {
          onOpenPdf(uri, attachment.name);
          return;
        }
        void Linking.openURL(uri).catch(() => {
          // Signed URLs or local paths may fail on some platforms.
        });
      }}
    />
  );
}

type MessageAttachmentsProps = {
  attachments: MessageAttachment[];
};

export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  const [pdfViewer, setPdfViewer] = useState<{ uri: string; name: string } | null>(null);

  if (!attachments.length) return null;

  return (
    <>
      <View style={styles.grid}>
        {attachments.map((attachment) =>
          isImageAttachment(attachment.mimeType) ? (
            <AttachmentImage key={`${attachment.path}-${attachment.name}`} attachment={attachment} />
          ) : (
            <AttachmentFile
              key={`${attachment.path}-${attachment.name}`}
              attachment={attachment}
              onOpenPdf={(uri, name) => setPdfViewer({ uri, name })}
            />
          ),
        )}
      </View>

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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  image: {
    width: 140,
    height: 140,
    borderRadius: 12,
  },
});
