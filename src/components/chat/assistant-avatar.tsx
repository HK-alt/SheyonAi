import { Image } from 'expo-image';
import { Platform, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type AssistantAvatarProps = {
  size?: number;
};

export function AssistantAvatar({ size = 32 }: AssistantAvatarProps) {
  const theme = useTheme();
  const isWeb = Platform.OS === 'web';
  const glyph = Math.round(size * 0.58);

  return (
    <View
      accessibilityLabel="Sheyon Ai"
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
      <Image
        accessibilityIgnoresInvertColors
        contentFit="contain"
        source={require('@/assets/images/splash-icon.png')}
        style={{ width: glyph, height: glyph }}
        tintColor={isWeb ? '#ffffff' : theme.accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
