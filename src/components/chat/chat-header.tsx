import { type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssistantAvatar } from '@/components/chat/assistant-avatar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { displayChatTitle } from '@/lib/chat-title';

type ChatHeaderProps = {
  title: string;
  subtitle?: string;
  onOpenDrawer?: () => void;
  onNewChat: () => void;
  onBack?: () => void;
  /** Hide duplicate new-chat control when the sidebar already has one. */
  showNewChat?: boolean;
  /** Compact control in the header cluster — used for Personal Tutor level. */
  trailing?: ReactNode;
  /** Parent already applied the top safe-area inset (e.g. Home tab bar). */
  nested?: boolean;
};

type IconButtonProps = {
  onPress?: () => void;
  children: ReactNode;
  accessibilityLabel: string;
  quiet?: boolean;
};

function IconButton({ onPress, children, accessibilityLabel, quiet = false }: IconButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        quiet ? styles.iconButtonQuiet : styles.iconButton,
        { backgroundColor: quiet ? (hovered ? theme.backgroundElement : 'transparent') : theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      {children}
    </Pressable>
  );
}

export function ChatHeader({
  title,
  subtitle,
  onOpenDrawer,
  onNewChat,
  onBack,
  showNewChat = true,
  trailing,
  nested = false,
}: ChatHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  const showMenu = Boolean(onBack || onOpenDrawer);
  const alignTitleStart = !showMenu || isWeb;

  return (
    <View
      style={[
        styles.container,
        isWeb && styles.containerWeb,
        {
          paddingTop: nested ? (isWeb ? Spacing.one : Spacing.two) : insets.top + (isWeb ? Spacing.one : Spacing.two),
          borderBottomColor: theme.headerBorder,
          backgroundColor: theme.background,
        },
      ]}>
      {onBack ? (
        <IconButton onPress={onBack} accessibilityLabel="Go back" quiet={isWeb}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
            size={18}
            weight="semibold"
            tintColor={theme.text}
          />
        </IconButton>
      ) : onOpenDrawer ? (
        <IconButton
          onPress={onOpenDrawer}
          accessibilityLabel="Open conversations"
          quiet={isWeb}>
          <SymbolView
            name={{ ios: 'line.3.horizontal', android: 'menu', web: 'menu' }}
            size={18}
            weight="medium"
            tintColor={theme.text}
          />
        </IconButton>
      ) : null}

      <View style={[styles.titleBlock, alignTitleStart && styles.titleBlockStart]}>
        <View style={styles.titleRow}>
          {isWeb ? null : <AssistantAvatar size={28} />}
          <ThemedText type="smallBold" style={[styles.title, isWeb && styles.titleWeb]} numberOfLines={1}>
            {displayChatTitle(title)}
          </ThemedText>
        </View>
        {isWeb ? null : trailing ? <View style={styles.trailing}>{trailing}</View> : null}
        {subtitle && !isWeb ? (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={[styles.subtitle, alignTitleStart && styles.subtitleStart]}
            numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.rightActions}>
        {isWeb && trailing ? trailing : null}
        {showNewChat ? (
          <IconButton
            onPress={onNewChat}
            accessibilityLabel="Start new chat"
            quiet={isWeb}>
            <SymbolView
              name={{ ios: 'square.and.pencil', android: 'edit', web: 'edit' }}
              size={17}
              weight="medium"
              tintColor={theme.text}
            />
          </IconButton>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  containerWeb: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 10,
    minHeight: 52,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonQuiet: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    minWidth: 0,
  },
  titleBlockStart: {
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    maxWidth: '100%',
  },
  title: {
    fontSize: 16,
    lineHeight: 20,
    flexShrink: 1,
  },
  titleWeb: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  trailing: {
    marginTop: 4,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  subtitleStart: {
    textAlign: 'left',
  },
  pressed: {
    opacity: 0.65,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
