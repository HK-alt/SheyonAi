import { useCallback, useState } from 'react';

import {
  classifyResearchError,
  searchAllBundle,
  searchArxiv,
  searchPubMed,
  searchSemanticScholar,
  searchWeb,
} from '@/services/research';
import {
  ResearchConfigError,
  type ResearchErrorKind,
  type ResearchLibrary,
  type ResearchResult,
  type ResearchSource,
} from '@/types/research';

export function useResearchSearch() {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<ResearchSource>('all');
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<ResearchErrorKind | null>(null);
  const [needsConfig, setNeedsConfig] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [failedSources, setFailedSources] = useState<ResearchLibrary[]>([]);

  const search = useCallback(async (nextQuery?: string, nextSource?: ResearchSource) => {
    const q = (nextQuery ?? query).trim();
    const src = nextSource ?? source;
    if (!q) return;

    setQuery(q);
    setSource(src);
    setLoading(true);
    setError(null);
    setErrorKind(null);
    setNeedsConfig(false);
    setFailedSources([]);
    setHasSearched(true);

    try {
      if (src === 'all') {
        const bundle = await searchAllBundle(q);
        setResults(bundle.results);
        setFailedSources(bundle.failedSources);
        if (bundle.results.length === 0 && bundle.lastError) {
          if (bundle.lastError instanceof ResearchConfigError) {
            setNeedsConfig(true);
            setError(bundle.lastError.message);
          } else {
            setErrorKind(classifyResearchError(bundle.lastError));
            setError(
              bundle.lastError instanceof Error
                ? bundle.lastError.message
                : 'Search failed. Please try again.',
            );
          }
        }
        return;
      }

      const next =
        src === 'web'
          ? await searchWeb(q)
          : src === 'arxiv'
            ? await searchArxiv(q)
            : src === 'semanticscholar'
              ? await searchSemanticScholar(q)
              : await searchPubMed(q);
      setResults(next);
    } catch (err) {
      setResults([]);
      setFailedSources(src === 'all' ? ['web', 'arxiv', 'pubmed', 'semanticscholar'] : [src]);
      if (err instanceof ResearchConfigError) {
        setNeedsConfig(true);
        setError(err.message);
      } else {
        setErrorKind(classifyResearchError(err));
        setError(err instanceof Error ? err.message : 'Search failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [query, source]);

  return {
    query,
    setQuery,
    source,
    setSource,
    results,
    loading,
    error,
    errorKind,
    needsConfig,
    hasSearched,
    failedSources,
    search,
  };
}
