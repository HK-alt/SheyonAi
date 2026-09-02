import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { TUTOR_LEVELS } from '@/subject/subjects/personal-tutor-modes';
import type { TutorLevel } from '@/types/chat';

type TutorLevelHeaderButtonProps = {
  level: TutorLevel;
  onPress: () => void;
  disabled?: boolean;
};

export function TutorLevelHeaderButton({ level, onPress, disabled }: TutorLevelHeaderButtonProps) {
  const theme = useTheme();
  const label = TUTOR_LEVELS.find((item) => item.id === level)?.label ?? 'Level';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`Learning level, ${label}. Change level.`}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.trigger,
        Platform.OS === 'web' && styles.triggerWeb,
        {
          backgroundColor: Platform.OS === 'web'
            ? hovered
              ? theme.backgroundElement
              : 'transparent'
            : theme.accentMuted,
          borderColor: Platform.OS === 'web' ? (hovered ? theme.composerBorder : 'transparent') : theme.accent,
        },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <ThemedText
        style={[
          styles.triggerLabel,
          { color: Platform.OS === 'web' ? theme.text : theme.accent },
        ]}
        numberOfLines={1}>
        {label}
      </ThemedText>
      <SymbolView
        name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
        size={14}
        weight="semibold"
        tintColor={Platform.OS === 'web' ? theme.textSecondary : theme.accent}
      />
    </Pressable>
  );
}

type TutorLevelSheetProps = {
  visible: boolean;
  selected: TutorLevel;
  onSelect: (level: TutorLevel) => void;
  onClose: () => void;
};

export function TutorLevelSheet({ visible, selected, onSelect, onClose }: TutorLevelSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              borderColor: theme.headerBorder,
              paddingBottom: Math.max(insets.bottom, Spacing.three),
            },
          ]}
          onPress={(event) => event.stopPropagation()}>
          <View style={[styles.handle, Platform.OS === 'web' && styles.handleHidden, { backgroundColor: theme.backgroundSelected }]} />
          <View style={styles.sheetHeader}>
            <ThemedText type="smallBold" style={styles.sheetTitle}>
              Learning level
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.sheetSubtitle}>
              How explanations should be pitched in this chat.
            </ThemedText>
          </View>
          <View style={styles.options}>
            {TUTOR_LEVELS.map(({ id, label, caption }) => {
              const active = selected === id;
              return (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${label}. ${caption}`}
                  onPress={() => {
                    onSelect(id);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      backgroundColor: active ? theme.accentMuted : theme.backgroundElement,
                      borderColor: active ? theme.accent : theme.composerBorder,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <View style={styles.optionCopy}>
                    <ThemedText type="smallBold" style={styles.optionLabel}>
                      {label}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.optionCaption}>
                      {caption}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.check,
                      {
                        backgroundColor: active ? theme.accent : 'transparent',
                        borderColor: active ? theme.accent : theme.composerBorder,
                      },
                    ]}>
                    {active ? (
                      <SymbolView
                        name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                        size={12}
                        weight="bold"
                        tintColor="#FFFFFF"
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 32,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 168,
  },
  triggerWeb: {
    height: 30,
    paddingLeft: 10,
    paddingRight: 8,
    borderRadius: 8,
    maxWidth: 180,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  triggerLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingBottom: Platform.OS === 'web' ? 0 : Spacing.two,
  },
  sheet: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.three,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 12px 24px rgba(0,0,0,0.18)',
      },
    }),
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 2,
  },
  handleHidden: {
    height: 0,
    marginBottom: 0,
    overflow: 'hidden',
  },
  sheetHeader: {
    gap: 4,
  },
  sheetTitle: {
    fontSize: 17,
    lineHeight: 22,
  },
  sheetSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  options: {
    gap: Spacing.two,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  optionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  optionLabel: {
    fontSize: 16,
    lineHeight: 20,
  },
  optionCaption: {
    fontSize: 13,
    lineHeight: 18,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.5,
  },
});
