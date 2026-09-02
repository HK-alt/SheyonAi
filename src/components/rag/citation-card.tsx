import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Divider, Text, TouchableRipple } from 'react-native-paper';

import { useTheme } from '@/hooks/use-theme';
import type { ChunkSource } from '@/types/rag';

type SourceItemProps = {
  source: ChunkSource;
  index: number;
};

function SourceItem({ source, index }: SourceItemProps) {
  const theme = useTheme();
  const [showContext, setShowContext] = useState(false);
  const isUrl = !source.filename.includes('.');
  const hasParentContext = !!source.parent_snippet;

  // Show the fuller parent context when available; otherwise the snippet.
  const displayText = showContext && source.parent_snippet
    ? source.parent_snippet
    : source.snippet;

  return (
    <View style={styles.sourceRow}>
      <Text style={[styles.citationIndex, { color: theme.accent }]}>
        [{index + 1}]
      </Text>
      <View style={styles.sourceBody}>
        <View style={styles.filenameRow}>
          {isUrl && (
            <Text style={[styles.urlIcon, { color: theme.textSecondary }]}>🔗 </Text>
          )}
          <Text style={[styles.filename, { color: theme.text }]} numberOfLines={1}>
            {source.filename}
          </Text>
        </View>
        <Text
          style={[styles.snippet, { color: theme.textSecondary }]}
          numberOfLines={showContext ? undefined : 3}>
          {displayText}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.similarity, { color: theme.textSecondary }]}>
            {Math.round(source.similarity * 100)}% match
          </Text>
          {source.rerank_score != null && (
            <Text style={[styles.similarity, { color: theme.textSecondary }]}>
              · score {source.rerank_score}/10
            </Text>
          )}
          {hasParentContext && (
            <TouchableRipple
              onPress={() => setShowContext((v) => !v)}
              style={styles.contextToggle}>
              <Text style={[styles.contextToggleText, { color: theme.accent }]}>
                {showContext ? 'Less' : 'More context'}
              </Text>
            </TouchableRipple>
          )}
        </View>
      </View>
    </View>
  );
}

type Props = {
  sources: ChunkSource[];
};

export function CitationCard({ sources }: Props) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  if (sources.length === 0) return null;

  const uniqueFiles = [...new Set(sources.map((s) => s.filename))];
  const headerLabel =
    uniqueFiles.length === 1
      ? uniqueFiles[0]
      : `${uniqueFiles.length} sources`;

  return (
    <Card
      style={[styles.card, { backgroundColor: theme.accentMuted, borderColor: theme.accent }]}
      elevation={0}>
      <TouchableRipple
        onPress={() => setExpanded((v) => !v)}
        borderless
        style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerIcon, { color: theme.accent }]}>📎</Text>
          <Text style={[styles.headerText, { color: theme.accent }]}>
            Sources: {headerLabel}
          </Text>
          <Text style={[styles.chevron, { color: theme.accent }]}>
            {expanded ? '▲' : '▼'}
          </Text>
        </View>
      </TouchableRipple>

      {expanded && (
        <Card.Content style={styles.content}>
          {sources.map((source, index) => (
            <View key={source.chunk_id ?? index}>
              {index > 0 && <Divider style={styles.divider} />}
              <SourceItem source={source} index={index} />
            </View>
          ))}
        </Card.Content>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 8,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  header: {
    padding: 10,
    borderRadius: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIcon: {
    fontSize: 14,
  },
  headerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 10,
  },
  content: {
    paddingTop: 0,
    paddingBottom: 8,
  },
  divider: {
    marginVertical: 8,
  },
  sourceRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  citationIndex: {
    fontSize: 12,
    fontWeight: '700',
    width: 24,
    paddingTop: 1,
  },
  sourceBody: {
    flex: 1,
    gap: 2,
  },
  filenameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urlIcon: {
    fontSize: 12,
  },
  filename: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  snippet: {
    fontSize: 12,
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  similarity: {
    fontSize: 11,
  },
  contextToggle: {
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  contextToggleText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
