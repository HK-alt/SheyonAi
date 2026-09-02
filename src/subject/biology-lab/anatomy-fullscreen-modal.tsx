import { Modal, Platform, Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ParsedAnatomy } from '@/subject/biology-lab/anatomy-parser';
import { AnatomyViewer } from '@/subject/biology-lab/anatomy-viewer';

type AnatomyFullscreenModalProps = {
  visible: boolean;
  anatomy: ParsedAnatomy;
  onClose: () => void;
};

export function AnatomyFullscreenModal({ visible, anatomy, onClose }: AnatomyFullscreenModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      {Platform.OS === 'android' && visible ? <StatusBar hidden animated /> : null}
      <View style={[styles.root, { backgroundColor: '#0c1016', paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: theme.headerBorder }]}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
            {anatomy.title}
          </ThemedText>
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
            <ThemedText type="small" style={{ color: theme.accent, fontWeight: '600' }}>
              Done
            </ThemedText>
          </Pressable>
        </View>
        <View style={styles.viewerWrap}>
          <AnatomyViewer anatomy={anatomy} variant="immersive" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { flex: 1, color: '#e8eef7' },
  viewerWrap: { flex: 1, minHeight: 0 },
});
