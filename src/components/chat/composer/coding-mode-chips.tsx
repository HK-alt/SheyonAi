import { ScrollView, StyleSheet } from 'react-native';

import { ComposerChip, type ComposerChipIcon } from '@/components/chat/composer/composer-chip';
import { CODING_MODES } from '@/subject/subjects/coding-mode-prompts';
import { Spacing } from '@/constants/theme';
import type { CodingMode } from '@/types/chat';

const CODING_MODE_ICONS: Record<CodingMode, { icon: ComposerChipIcon; color: string }> = {
  learn: {
    icon: { ios: 'book.fill', android: 'auto_stories', web: 'auto_stories' },
    color: '#22C55E',
  },
  debug: {
    icon: { ios: 'ant.fill', android: 'bug_report', web: 'bug_report' },
    color: '#EF4444',
  },
  review: {
    icon: { ios: 'text.magnifyingglass', android: 'rate_review', web: 'rate_review' },
    color: '#6366F1',
  },
  explain: {
    icon: { ios: 'lightbulb.fill', android: 'lightbulb', web: 'lightbulb' },
    color: '#F59E0B',
  },
  build: {
    icon: { ios: 'hammer.fill', android: 'construction', web: 'construction' },
    color: '#FB923C',
  },
};

type CodingModeChipsProps = {
  activeMode: CodingMode | null;
  onSelect: (mode: CodingMode | null) => void;
  disabled?: boolean;
  floating?: boolean;
  /** When false, chips sit in a parent horizontal scroller. */
  scroll?: boolean;
};

export function CodingModeChips({
  activeMode,
  onSelect,
  disabled,
  floating,
  scroll = true,
}: CodingModeChipsProps) {
  const chips = CODING_MODES.map(({ id, label }) => {
    const { icon, color } = CODING_MODE_ICONS[id];
    return (
      <ComposerChip
        key={id}
        label={label}
        icon={icon}
        iconColor={color}
        active={activeMode === id}
        disabled={disabled}
        onPress={() => onSelect(activeMode === id ? null : id)}
      />
    );
  });

  if (!scroll) return chips;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, floating && styles.rowFloating]}>
      {chips}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowFloating: {
    paddingHorizontal: Spacing.two,
  },
});
