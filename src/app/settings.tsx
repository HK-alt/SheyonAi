import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAppSettings } from '@/context/app-settings-context';
import { useAuthContext } from '@/context/auth-context';
import { useChat } from '@/context/chat-context';
import { useThemePreference } from '@/context/theme-preference-context';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { useTheme } from '@/hooks/use-theme';
import { clearChatCacheForUser } from '@/lib/chat-cache';
import { LEARNING_LEVELS, learningLevelLabel } from '@/lib/learning-level';
import type { ThemePreference } from '@/types/chat';

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: { ios: string; android: string; web: string };
}[] = [
  {
    value: 'system',
    label: 'System',
    icon: { ios: 'circle.lefthalf.filled', android: 'contrast', web: 'contrast' },
  },
  {
    value: 'light',
    label: 'Light',
    icon: { ios: 'sun.max.fill', android: 'light_mode', web: 'light_mode' },
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: { ios: 'moon.fill', android: 'dark_mode', web: 'dark_mode' },
  },
];

function userLabel(email?: string | null, name?: string | null) {
  if (name?.trim()) return name.trim();
  if (email) return email.split('@')[0] ?? email;
  return 'Account';
}

function userInitial(label: string) {
  return (label[0] ?? 'U').toUpperCase();
}

function SectionLabel({ children }: { children: string }) {
  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
      {children}
    </ThemedText>
  );
}

function SettingsCard({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.composerBorder,
        },
      ]}>
      {children}
    </View>
  );
}

