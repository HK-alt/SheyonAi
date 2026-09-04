import { Modal, Platform, Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ParsedWebsitePreview } from '@/subject/website-preview-parser';
import { WebsitePreviewViewer } from '@/subject/website-preview-viewer';

type WebsitePreviewFullscreenModalProps = {
  visible: boolean;
  preview: ParsedWebsitePreview;
  onClose: () => void;
};

/** Device-immersive preview overlay — hides chat chrome for an edge-to-edge experience. */
export function WebsitePreviewFullscreenModal({
  visible,
  preview,
  onClose,
}: WebsitePreviewFullscreenModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const title = preview.title ?? 'Live preview';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      {Platform.OS === 'android' && visible ? (
        <StatusBar hidden animated />
      ) : null}
      <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: theme.headerBorder }]}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
            {title}
          </ThemedText>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Exit fullscreen preview">
            <ThemedText type="small" style={{ color: theme.accent, fontWeight: '600' }}>
              Done
            </ThemedText>
          </Pressable>
        </View>
        <View style={styles.viewerWrap}>
          <WebsitePreviewViewer
            htmlDocument={preview.htmlDocument}
            variant="immersive"
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
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
  viewerWrap: {
    flex: 1,
    minHeight: 0,
  },
});
