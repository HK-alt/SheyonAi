import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ParsedMolecule } from './molecule-parser';

type MoleculeCardProps = {
  molecule: ParsedMolecule;
  onPress: () => void;
};

export function MoleculeCard({ molecule, onPress }: MoleculeCardProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.composerBorder,
        },
        pressed && styles.pressed,
      ]}>
      <View style={styles.row}>
        <View style={styles.textBlock}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {molecule.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            3D molecule · Tap to open
          </ThemedText>
        </View>
        <ThemedText style={[styles.expandIcon, { color: theme.actionIcon }]}>⤢</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  textBlock: {
    flex: 1,
    gap: Spacing.half,
  },
  expandIcon: {
    fontSize: 20,
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.7,
  },
});
