import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ParsedField } from '@/subject/physics-lab/field-parser';
import { FieldFullscreenModal } from '@/subject/physics-lab/field-fullscreen-modal';
import { FieldViewer } from '@/subject/physics-lab/field-viewer';

type FieldPanelProps = {
  field: ParsedField;
  onDismiss: () => void;
};

export function FieldPanel({ field, onDismiss }: FieldPanelProps) {
  const theme = useTheme();
  const [immersiveOpen, setImmersiveOpen] = useState(false);

  return (
    <View style={[styles.panel, { backgroundColor: theme.background }]}>
      <View style={[styles.subHeader, { borderBottomColor: theme.headerBorder }]}>
        <ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
          {field.title}
        </ThemedText>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setImmersiveOpen(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open fullscreen field view">
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
        <FieldViewer
          field={field}
          variant="fullscreen"
          onEnterImmersive={() => setImmersiveOpen(true)}
        />
      </View>
      <FieldFullscreenModal
        visible={immersiveOpen}
        field={field}
        onClose={() => setImmersiveOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, minHeight: 0 },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { flex: 1 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  backLink: { fontWeight: '600' },
  viewerWrap: { flex: 1, minHeight: 0 },
});
