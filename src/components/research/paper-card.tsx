import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { SymbolView } from 'expo-symbols';

import { PdfViewerModal } from '@/components/chat/pdf-viewer-modal';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PaperSearchResult } from '@/types/research';

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

type PaperCardProps = {
  result: PaperSearchResult;
  onOpen: (result: PaperSearchResult) => void;
  onAskAi: (result: PaperSearchResult) => void;
};

export function PaperCard({ result, onOpen, onAskAi }: PaperCardProps) {
  const theme = useTheme();
  const [pdfOpen, setPdfOpen] = useState(false);
  const sourceLabel =
    result.source === 'arxiv' ? 'arXiv' : result.source === 'pubmed' ? 'PubMed' : 'Semantic Scholar';
  const sourceColor =
    result.source === 'arxiv' ? '#B45309' : result.source === 'pubmed' ? '#0D9488' : '#15803D';
  const date = formatDate(result.publishedAt);
  const authors =
    result.authors.length > 3
      ? `${result.authors.slice(0, 3).join(', ')} +${result.authors.length - 3}`
      : result.authors.join(', ');

  const openUrl = async (url: string) => {
    await openBrowserAsync(url, {
      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
    });
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.composerBorder }]}>
      <Pressable onPress={() => onOpen(result)} style={({ pressed }) => [styles.cardBody, pressed && styles.pressed]}>
        <View style={styles.metaRow}>
          <View style={[styles.badge, { backgroundColor: `${sourceColor}22` }]}>
            <ThemedText style={[styles.badgeText, { color: sourceColor }]}>{sourceLabel}</ThemedText>
          </View>
          {date ? (
            <ThemedText type="small" themeColor="textSecondary">
              {date}
            </ThemedText>
          ) : null}
          {result.citationCount != null ? (
            <ThemedText type="small" themeColor="textSecondary">
              {result.citationCount.toLocaleString()} cites
            </ThemedText>
          ) : null}
        </View>

        <ThemedText style={styles.title}>{result.title}</ThemedText>
        {authors ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {authors}
          </ThemedText>
        ) : null}
        {result.venue ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {result.venue}
          </ThemedText>
        ) : null}
        {result.abstract ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.abstract} numberOfLines={4}>
            {result.abstract}
          </ThemedText>
        ) : null}
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          onPress={() => void openUrl(result.url)}
          accessibilityLabel="Open paper"
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
        {result.pdfUrl ? (
          <Pressable
            onPress={() => setPdfOpen(true)}
            accessibilityLabel="Read PDF in app"
            style={({ pressed }) => [
              styles.ghostButton,
              { borderColor: theme.composerBorder },
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={{ ios: 'doc', android: 'picture_as_pdf', web: 'picture_as_pdf' }}
              size={13}
              tintColor={theme.textSecondary}
            />
            <ThemedText type="small" themeColor="textSecondary">
              PDF
            </ThemedText>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => onAskAi(result)}
          accessibilityLabel="Ask AI about this paper"
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

      <PdfViewerModal
        visible={pdfOpen}
        uri={result.pdfUrl ?? null}
        filename={result.title}
        onClose={() => setPdfOpen(false)}
      />
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
  cardBody: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  abstract: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
