import { Platform, type ViewStyle } from 'react-native';

/** Native-only shadowColor — RN web deprecates shadow* in favor of boxShadow. */
export function nativeShadowColor(color: string): ViewStyle {
  if (Platform.OS === 'web') {
    return {};
  }
  return { shadowColor: color };
}
