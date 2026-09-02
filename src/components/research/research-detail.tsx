import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PdfViewerModal } from '@/components/chat/pdf-viewer-modal';
import { fetchResearchDetail } from '@/services/research';
import type { ResearchDetail, ResearchResult } from '@/types/research';

async function openExternal(url: string) {
  try {
    await openBrowserAsync(url, {
      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
    });
  } catch {
    await Linking.openURL(url);
  }
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const STRUCTURED_HEADINGS =
  'INTRODUCTION|BACKGROUND|OBJECTIVES?|AIMS?|PURPOSE|METHODS?|MATERIALS AND METHODS|DESIGN|SETTING|PARTICIPANTS|INTERVENTIONS?|RESULTS|FINDINGS|CONCLUSIONS?|DISCUSSION|LIMITATIONS|FUNDING|KEYWORDS?|KEY WORDS|ABSTRACT';

const STRUCTURED_HEADING_RE = new RegExp(
  `(?:^|\\s)(?:${STRUCTURED_HEADINGS})(?=\\s|:)|(?:Introduction|Background|Objectives?|Aims?|Purpose|Methods?|Results|Findings|Conclusions?|Discussion|Limitations|Funding|Keywords?):`,
  'gi',
);

type ExtractSection = { heading: string | null; body: string };

function cleanExtractText(value: string): string {
  return value
    .replace(/<\/?(?:p|div|br|li|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function titleCaseHeading(value: string): string {
  return value
    .replace(/:$/, '')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function splitPlainParagraphs(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  if (text.includes('\n\n')) {
    return text
      .split(/\n{2,}/)
      .map((part) => part.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }
  const sentences = normalized.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) ?? [normalized];
  if (sentences.length < 4) return [normalized];
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    paragraphs.push(
      sentences
        .slice(i, i + 2)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    );
  }
  return paragraphs.filter(Boolean);
}

function formatExtractSections(text: string): ExtractSection[] {
  const cleaned = cleanExtractText(text);
  const matches = [...cleaned.matchAll(STRUCTURED_HEADING_RE)];
  if (matches.length === 0) {
    return splitPlainParagraphs(cleaned).map((body) => ({ heading: null, body }));
  }

  const sections: ExtractSection[] = [];
  const firstIndex = matches[0].index ?? 0;
  if (firstIndex > 0) {
    const lead = cleaned.slice(0, firstIndex).replace(/\s+/g, ' ').trim();
    if (lead) sections.push({ heading: null, body: lead });
  }

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const start = (match.index ?? 0) + match[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? cleaned.length) : cleaned.length;
    const body = cleaned.slice(start, end).replace(/\s+/g, ' ').trim();
    const heading = titleCaseHeading(match[0].trim());
    if (body || heading) sections.push({ heading, body });
  }

  return sections;
}

type ResearchDetailPanelProps = {
  result: ResearchResult;
  onBack: () => void;
  onAskAi: (result: ResearchResult, detail?: ResearchDetail) => void;
  onOpenRelated: (result: ResearchResult) => void;
};

export function ResearchDetailPanel({ result, onBack, onAskAi, onOpenRelated }: ResearchDetailPanelProps) {
  const theme = useTheme();
  const [detail, setDetail] = useState<ResearchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    void fetchResearchDetail(result)
      .then((next) => {
        if (!cancelled) setDetail(next);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load details.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [result]);

  const resolved = detail?.result ?? result;
  const paper = resolved.kind === 'paper' ? resolved : null;
  const web = resolved.kind === 'web' ? resolved : null;
  const extract =
    detail?.extract ||
    (paper ? paper.abstract : web?.snippet) ||
    '';
  const sourceColor =
    paper?.source === 'arxiv'
      ? '#B45309'
      : paper?.source === 'pubmed'
        ? '#0D9488'
        : paper
          ? '#15803D'
          : theme.accent;
  const sourceLabel =
    paper?.source === 'arxiv'
      ? 'arXiv'
      : paper?.source === 'pubmed'
        ? 'PubMed'
        : paper
          ? 'Semantic Scholar'
          : 'Wikipedia';
  const date = formatDate(paper?.publishedAt);
  const thumbnail = detail?.thumbnailUrl || web?.thumbnailUrl || paper?.thumbnailUrl;
  const images = detail?.images?.length
    ? detail.images
    : thumbnail
      ? [{ url: thumbnail }]
      : [];

  return (
    <ThemedView style={styles.flex}>
      <View style={styles.topBar}>
        <Pressable
          onPress={onBack}
          accessibilityLabel="Back to results"
          style={({ pressed }) => [styles.backButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
            size={16}
            tintColor={theme.text}
            weight="semibold"
          />
          <ThemedText type="smallBold">Back</ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.metaRow}>
          <View style={[styles.badge, { backgroundColor: `${sourceColor}22` }]}>
            <ThemedText style={[styles.badgeText, { color: sourceColor }]}>{sourceLabel}</ThemedText>
          </View>
          {date ? (
            <ThemedText type="small" themeColor="textSecondary">
              {date}
            </ThemedText>
          ) : null}
          {paper?.citationCount != null ? (
            <ThemedText type="small" themeColor="textSecondary">
              {paper.citationCount.toLocaleString()} citations
            </ThemedText>
          ) : null}
        </View>

        <ThemedText style={styles.title}>{resolved.title}</ThemedText>

        {paper?.authors.length ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.authors}>
            {paper.authors.join(', ')}
          </ThemedText>
        ) : web?.description ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.lede}>
            {web.description}
          </ThemedText>
        ) : null}

        {paper?.venue ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.venue}>
            {paper.venue}
          </ThemedText>
        ) : null}

        {paper?.doi || paper?.pmid ? (
          <View style={styles.idRow}>
            {paper.doi ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.idChip}>
                DOI {paper.doi}
              </ThemedText>
            ) : null}
            {paper.pmid ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.idChip}>
                PMID {paper.pmid}
              </ThemedText>
            ) : null}
          </View>
        ) : null}

        {images.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.gallery}>
            {images.map((image) => (
              <Pressable key={image.url} onPress={() => void openExternal(image.url)}>
                <Image source={{ uri: image.url }} style={styles.galleryImage} contentFit="cover" />
                {image.caption ? (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={styles.caption}>
                    {image.caption}
                  </ThemedText>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.accent} />
            <ThemedText type="small" themeColor="textSecondary">
              Loading full details…
            </ThemedText>
          </View>
        ) : null}

        {error ? (
          <ThemedText type="small" themeColor="textSecondary">
            {error}
          </ThemedText>
        ) : null}

        {extract ? (
          <View style={[styles.extractCard, { borderColor: theme.composerBorder, backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">{paper ? 'Abstract' : 'Overview'}</ThemedText>
            {formatExtractSections(extract).map((section, index) => (
              <View key={`${section.heading ?? 'p'}-${index}`} style={styles.extractBlock}>
                {section.heading ? (
                  <ThemedText type="smallBold" style={styles.extractHeading}>
                    {section.heading}
                  </ThemedText>
                ) : null}
                {section.body ? <ThemedText style={styles.extract}>{section.body}</ThemedText> : null}
              </View>
            ))}
          </View>
        ) : !loading ? (
          <ThemedText type="small" themeColor="textSecondary">
            No abstract is available for this result.
          </ThemedText>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            onPress={() => void openExternal(resolved.url)}
            style={({ pressed }) => [styles.ghostButton, { borderColor: theme.composerBorder }, pressed && styles.pressed]}>
            <ThemedText type="small" themeColor="textSecondary">
              Open
            </ThemedText>
          </Pressable>
          {paper?.pdfUrl ? (
            <Pressable
              onPress={() => setPdfOpen(true)}
              accessibilityLabel="Read PDF in app"
              style={({ pressed }) => [styles.ghostButton, { borderColor: theme.composerBorder }, pressed && styles.pressed]}>
              <ThemedText type="small" themeColor="textSecondary">
                PDF
              </ThemedText>
            </Pressable>
          ) : null}
          {paper?.doi ? (
            <Pressable
              onPress={() => void openExternal(`https://doi.org/${paper.doi}`)}
              style={({ pressed }) => [styles.ghostButton, { borderColor: theme.composerBorder }, pressed && styles.pressed]}>
              <ThemedText type="small" themeColor="textSecondary">
                DOI
              </ThemedText>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => onAskAi(resolved, detail ?? undefined)}
            style={({ pressed }) => [
              styles.askButton,
              { backgroundColor: theme.accentMuted, borderColor: theme.accent },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="small" style={{ color: theme.accent, fontWeight: '700' }}>
              Ask AI
            </ThemedText>
          </Pressable>
        </View>

        {detail?.related.length ? (
          <View style={styles.section}>
            <ThemedText type="smallBold">Related</ThemedText>
            {detail.related.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => onOpenRelated(item)}
                style={({ pressed }) => [
                  styles.relatedRow,
                  { borderColor: theme.composerBorder, backgroundColor: theme.backgroundElement },
                  pressed && styles.pressed,
                ]}>
                {item.kind === 'web' && item.thumbnailUrl ? (
                  <Image source={{ uri: item.thumbnailUrl }} style={styles.relatedThumb} contentFit="cover" />
                ) : null}
                <View style={styles.relatedCopy}>
                <ThemedText style={styles.relatedTitle} numberOfLines={2}>
                  {item.title}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                  {item.kind === 'paper'
                    ? [item.venue, item.publishedAt].filter(Boolean).join(' · ') || item.authors.slice(0, 2).join(', ')
                    : item.description || item.snippet}
                </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <PdfViewerModal
        visible={pdfOpen}
        uri={paper?.pdfUrl ?? null}
        filename={resolved.title}
        onClose={() => setPdfOpen(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  body: {
    paddingBottom: Spacing.six,
    gap: Spacing.two,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  authors: {
    lineHeight: 22,
    maxWidth: 640,
  },
  lede: {
    lineHeight: 22,
    maxWidth: 640,
  },
  venue: {
    fontStyle: 'italic',
    lineHeight: 20,
  },
  idRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  idChip: {
    fontVariant: ['tabular-nums'],
  },
  gallery: {
    gap: 10,
    paddingVertical: 4,
  },
  galleryImage: {
    width: 220,
    height: 160,
    borderRadius: 14,
    backgroundColor: '#EDEDF0',
  },
  caption: {
    width: 220,
    marginTop: 6,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  section: {
    gap: 8,
    marginTop: Spacing.two,
  },
  extractCard: {
    gap: 12,
    marginTop: Spacing.two,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
  },
  extractBlock: {
    gap: 4,
  },
  extractHeading: {
    letterSpacing: 0.2,
  },
  extract: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.two,
  },
  ghostButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  askButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  relatedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  relatedThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#EDEDF0',
  },
  relatedCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  relatedTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
});
