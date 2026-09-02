import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export type ComposerChipIcon = {
  ios: string;
  android: string;
  web: string;
};

type ComposerChipProps = {
  label: string;
  icon: ComposerChipIcon;
  iconColor: string;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

function tint(hex: string, alpha: number) {
  const raw = hex.replace('#', '');
  const n = parseInt(raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw, 16);
  if (Number.isNaN(n)) return hex;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function ComposerChip({
  label,
  icon,
  iconColor,
  active,
  disabled,
  onPress,
}: ComposerChipProps) {
  const theme = useTheme();
  const isWeb = Platform.OS === 'web';

  return (
    <Pressable
      disabled={disabled || !onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.chip,
        isWeb && styles.chipWeb,
        {
          backgroundColor: isWeb
            ? active
              ? tint(iconColor, 0.12)
              : hovered
                ? tint(iconColor, 0.08)
                : theme.backgroundElement
            : active
              ? tint(iconColor, 0.14)
              : theme.backgroundElement,
          borderColor: isWeb
            ? active
              ? tint(iconColor, 0.4)
              : hovered
                ? tint(iconColor, 0.22)
                : 'transparent'
            : active
              ? tint(iconColor, 0.55)
              : theme.composerBorder,
        },
        pressed && onPress && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <View
        style={[
          styles.iconWell,
          isWeb && styles.iconWellWeb,
          { backgroundColor: tint(iconColor, active ? 0.22 : 0.14) },
        ]}>
        <SymbolView
          name={icon}
          size={isWeb ? 14 : 15}
          tintColor={iconColor}
          weight="medium"
        />
      </View>
      <ThemedText
        style={[
          styles.chipText,
          isWeb && styles.chipTextWeb,
          {
            color: active ? iconColor : theme.text,
            fontWeight: active ? '700' : '600',
          },
        ]}
        numberOfLines={1}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: 12,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  chipWeb: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 11,
    gap: 7,
  },
  iconWell: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWellWeb: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  chipText: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  chipTextWeb: {
    fontSize: 12,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.5,
  },
});
