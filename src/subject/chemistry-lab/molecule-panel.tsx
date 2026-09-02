import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ParsedMolecule } from './molecule-parser';
import { MoleculeFullscreenModal } from './molecule-fullscreen-modal';
import { MoleculeViewer } from './molecule-viewer';

type MoleculePanelProps = {
  molecule: ParsedMolecule;
  onDismiss: () => void;
};

export function MoleculePanel({ molecule, onDismiss }: MoleculePanelProps) {
  const theme = useTheme();
  const [immersiveOpen, setImmersiveOpen] = useState(false);

  return (
    <View style={[styles.panel, { backgroundColor: theme.background }]}>
      <View style={[styles.subHeader, { borderBottomColor: theme.headerBorder }]}>
        <ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
          {molecule.title}
        </ThemedText>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setImmersiveOpen(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open fullscreen molecule view">
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
        <MoleculeViewer
          molecule={molecule}
          variant="fullscreen"
          onEnterImmersive={() => setImmersiveOpen(true)}
        />
      </View>
      <MoleculeFullscreenModal
        visible={immersiveOpen}
        molecule={molecule}
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
