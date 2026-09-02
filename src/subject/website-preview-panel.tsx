import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { WebsitePreviewFullscreenModal } from '@/subject/website-preview-fullscreen-modal';
import type { ParsedWebsitePreview } from '@/subject/website-preview-parser';
import { WebsitePreviewViewer } from '@/subject/website-preview-viewer';

type WebsitePreviewPanelProps = {
  preview: ParsedWebsitePreview;
  onDismiss: () => void;
  onHtmlApplied?: (html: string) => void;
};

/** Inline expanded website preview between chat header and composer. */
export function WebsitePreviewPanel({
  preview,
  onDismiss,
  onHtmlApplied,
}: WebsitePreviewPanelProps) {
  const theme = useTheme();
  const [immersiveOpen, setImmersiveOpen] = useState(false);
  const title = preview.title ?? 'Website preview';

  return (
    <View style={[styles.panel, { backgroundColor: theme.background }]}>
      <View style={[styles.subHeader, { borderBottomColor: theme.headerBorder }]}>
        <ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
          {title}
        </ThemedText>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setImmersiveOpen(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open fullscreen preview">
            <ThemedText type="small" style={{ color: theme.accent, fontWeight: '600' }}>
              Fullscreen
            </ThemedText>
          </Pressable>
          <Pressable onPress={onDismiss} hitSlop={8} accessibilityRole="button">
            <ThemedText type="small" themeColor="textSecondary" style={styles.backLink}>
              Back to chat
            </ThemedText>
          </Pressable>
        </View>
      </View>
      <View style={styles.viewerWrap}>
        <WebsitePreviewViewer
          htmlDocument={preview.htmlDocument}
          variant="fullscreen"
          onHtmlApplied={onHtmlApplied}
        />
      </View>

      <WebsitePreviewFullscreenModal
        visible={immersiveOpen}
        preview={preview}
        onClose={() => setImmersiveOpen(false)}
        onHtmlApplied={onHtmlApplied}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    minHeight: 0,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  backLink: {
    fontWeight: '600',
  },
  viewerWrap: {
    flex: 1,
    minHeight: 0,
  },
});
