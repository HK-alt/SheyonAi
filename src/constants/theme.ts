/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111111',
    background: '#ffffff',
    chatSurface: '#F7F7F8',
    backgroundElement: '#EDEDF0',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#6B6B76',
    userBubble: '#111111',
    userBubbleText: '#ffffff',
    composerBackground: '#ffffff',
    composerBorder: '#E3E3E8',
    suggestionChip: '#F3F4F6',
    headerBorder: '#E8E8ED',
    accent: '#2563EB',
    accentMuted: '#EFF6FF',
    sendButton: '#111111',
    sendButtonDisabled: '#D4D4D4',
    sendButtonIcon: '#ffffff',
    drawerBackground: '#F9F9F9',
    drawerItemActive: '#ECECEC',
    codeBackground: '#F6F6F6',
    codeBorder: '#E5E5E5',
    codePanelBackground: '#FAFAFC',
    codeHeaderBackground: '#F0F0F4',
    codeGutterBackground: '#ECECF1',
    codeLineNumber: '#656D76',
    codeInlineBackground: '#EFF1F5',
    codeInlineText: '#B42318',
    proseBody: '#1A1D21',
    proseHeading: '#111111',
    proseMuted: '#4B5563',
    codeDiffAdded: 'rgba(34, 197, 94, 0.12)',
    codeDiffRemoved: 'rgba(239, 68, 68, 0.12)',
    codeDiffHunk: 'rgba(37, 99, 235, 0.08)',
    actionIcon: '#8E8E93',
    destructive: '#E5484D',
    composerFloatingBackground: '#ffffff',
    composerShadow: 'rgba(0, 0, 0, 0.12)',
  },
  dark: {
    text: '#F5F5F7',
    background: '#1A1A1C',
    chatSurface: '#141416',
    backgroundElement: '#2A2A2E',
    backgroundSelected: '#35353A',
    textSecondary: '#9B9BA4',
    userBubble: '#F5F5F7',
    userBubbleText: '#111111',
    composerBackground: '#222226',
    composerBorder: '#3A3A40',
    suggestionChip: '#222226',
    headerBorder: '#2E2E34',
    accent: '#3B82F6',
    accentMuted: '#1E293B',
    sendButton: '#F5F5F7',
    sendButtonDisabled: '#4a4a4a',
    sendButtonIcon: '#111111',
    drawerBackground: '#121214',
    drawerItemActive: '#2a2a2e',
    codeBackground: '#1a1a1a',
    codeBorder: '#3f3f3f',
    codePanelBackground: '#161618',
    codeHeaderBackground: '#1E1E22',
    codeGutterBackground: '#121214',
    codeLineNumber: '#8B949E',
    codeInlineBackground: '#2A2A30',
    codeInlineText: '#F87171',
    proseBody: '#EDEFF3',
    proseHeading: '#F5F5F7',
    proseMuted: '#B6BDC6',
    codeDiffAdded: 'rgba(34, 197, 94, 0.18)',
    codeDiffRemoved: 'rgba(239, 68, 68, 0.18)',
    codeDiffHunk: 'rgba(59, 130, 246, 0.12)',
    actionIcon: '#9A9A9E',
    destructive: '#FF6369',
    composerFloatingBackground: '#222226',
    composerShadow: 'rgba(0, 0, 0, 0.45)',
  },
} as const;

/** Web-only Claude/Linear overlay. Native keeps `Colors` unchanged. */
export const WebColorOverrides = {
  light: {
    text: '#1A1915',
    background: '#F7F6F3',
    chatSurface: '#F7F6F3',
    backgroundElement: '#E8E6E1',
    backgroundSelected: '#DDDAD4',
    textSecondary: '#6F6D68',
    userBubble: '#1A1915',
    userBubbleText: '#F7F6F3',
    composerBackground: '#FFFFFF',
    composerBorder: '#E4E2DC',
    suggestionChip: '#EFEDE8',
    headerBorder: '#E4E2DC',
    accent: '#2563EB',
    accentMuted: '#E8F0FE',
    sendButton: '#1A1915',
    sendButtonDisabled: '#D6D3CD',
    sendButtonIcon: '#FFFFFF',
    drawerBackground: '#EFEDE8',
    drawerItemActive: '#E3E0DA',
    composerFloatingBackground: '#FFFFFF',
    composerShadow: 'rgba(26, 25, 21, 0.08)',
    proseBody: '#1A1915',
    proseHeading: '#1A1915',
    proseMuted: '#6F6D68',
  },
  dark: {
    text: '#F4F1EA',
    background: '#1C1B1A',
    chatSurface: '#1C1B1A',
    backgroundElement: '#2A2826',
    backgroundSelected: '#343230',
    textSecondary: '#A39E96',
    userBubble: '#F4F1EA',
    userBubbleText: '#1C1B1A',
    composerBackground: '#232220',
    composerBorder: '#2E2C2A',
    suggestionChip: '#232220',
    headerBorder: '#2E2C2A',
    accent: '#3B82F6',
    accentMuted: '#1E2A3B',
    sendButton: '#F4F1EA',
    sendButtonDisabled: '#3A3835',
    sendButtonIcon: '#1C1B1A',
    drawerBackground: '#161514',
    drawerItemActive: '#252321',
    composerFloatingBackground: '#232220',
    composerShadow: 'rgba(0, 0, 0, 0.4)',
    proseBody: '#F4F1EA',
    proseHeading: '#F4F1EA',
    proseMuted: '#A39E96',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = Platform.OS === 'web' ? 768 : 800;
