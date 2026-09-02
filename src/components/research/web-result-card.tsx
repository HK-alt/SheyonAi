import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { WebSearchResult } from '@/types/research';

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

type WebResultCardProps = {
  result: WebSearchResult;
  onOpen: (result: WebSearchResult) => void;
  onAskAi: (result: WebSearchResult) => void;
};

export function WebResultCard({ result, onOpen, onAskAi }: WebResultCardProps) {
  const theme = useTheme();
  const isWeb = Platform.OS === 'web';

  const openUrl = async () => {
    try {
      await openBrowserAsync(result.url, {
        presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
      });
    } catch {
      await Linking.openURL(result.url);
    }
  };

  return (
    <View
      style={[
        styles.card,
        isWeb && styles.cardWeb,
        { backgroundColor: theme.background, borderColor: theme.composerBorder },
      ]}>
      <Pressable onPress={() => onOpen(result)} style={({ pressed }) => [styles.body, pressed && styles.pressed]}>
        {result.thumbnailUrl ? (
          <Image source={{ uri: result.thumbnailUrl }} style={styles.thumb} contentFit="cover" />
        ) : null}
        <View style={styles.copy}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.host} numberOfLines={1}>
            {hostFromUrl(result.url)}
          </ThemedText>
          <ThemedText style={styles.title}>{result.title}</ThemedText>
          {result.snippet ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.snippet} numberOfLines={3}>
              {result.snippet}
            </ThemedText>
          ) : null}
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          onPress={openUrl}
          accessibilityLabel="Open link"
          style={({ pressed }) => [
            styles.ghostButton,
            { borderColor: theme.composerBorder },
            pressed && styles.pressed,
          ]}>
          <SymbolView
            name={{ ios: 'arrow.up.right', android: 'open_in_new', web: 'open_in_new' }}
            size={13}
            tintColor={theme.textSecondary}
          />
          <ThemedText type="small" themeColor="textSecondary">
            Open
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => onAskAi(result)}
          accessibilityLabel="Ask AI about this result"
          style={({ pressed }) => [
            styles.askButton,
            { backgroundColor: theme.accentMuted, borderColor: theme.accent },
            pressed && styles.pressed,
          ]}>
          <SymbolView
            name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
            size={13}
            tintColor={theme.accent}
          />
          <ThemedText type="small" style={{ color: theme.accent, fontWeight: '700' }}>
            Ask AI
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    gap: 8,
  },
  cardWeb: {
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  body: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: '#EDEDF0',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  host: {
    fontSize: 12,
    lineHeight: 16,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  snippet: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pressed: {
    opacity: 0.75,
  },
});
