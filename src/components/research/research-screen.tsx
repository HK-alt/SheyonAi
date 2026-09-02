import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { PaperCard } from '@/components/research/paper-card';
import { ResearchDetailPanel } from '@/components/research/research-detail';
import { ResearchGuide } from '@/components/research/research-guide';
import { ResearchSearchBar } from '@/components/research/search-bar';
import { WebResultCard } from '@/components/research/web-result-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useResearchSearch } from '@/hooks/use-research-search';
import { useTheme } from '@/hooks/use-theme';
import { buildAiOverviewPrompt, buildAskAiPrompt, researchLibraryLabel } from '@/services/research';
import type { ResearchDetail, ResearchResult, ResearchSource } from '@/types/research';

type ResearchScreenProps = {
  onAskAi: (prompt: string) => void;
};

export function ResearchScreen({ onAskAi }: ResearchScreenProps) {
  const theme = useTheme();
  const {
    query,
    setQuery,
    source,
    setSource,
    results,
    loading,
    errorKind,
    needsConfig,
    hasSearched,
    failedSources,
    search,
  } = useResearchSearch();
  const [selected, setSelected] = useState<ResearchResult | null>(null);

  const handleSubmit = useCallback(() => {
    setSelected(null);
    void search();
  }, [search]);

  const handleSourceChange = useCallback(
    (next: ResearchSource) => {
      setSource(next);
      setSelected(null);
      if (query.trim()) void search(query, next);
    },
    [query, search, setSource],
  );

  const handleAskAi = useCallback(
    (result: ResearchResult, detail?: ResearchDetail) => {
      onAskAi(buildAskAiPrompt(result, detail));
    },
    [onAskAi],
  );

  const handleExplainWithAi = useCallback(() => {
    if (!query.trim()) return;
    onAskAi(buildAiOverviewPrompt(query, results));
  }, [onAskAi, query, results]);

  const handleTryExample = useCallback(
    (nextQuery: string, nextSource: ResearchSource) => {
      setSelected(null);
      void search(nextQuery, nextSource);
    },
    [search],
  );

  if (selected) {
    return (
      <ThemedView style={styles.flex}>
        <View style={styles.column}>
          <ResearchDetailPanel
            result={selected}
            onBack={() => setSelected(null)}
            onAskAi={handleAskAi}
            onOpenRelated={setSelected}
          />
        </View>
      </ThemedView>
    );
  }

  const failedLabels = failedSources.map(researchLibraryLabel).join(', ');
  const showPartialBanner = !loading && results.length > 0 && failedSources.length > 0;

  return (
    <ThemedView style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.column}>
          <View style={styles.header}>
            <ThemedText style={styles.kicker}>Sheyon Ai</ThemedText>
            <ThemedText style={styles.title}>Research</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
              Search real libraries, then ask AI to explain.
            </ThemedText>
          </View>

          <ResearchSearchBar
            query={query}
            onChangeQuery={setQuery}
            source={source}
            onChangeSource={handleSourceChange}
            onSubmit={handleSubmit}
            loading={loading}
          />

          <FlatList
            style={styles.flex}
            data={results}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
            ListHeaderComponent={
              !loading && results.length > 0 ? (
                <View
                  style={[
                    styles.banner,
                    {
                      backgroundColor: showPartialBanner ? theme.accentMuted : theme.backgroundElement,
                      borderColor: theme.composerBorder,
                    },
                  ]}>
                  <ThemedText type="small" themeColor={showPartialBanner ? undefined : 'textSecondary'} style={showPartialBanner ? { color: theme.accent } : undefined}>
                    {showPartialBanner
                      ? `Some libraries didn’t respond${failedLabels ? ` (${failedLabels})` : ''}. Showing what’s available — this is not a complete search.`
                      : 'Optional: get an AI overview of these results. It will only use the papers and pages listed below.'}
                  </ThemedText>
                  <Pressable
                    onPress={handleExplainWithAi}
                    accessibilityLabel="Summarize these results with AI"
                    style={({ pressed }) => [
                      styles.askButton,
                      {
                        backgroundColor: showPartialBanner ? theme.background : theme.accentMuted,
                        borderColor: theme.accent,
                      },
                      pressed && styles.pressed,
                    ]}>
                    <SymbolView
                      name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
                      size={13}
                      tintColor={theme.accent}
                    />
                    <ThemedText type="small" style={{ color: theme.accent, fontWeight: '700' }}>
                      AI overview
                    </ThemedText>
                  </Pressable>
                </View>
              ) : null
            }
            renderItem={({ item }) =>
              item.kind === 'web' ? (
                <WebResultCard result={item} onOpen={setSelected} onAskAi={handleAskAi} />
              ) : (
                <PaperCard result={item} onOpen={setSelected} onAskAi={handleAskAi} />
              )
            }
            ListEmptyComponent={
              loading ? (
                <View style={styles.empty}>
                  <ActivityIndicator color={theme.accent} />
                  <ThemedText type="small" themeColor="textSecondary">
                    Searching…
                  </ThemedText>
                </View>
              ) : needsConfig ? (
                <View style={styles.empty}>
                  <SymbolView
                    name={{ ios: 'key', android: 'vpn_key', web: 'vpn_key' }}
                    size={28}
                    tintColor={theme.textSecondary}
                  />
                  <ThemedText style={styles.emptyTitle}>Configure web search</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.emptyBody}>
                    Add a SEARCH_API_KEY (Tavily, Brave, or SerpAPI) as a Supabase secret, then deploy
                    the web-search function.
                  </ThemedText>
                </View>
              ) : errorKind ? (
                <View style={styles.empty}>
                  <ThemedText style={styles.emptyTitle}>
                    {errorKind === 'busy' ? 'Research libraries are busy' : 'Couldn’t load papers'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.emptyBody}>
                    {errorKind === 'busy'
                      ? 'Too many searches right now, or a source is temporarily down. You can retry, or get an AI overview of this topic instead.'
                      : 'We couldn’t reach the libraries. Retry the search, or get an AI overview of this topic instead.'}
                  </ThemedText>
                  <View style={styles.emptyActions}>
                    <Pressable
                      onPress={handleSubmit}
                      accessibilityLabel="Try search again"
                      style={({ pressed }) => [
                        styles.ghostButton,
                        { borderColor: theme.composerBorder },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText type="small" themeColor="textSecondary">
                        Try again
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={handleExplainWithAi}
                      accessibilityLabel="Explain this topic with AI"
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
                        Explain with AI
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              ) : hasSearched ? (
                <View style={styles.empty}>
                  <ThemedText style={styles.emptyTitle}>No results</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.emptyBody}>
                    Try a broader query, a different source, or an AI overview of this topic.
                  </ThemedText>
                  <Pressable
                    onPress={handleExplainWithAi}
                    accessibilityLabel="Explain this topic with AI"
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
                      Explain with AI
                    </ThemedText>
                  </Pressable>
                </View>
              ) : (
                <ResearchGuide
                  source={source}
                  onChangeSource={handleSourceChange}
                  onTryExample={handleTryExample}
                />
              )
            }
          />
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  column: {
    flex: 1,
    width: '100%',
    minWidth: 0,
    paddingHorizontal: Platform.OS === 'web' ? Spacing.four : Spacing.three,
    paddingTop: Spacing.two,
  },
  header: {
    gap: 4,
    marginBottom: Spacing.four,
    alignItems: 'center',
  },
  kicker: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    opacity: 0.5,
  },
  title: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '600',
    letterSpacing: -1.2,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 420,
  },
  list: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    flexGrow: 1,
  },
  banner: {
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.six,
    paddingHorizontal: Spacing.three,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
    maxWidth: 360,
  },
  emptyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.one,
  },
  ghostButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
