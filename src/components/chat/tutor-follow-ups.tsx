import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TUTOR_FOLLOW_UPS } from '@/subject/subjects/personal-tutor-modes';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TutorMode } from '@/types/chat';

type TutorFollowUpsProps = {
  /** Hide Cards when the current message is already a deck. */
  hideCards?: boolean;
  /** Hide Quiz when the current message is already a quiz. */
  hideQuiz?: boolean;
  /** Hide Solve when the current message is already a worked solution. */
  hideSolve?: boolean;
  /** Hide Plan when the current message is already a study plan. */
  hidePlan?: boolean;
  disabled?: boolean;
  onSelect: (mode: TutorMode, text: string) => void;
};

export function TutorFollowUps({ hideCards, hideQuiz, hideSolve, hidePlan, disabled, onSelect }: TutorFollowUpsProps) {
  const theme = useTheme();
  const actions = TUTOR_FOLLOW_UPS.filter((item) => {
    if (hideCards && item.id === 'cards') return false;
    if (hideQuiz && item.id === 'test') return false;
    if (hideSolve && item.id === 'solution') return false;
    if (hidePlan && item.id === 'plan') return false;
    return true;
  });

  return (
    <View style={styles.row}>
      {actions.map((action) => (
        <Pressable
          key={action.id}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={() => onSelect(action.id, action.text)}
          style={({ pressed }) => [
            styles.chip,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.composerBorder,
            },
            pressed && !disabled && styles.pressed,
            disabled && styles.disabled,
          ]}>
          <ThemedText type="small" style={styles.label}>
            {action.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  chip: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  label: {
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