function SettingsRow({
  icon,
  iconColor,
  label,
  value,
  subtitle,
  onPress,
  destructive,
  showChevron,
  trailing,
  last,
}: {
  icon: { ios: string; android: string; web: string };
  iconColor?: string;
  label: string;
  value?: string;
  subtitle?: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
  trailing?: ReactNode;
  last?: boolean;
}) {
  const theme = useTheme();
  const tint = iconColor ?? theme.accent;
  const content = (
    <>
      <View style={[styles.rowIcon, { backgroundColor: theme.accentMuted }]}>
        <SymbolView name={icon} size={16} tintColor={destructive ? theme.destructive : tint} />
      </View>
      <View style={styles.rowText}>
        <ThemedText
          type="small"
          style={[styles.rowLabel, destructive && { color: theme.destructive }]}
          numberOfLines={1}>
          {label}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.rowSubtitle} numberOfLines={2}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {value ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.rowValue} numberOfLines={1}>
          {value}
        </ThemedText>
      ) : null}
      {trailing}
      {showChevron ? (
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={14}
          tintColor={theme.textSecondary}
        />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.row,
          !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.composerBorder },
          pressed && styles.pressed,
        ]}>
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.composerBorder },
      ]}>
      {content}
    </View>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { preference, setPreference } = useThemePreference();
  const {
    showSuggestions,
    setShowSuggestions,
    sendOnEnter,
    setSendOnEnter,
    learningLevel,
    setLearningLevel,
  } = useAppSettings();
  const { clearAllConversations, conversations } = useChat();
  const { user } = useAuthContext();
  const { signOut, isDevBypassSession } = useSupabaseAuth();
  const [copied, setCopied] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const isWeb = Platform.OS === 'web';

  const displayName = userLabel(
    user?.email,
    typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null,
  );
  const email = user?.email ?? 'Not signed in';
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const chatCount = useMemo(
    () => conversations.filter((c) => c.messages.length > 0 || !c.id.startsWith('draft-')).length,
    [conversations],
  );

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }

  function handleSignOut() {
    if (Platform.OS === 'web') {
      signOut().catch(() => {});
      return;
    }
    Alert.alert('Sign out', 'You can sign back in at any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut().catch(() => {}) },
    ]);
  }

  function handleClearAll() {
    const run = () => clearAllConversations();
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && !window.confirm('Delete all conversations permanently?')) {
        return;
      }
      run();
      return;
    }
    Alert.alert('Clear all chats', 'This permanently deletes every conversation.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete all', style: 'destructive', onPress: run },
    ]);
  }

  async function handleCopyEmail() {
    if (!user?.email) return;
    try {
      await Clipboard.setStringAsync(user.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      Alert.alert('Copy failed', 'Could not copy email to clipboard.');
    }
  }

  async function handleClearCache() {
    const run = async () => {
      await clearChatCacheForUser(user?.id);
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 1600);
    };
    if (Platform.OS === 'web') {
      await run();
      return;
    }
    Alert.alert(
      'Clear offline cache',
      'Removes locally cached chats. Your server conversations stay intact.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => void run() },
      ],
    );
  }

  function handleContactSupport() {
    void Linking.openURL('mailto:support@sheyonai.app?subject=Sheyon%20Ai%20support');
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.chatSurface }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + Spacing.one,
            borderBottomColor: theme.headerBorder,
            backgroundColor: theme.background,
          },
        ]}>
        <Pressable
          onPress={goBack}
          hitSlop={8}
          accessibilityLabel="Go back"
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
            size={18}
            weight="semibold"
            tintColor={theme.text}
          />
        </Pressable>
        <ThemedText type="smallBold" style={styles.headerTitle}>
          Settings
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          isWeb && styles.contentWeb,
          { paddingBottom: insets.bottom + Spacing.five },
        ]}
        showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: theme.background,
              borderColor: theme.composerBorder,
            },
          ]}>
          <View style={[styles.avatar, { backgroundColor: theme.accentMuted }]}>
            <ThemedText type="smallBold" style={[styles.avatarLabel, { color: theme.accent }]}>
              {userInitial(displayName)}
            </ThemedText>
          </View>
          <View style={styles.profileText}>
            <ThemedText type="smallBold" style={styles.profileName} numberOfLines={1}>
              {displayName}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {email}
            </ThemedText>
            {isDevBypassSession ? (
              <View style={[styles.badge, { backgroundColor: theme.accentMuted }]}>
                <ThemedText type="small" style={[styles.badgeLabel, { color: theme.accent }]}>
                  Local dev session
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>

        <SectionLabel>Appearance</SectionLabel>
        <SettingsCard>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((option) => {
              const selected = preference === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setPreference(option.value)}
                  style={({ pressed }) => [
                    styles.themeOption,
                    {
                      backgroundColor: selected ? theme.accentMuted : theme.background,
                      borderColor: selected ? theme.accent : theme.composerBorder,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <SymbolView
                    name={option.icon}
                    size={18}
                    tintColor={selected ? theme.accent : theme.textSecondary}
                  />
                  <ThemedText
                    type="small"
                    style={[
                      styles.themeLabel,
                      { color: selected ? theme.accent : theme.text, fontWeight: selected ? '700' : '600' },
                    ]}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </SettingsCard>

        <SectionLabel>Learning level</SectionLabel>
        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionHint}>
          Answers adapt to {learningLevelLabel(learningLevel).toLowerCase()} level across chats
        </ThemedText>
        <SettingsCard>
          {LEARNING_LEVELS.map((level, index) => {
            const selected = learningLevel === level.id;
            const last = index === LEARNING_LEVELS.length - 1;
            return (
              <Pressable
                key={level.id}
                onPress={() => setLearningLevel(level.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.levelRow,
                  !last && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: theme.composerBorder,
                  },
                  selected && { backgroundColor: theme.accentMuted },
                  pressed && styles.pressed,
                ]}>
                <View style={[styles.rowIcon, { backgroundColor: theme.background }]}>
                  <SymbolView
                    name={level.icon}
                    size={16}
                    tintColor={selected ? theme.accent : theme.textSecondary}
                  />
                </View>
                <View style={styles.rowText}>
                  <ThemedText
                    type="small"
                    style={[styles.rowLabel, selected && { color: theme.accent }]}
                    numberOfLines={1}>
                    {level.label}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.rowSubtitle}
                    numberOfLines={2}>
                    {level.caption}
                  </ThemedText>
                </View>
                {selected ? (
                  <SymbolView
                    name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                    size={20}
                    tintColor={theme.accent}
                  />
                ) : (
                  <View style={[styles.levelRadio, { borderColor: theme.composerBorder }]} />
                )}
              </Pressable>
            );
          })}
        </SettingsCard>

        <SectionLabel>Chat</SectionLabel>
        <SettingsCard>
          <SettingsRow
            icon={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
            label="Starter prompts"
            subtitle="Show suggested prompts on new chats"
            trailing={
              <Switch
                value={showSuggestions}
                onValueChange={setShowSuggestions}
                trackColor={{ false: theme.composerBorder, true: theme.accent }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <SettingsRow
            icon={{ ios: 'return', android: 'keyboard_return', web: 'keyboard_return' }}
            label="Enter to send"
            subtitle={isWeb ? 'Shift+Enter inserts a new line' : 'Applies on web and desktop'}
            trailing={
              <Switch
                value={sendOnEnter}
                onValueChange={setSendOnEnter}
                trackColor={{ false: theme.composerBorder, true: theme.accent }}
                thumbColor="#FFFFFF"
              />
            }
            last
          />
        </SettingsCard>

        <SectionLabel>Account</SectionLabel>
        <SettingsCard>
          <SettingsRow
            icon={{ ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' }}
            label={copied ? 'Email copied' : 'Copy email'}
            value={user?.email ? undefined : 'Unavailable'}
            onPress={user?.email ? handleCopyEmail : undefined}
            showChevron={Boolean(user?.email)}
          />
          <SettingsRow
            icon={{ ios: 'bubble.left.and.bubble.right', android: 'chat', web: 'chat' }}
            label="Conversations"
            value={`${chatCount}`}
            last
          />
        </SettingsCard>

        <SectionLabel>Data</SectionLabel>
        <SettingsCard>
          <SettingsRow
            icon={{ ios: 'internaldrive', android: 'storage', web: 'storage' }}
            label={cacheCleared ? 'Cache cleared' : 'Clear offline cache'}
            subtitle="Free local storage without deleting server chats"
            onPress={() => void handleClearCache()}
            showChevron
          />
          <SettingsRow
            icon={{ ios: 'trash', android: 'delete', web: 'delete' }}
            iconColor={theme.destructive}
            label="Clear all chats"
            subtitle="Permanently delete every conversation"
            onPress={handleClearAll}
            destructive
            showChevron
            last
          />
        </SettingsCard>

        <SectionLabel>Support</SectionLabel>
        <SettingsCard>
          <SettingsRow
            icon={{ ios: 'envelope', android: 'mail', web: 'mail' }}
            label="Contact support"
            onPress={handleContactSupport}
            showChevron
          />
          <SettingsRow
            icon={{ ios: 'safari', android: 'language', web: 'language' }}
            label="Open Sheyon Ai"
            onPress={() => void Linking.openURL('https://sheyonai.app')}
            showChevron
            last
          />
        </SettingsCard>

        <SectionLabel>About</SectionLabel>
        <SettingsCard>
          <SettingsRow
            icon={{ ios: 'app.badge', android: 'apps', web: 'apps' }}
            label="App"
            value="Sheyon Ai"
          />
          <SettingsRow
            icon={{ ios: 'number', android: 'tag', web: 'tag' }}
            label="Version"
            value={version}
            last
          />
        </SettingsCard>

        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOut,
            {
              backgroundColor: theme.background,
              borderColor: theme.composerBorder,
            },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.destructive }}>
            Sign out
          </ThemedText>
        </Pressable>

        <ThemedText type="small" themeColor="textSecondary" style={styles.footerNote}>
          Sheyon Ai · {version} · Preferences sync on this device
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  contentWeb: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 8,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  profileText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  profileName: {
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  sectionLabel: {
    marginTop: 14,
    marginBottom: 2,
    marginLeft: 4,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionHint: {
    marginLeft: 4,
    marginBottom: 4,
    fontSize: 12,
    lineHeight: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  themeLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  rowValue: {
    fontSize: 13,
    lineHeight: 18,
    maxWidth: '42%',
    textAlign: 'right',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  levelRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  signOut: {
    marginTop: 18,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 8,
  },
  pressed: {
    opacity: 0.72,
  },
});
