import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type AssistantAvatarProps = {
  size?: number;
};

export function AssistantAvatar({ size = 32 }: AssistantAvatarProps) {
  const theme = useTheme();
  const isWeb = Platform.OS === 'web';
  const fontSize = Math.max(11, Math.round(size * 0.42));

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: isWeb ? Math.round(size * 0.28) : size / 2,
          backgroundColor: isWeb ? theme.accent : theme.accentMuted,
          borderColor: theme.accent,
          borderWidth: isWeb ? 0 : 1,
        },
      ]}>
      <ThemedText
        type="smallBold"
        style={[styles.label, { color: isWeb ? '#ffffff' : theme.accent, fontSize, lineHeight: fontSize + 3 }]}>
        E
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    lineHeight: 16,
  },
});
