import { ScrollView, StyleSheet } from 'react-native';

import { ComposerChip, type ComposerChipIcon } from '@/components/chat/composer/composer-chip';
import { TUTOR_MODES } from '@/subject/subjects/personal-tutor-modes';
import { Spacing } from '@/constants/theme';
import type { TutorMode } from '@/types/chat';

const TUTOR_MODE_ICONS: Record<TutorMode, { icon: ComposerChipIcon; color: string }> = {
  teach: {
    icon: { ios: 'book.fill', android: 'menu_book', web: 'menu_book' },
    color: '#3B82F6',
  },
  hint: {
    icon: { ios: 'lightbulb.fill', android: 'lightbulb', web: 'lightbulb' },
    color: '#B45309',
  },
  no_answer: {
    icon: { ios: 'shield.fill', android: 'shield', web: 'shield' },
    color: '#6D28D9',
  },
  solution: {
    icon: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
    color: '#22C55E',
  },
  test: {
    icon: { ios: 'list.clipboard.fill', android: 'quiz', web: 'quiz' },
    color: '#EF4444',
  },
  plan: {
    icon: { ios: 'calendar', android: 'event', web: 'event' },
    color: '#0F766E',
  },
  cards: {
    icon: { ios: 'rectangle.on.rectangle.angled', android: 'style', web: 'style' },
    color: '#E86A2E',
  },
};

type PersonalTutorModeChipsProps = {
  activeMode: TutorMode;
  onSelect: (mode: TutorMode) => void;
  disabled?: boolean;
  floating?: boolean;
  /** When false, chips sit in a parent horizontal scroller. */
  scroll?: boolean;
};

export function PersonalTutorModeChips({
  activeMode,
  onSelect,
  disabled,
  floating,
  scroll = true,
}: PersonalTutorModeChipsProps) {
  const chips = TUTOR_MODES.map(({ id, label }) => {
    const { icon, color } = TUTOR_MODE_ICONS[id];
    return (
      <ComposerChip
        key={id}
        label={label}
        icon={icon}
        iconColor={color}
        active={activeMode === id}
        disabled={disabled}
        onPress={() => onSelect(id)}
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
