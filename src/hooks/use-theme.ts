import { Platform } from 'react-native';

import { Colors, WebColorOverrides } from '@/constants/theme';
import { useThemePreference } from '@/context/theme-preference-context';

export function useTheme() {
  const { resolvedScheme } = useThemePreference();
  const base = Colors[resolvedScheme];
  if (Platform.OS !== 'web') return base;
  return { ...base, ...WebColorOverrides[resolvedScheme] };
}
