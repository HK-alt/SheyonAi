import { fetch as expoFetch } from 'expo/fetch';
import { Platform } from 'react-native';

import { edgeFunctionHeaders } from '@/lib/edge-fetch';
import { functionsUrl, isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  ResearchConfigError,
  type PaperSearchResult,
  type ResearchDetail,
  type ResearchErrorKind,
  type ResearchImage,
  type ResearchLibrary,
  type ResearchResult,
  type WebSearchResult,
} from '@/types/research';

const RELATED_LIMIT = 5;

const MAX_RESULTS = 10;
const PUBMED_TOOL = 'sheyonai';
const PUBMED_EMAIL = 'research@sheyonai.app';
/** Wikimedia blocks generic clients such as OkHttp; identify the app on every request. */
const WIKIMEDIA_USER_AGENT = 'SheyonAi/1.0 (https://sheyonai.app; research@sheyonai.app)';

function wikimediaHeaders(): Record<string, string> {
  return {
    Accept: 'application/json',
    'User-Agent': WIKIMEDIA_USER_AGENT,
    'Api-User-Agent': WIKIMEDIA_USER_AGENT,
  };
}

const RESEARCH_USER_AGENT = 'SheyonAi/1.0 (https://sheyonai.app; research@sheyonai.app)';

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Native OkHttp/URLSession often blocks or ignores User-Agent; retry with expo/fetch. */
async function researchGet(url: string, headers?: Record<string, string>): Promise<Response> {
  const attempts: Array<() => Promise<Response>> = [
    () => fetch(url, headers ? { headers } : undefined),
    () => expoFetch(url, headers ? { headers } : undefined),
    () => expoFetch(url),
    () => fetch(url),
  ];

  let lastResponse: Response | null = null;
  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const response = await attempt();
      if (response.ok) return response;
      lastResponse = response;
      if (response.status === 429) {
        await wait(800);
      }
    } catch (error) {
      lastError = error;
    }
  }
  if (lastResponse) return lastResponse;
  throw lastError instanceof Error ? lastError : new Error('Request failed');
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

function tagContents(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'gi');
  const out: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml))) {
    out.push(match[1]);
  }
  return out;
}

function attrValue(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*"([^"]+)"`, 'i');
  return re.exec(tag)?.[1] ?? null;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string; code?: string } };
    return parsed?.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

async function searchViaEdge<T>(
  source: 'web' | 'arxiv' | 'pubmed',
  query: string,
): Promise<T> {
  if (!isSupabaseConfigured || !functionsUrl) {
    throw new ResearchConfigError('Supabase is not configured for search.');
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('You must be signed in to search.');
  }

  const response = await expoFetch(`${functionsUrl}/web-search`, {
    method: 'POST',
    headers: edgeFunctionHeaders(session.access_token),
    body: JSON.stringify({ query, source, maxResults: MAX_RESULTS }),
  });

  if (response.status === 503) {
    throw new ResearchConfigError(
      'Web search needs a SEARCH_API_KEY (Tavily, Brave, or SerpAPI) in Supabase secrets.',
    );
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Search failed (${response.status})`));
  }

  const payload = (await response.json()) as { results?: T };
  if (!payload?.results) {
    throw new Error('Search returned no results.');
  }
  return payload.results;
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function reconstructInvertedAbstract(index: Record<string, number[]> | null | undefined): string {
  if (!index) return '';
  const words: string[] = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions) {
      words[position] = word;
    }
  }
  return words.filter(Boolean).join(' ').trim();
}

function arxivIdFromText(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/(\d{4}\.\d{4,5}(?:v\d+)?)/);
  return match?.[1] ?? null;
}

type OpenAlexWork = {
  id?: string;
  display_name?: string;
  title?: string;
  publication_date?: string;
  publication_year?: number;
  cited_by_count?: number;
  indexed_in?: string[];
  ids?: { openalex?: string | null; arxiv?: string | null; doi?: string | null; pmid?: string | null };
  authorships?: Array<{ author?: { display_name?: string | null } | null } | null>;
  abstract_inverted_index?: Record<string, number[]> | null;
  primary_location?: {
    landing_page_url?: string | null;
    pdf_url?: string | null;
    source?: { display_name?: string | null } | null;
  } | null;
  host_venue?: { display_name?: string | null } | null;
  open_access?: { oa_url?: string | null } | null;
  locations?: Array<{ landing_page_url?: string | null; pdf_url?: string | null } | null>;
};

function normalizeDoi(doi?: string | null): string | undefined {
  if (!doi) return undefined;
  return doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:/i, '').trim() || undefined;
}

function openAlexShortId(id?: string | null): string | undefined {
  if (!id) return undefined;
  const match = id.match(/W\d+/i);
  return match?.[0];
}

function mapOpenAlexWork(
  work: OpenAlexWork,
  index: number,
  source: PaperSearchResult['source'],
): PaperSearchResult {
  const doi = normalizeDoi(work.ids?.doi);
  const arxivId =
    arxivIdFromText(work.ids?.arxiv) ??
    arxivIdFromText(work.primary_location?.landing_page_url) ??
    work.locations?.map((location) => arxivIdFromText(location?.landing_page_url)).find(Boolean) ??
    null;
  const pmid = work.ids?.pmid?.replace(/^pmid:/i, '') || undefined;
  const absUrl =
    source === 'arxiv'
      ? arxivId
        ? `https://arxiv.org/abs/${arxivId}`
        : work.primary_location?.landing_page_url ?? work.id ?? `arxiv-${index}`
      : source === 'pubmed'
        ? pmid
          ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
          : doi
            ? `https://doi.org/${doi}`
            : work.primary_location?.landing_page_url ?? work.id ?? `pubmed-${index}`
        : doi
          ? `https://doi.org/${doi}`
          : work.primary_location?.landing_page_url ?? work.id ?? `s2-${index}`;
  const pdfUrl =
    work.primary_location?.pdf_url ??
    work.locations?.find((location) => location?.pdf_url)?.pdf_url ??
    (work.open_access?.oa_url?.includes('arxiv.org') ? work.open_access.oa_url : null) ??
    (arxivId ? `https://arxiv.org/pdf/${arxivId}.pdf` : undefined);

  return {
    kind: 'paper',
    id: (source === 'arxiv' ? arxivId : pmid) ?? openAlexShortId(work.id) ?? work.id ?? `${source}-${index}`,
    source,
    title: (work.display_name ?? work.title ?? 'Untitled').replace(/\s+/g, ' ').trim(),
    authors: (work.authorships ?? [])
      .map((item) => item?.author?.display_name?.trim() ?? '')
      .filter(Boolean),
    abstract: reconstructInvertedAbstract(work.abstract_inverted_index),
    publishedAt: work.publication_date ?? (work.publication_year != null ? String(work.publication_year) : null),
    url: absUrl.replace('http://', 'https://'),
    pdfUrl: pdfUrl ?? undefined,
    doi,
    venue: work.primary_location?.source?.display_name ?? work.host_venue?.display_name ?? undefined,
    citationCount: typeof work.cited_by_count === 'number' ? work.cited_by_count : undefined,
    openAlexId: openAlexShortId(work.id) ?? openAlexShortId(work.ids?.openalex),
    pmid,
  };
}

async function searchOpenAlexArxiv(query: string): Promise<PaperSearchResult[]> {
  const cleaned = query.replace(/[,:]/g, ' ').replace(/\s+/g, ' ').trim();
  const url =
    `https://api.openalex.org/works?filter=indexed_in:arxiv,default.search:${encodeURIComponent(cleaned)}` +
    `&per_page=${MAX_RESULTS}&mailto=${encodeURIComponent(PUBMED_EMAIL)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`arXiv search failed (${response.status})`);
  }
  const json = (await response.json()) as { results?: OpenAlexWork[] };
  return (json.results ?? []).map((work, index) => mapOpenAlexWork(work, index, 'arxiv'));
}

function buildArxivSearchQuery(query: string): string {
  if (/^(all|ti|au|abs|co|jr|cat|rn):/i.test(query)) return query;
  const terms = query
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
  if (terms.length === 1) return `all:${terms[0]}`;
  return terms.map((term) => `all:${term}`).join('+AND+');
}

async function searchArxivAtom(query: string): Promise<PaperSearchResult[]> {
  const searchQuery = buildArxivSearchQuery(query);
  const url =
    `https://export.arxiv.org/api/query?search_query=${searchQuery}` +
    `&start=0&max_results=${MAX_RESULTS}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/atom+xml',
      'User-Agent': 'SheyonAi/1.0 (research@sheyonai.app)',
    },
  });
  if (!response.ok) {
    throw new Error(`arXiv search failed (${response.status})`);
  }
  return parseArxivAtom(await response.text());
}

export async function searchArxiv(query: string): Promise<PaperSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const results = await searchOpenAlexArxiv(trimmed);
    if (results.length > 0) return results;
  } catch {
    // OpenAlex is the CORS-friendly path; try Europe PMC next.
  }

  try {
    const results = await searchEuropePmc(trimmed, 'arxiv');
    if (results.length > 0) return results;
  } catch {
    // Native arXiv XML works on iOS/Android but is blocked in browsers.
  }

  try {
    return await searchArxivAtom(trimmed);
  } catch (error) {
    if (Platform.OS === 'web') {
      try {
        return await searchViaEdge<PaperSearchResult[]>('arxiv', trimmed);
      } catch {
        throw error;
      }
    }
    throw error;
  }
}

export function parseArxivAtom(xml: string): PaperSearchResult[] {
  const entries = tagContents(xml, 'entry');
  return entries.map((entry, index) => {
    const id = decodeXml(tagContents(entry, 'id')[0] ?? '') || `arxiv-${index}`;
    const title = decodeXml(tagContents(entry, 'title')[0] ?? 'Untitled');
    const abstract = decodeXml(tagContents(entry, 'summary')[0] ?? '');
    const publishedAt = decodeXml(tagContents(entry, 'published')[0] ?? '') || null;
    const authors = tagContents(entry, 'author')
      .map((author) => decodeXml(tagContents(author, 'name')[0] ?? ''))
      .filter(Boolean);

    let pdfUrl: string | undefined;
    const linkTags = entry.match(/<link\b[^>]*>/gi) ?? [];
    for (const tag of linkTags) {
      const href = attrValue(tag, 'href');
      const titleAttr = attrValue(tag, 'title');
      const type = attrValue(tag, 'type');
      if (href && (titleAttr === 'pdf' || type === 'application/pdf')) {
        pdfUrl = href;
        break;
      }
    }

    const absUrl = id.startsWith('http') ? id.replace('http://', 'https://') : `https://arxiv.org/abs/${id}`;
    return {
      kind: 'paper',
      id,
      source: 'arxiv',
      title,
      authors,
      abstract,
      publishedAt,
      url: absUrl,
      pdfUrl,
      doi: undefined,
    };
  });
}

type EuropePmcAuthor = { fullName?: string };
type EuropePmcUrl = { url?: string; documentStyle?: string; site?: string };
type EuropePmcResult = {
  id?: string;
  source?: string;
  pmid?: string;
  doi?: string;
  title?: string;
  authorString?: string;
  authorList?: { author?: EuropePmcAuthor | EuropePmcAuthor[] };
  pubYear?: string;
  firstPublicationDate?: string;
  abstractText?: string;
  journalTitle?: string;
  citedByCount?: number | string;
  fullTextUrlList?: { fullTextUrl?: EuropePmcUrl | EuropePmcUrl[] };
};

async function searchEuropePmc(query: string, scope: 'pubmed' | 'arxiv'): Promise<PaperSearchResult[]> {
  const scoped =
    scope === 'pubmed' ? `(${query}) AND SRC:MED` : `(${query}) AND (arxiv.org OR HAS_ARXIV:y)`;
  const url =
    `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(scoped)}` +
    `&format=json&pageSize=${MAX_RESULTS}&resultType=core`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${scope === 'pubmed' ? 'PubMed' : 'arXiv'} search failed (${response.status})`);
  }
  const json = (await response.json()) as { resultList?: { result?: EuropePmcResult | EuropePmcResult[] } };
  const rows = asArray(json.resultList?.result);

  return rows.map((row, index) => {
    const authors = asArray(row.authorList?.author)
      .map((author) => author.fullName?.trim() ?? '')
      .filter(Boolean);
    const fallbackAuthors = (row.authorString ?? '')
      .split(/,\s*/)
      .map((name) => name.replace(/\.$/, '').trim())
      .filter(Boolean);
    const links = asArray(row.fullTextUrlList?.fullTextUrl);
    const pdfUrl = links.find((link) => /pdf/i.test(link.documentStyle ?? '') || /pdf/i.test(link.url ?? ''))?.url;
    const pmid = row.pmid ?? (row.source === 'MED' ? row.id : undefined);
    const arxivId = arxivIdFromText(row.doi) ?? arxivIdFromText(links.map((link) => link.url ?? '').join(' '));
    const urlOut =
      scope === 'pubmed'
        ? pmid
          ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
          : row.doi
            ? `https://doi.org/${row.doi}`
            : `https://europepmc.org/article/${row.source}/${row.id}`
        : arxivId
          ? `https://arxiv.org/abs/${arxivId}`
          : links.find((link) => link.url?.includes('arxiv.org'))?.url ??
            (row.doi ? `https://doi.org/${row.doi}` : `https://europepmc.org/article/${row.source}/${row.id}`);

    const cited =
      typeof row.citedByCount === 'number'
        ? row.citedByCount
        : row.citedByCount
          ? Number(row.citedByCount)
          : undefined;
    return {
      kind: 'paper' as const,
      id: pmid ?? arxivId ?? row.id ?? `${scope}-${index}`,
      source: scope === 'pubmed' ? ('pubmed' as const) : ('arxiv' as const),
      title: (row.title ?? 'Untitled').replace(/\s+/g, ' ').trim(),
      authors: authors.length > 0 ? authors : fallbackAuthors,
      abstract: stripHtml(row.abstractText ?? ''),
      publishedAt: row.firstPublicationDate ?? row.pubYear ?? null,
      url: urlOut,
      pdfUrl: pdfUrl ?? (arxivId ? `https://arxiv.org/pdf/${arxivId}.pdf` : undefined),
      doi: normalizeDoi(row.doi),
      venue: row.journalTitle || undefined,
      citationCount: Number.isFinite(cited) ? cited : undefined,
      pmid,
    };
  });
}

type PubMedSummary = {
  uid?: string;
  title?: string;
  pubdate?: string;
  source?: string;
  authors?: Array<{ name?: string }>;
  elocationid?: string;
};

export async function searchPubMed(query: string): Promise<PaperSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const results = await searchEuropePmc(trimmed, 'pubmed');
    if (results.length > 0) return results;
  } catch {
    // Europe PMC is CORS-friendly; NCBI is a fallback.
  }

  try {
    return await searchPubMedNcbi(trimmed);
  } catch (error) {
    if (Platform.OS === 'web') {
      try {
        return await searchViaEdge<PaperSearchResult[]>('pubmed', trimmed);
      } catch {
        throw error;
      }
    }
    throw error;
  }
}

async function searchPubMedNcbi(query: string): Promise<PaperSearchResult[]> {
  const searchUrl =
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed` +
    `&term=${encodeURIComponent(query)}&retmax=${MAX_RESULTS}&retmode=json` +
    `&tool=${PUBMED_TOOL}&email=${encodeURIComponent(PUBMED_EMAIL)}`;
  const searchResponse = await fetch(searchUrl);
  if (!searchResponse.ok) {
    throw new Error(`PubMed search failed (${searchResponse.status})`);
  }
  const searchJson = (await searchResponse.json()) as {
    esearchresult?: { idlist?: string[] };
  };
  const ids = searchJson.esearchresult?.idlist?.filter(Boolean) ?? [];
  if (ids.length === 0) return [];

  const idList = ids.join(',');
  const summaryUrl =
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed` +
    `&id=${idList}&retmode=json&tool=${PUBMED_TOOL}&email=${encodeURIComponent(PUBMED_EMAIL)}`;
  const summaryResponse = await fetch(summaryUrl);
  if (!summaryResponse.ok) {
    throw new Error(`PubMed summary failed (${summaryResponse.status})`);
  }
  const summaryJson = (await summaryResponse.json()) as {
    result?: Record<string, PubMedSummary | string[]>;
  };

  return ids.flatMap((id) => {
    const row = summaryJson.result?.[id];
    if (!row || Array.isArray(row)) return [];
    const authors = (row.authors ?? []).map((author) => author.name?.trim() ?? '').filter(Boolean);
    return [
      {
        kind: 'paper' as const,
        id,
        source: 'pubmed' as const,
        title: (row.title ?? 'Untitled').replace(/\s+/g, ' ').trim(),
        authors,
        abstract: '',
        publishedAt: row.pubdate ?? null,
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        pmid: id,
        doi: normalizeDoi(row.elocationid),
        venue: row.source || undefined,
      },
    ];
  });
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

type WikipediaSearchRow = {
  pageid?: number;
  title?: string;
  snippet?: string;
};

type WikipediaRestPage = {
  id?: number;
  key?: string;
  title?: string;
  excerpt?: string;
  description?: string;
  thumbnail?: { url?: string; source?: string; width?: number; height?: number };
};

function absoluteMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return undefined;
}

function isRenderableImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.includes('.svg') || lower.includes('image/svg')) return false;
  return true;
}

function thumbnailFromRestPage(page: WikipediaRestPage): string | undefined {
  return absoluteMediaUrl(page.thumbnail?.url ?? page.thumbnail?.source);
}

function wikipediaArticleUrl(title: string): string {
  const slug = title.replace(/ /g, '_');
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(slug).replace(/%2F/g, '/')}`;
}

function mapWikipediaSearchRows(rows: WikipediaSearchRow[]): WebSearchResult[] {
  return rows.flatMap((row, index) => {
    const title = row.title?.trim();
    if (!title) return [];
    return [
      {
        kind: 'web' as const,
        id: row.pageid != null ? `wiki-${row.pageid}` : `wiki-${index}`,
        title,
        url: wikipediaArticleUrl(title),
        snippet: stripHtml(row.snippet ?? ''),
        description: stripHtml(row.snippet ?? '') || undefined,
      },
    ];
  });
}

async function wikipediaJson<T>(url: string): Promise<T> {
  const headers = wikimediaHeaders();
  const read = async (response: Response): Promise<T> => {
    if (!response.ok) {
      throw new Error(`Wikipedia search failed (${response.status})`);
    }
    return (await response.json()) as T;
  };
  try {
    return await read(await fetch(url, { headers }));
  } catch {
    return await read(await expoFetch(url, { headers }));
  }
}

/** Free, no-key encyclopedia search (MediaWiki API). */
export async function searchWikipedia(query: string): Promise<WebSearchResult[]> {
  try {
    const restUrl =
      `https://en.wikipedia.org/w/rest.php/v1/search/page` +
      `?q=${encodeURIComponent(query)}&limit=${MAX_RESULTS}`;
    const json = await wikipediaJson<{ pages?: WikipediaRestPage[] }>(restUrl);
    const mapped = (json.pages ?? []).flatMap((page, index) => {
      const title = page.title?.trim() || page.key?.replace(/_/g, ' ').trim();
      if (!title) return [];
      return [
        {
          kind: 'web' as const,
          id: page.id != null ? `wiki-${page.id}` : `wiki-${index}`,
          title,
          url: wikipediaArticleUrl(page.key?.replace(/_/g, ' ') || title),
          snippet: stripHtml(page.description || page.excerpt || ''),
          description: page.description || undefined,
          thumbnailUrl: thumbnailFromRestPage(page),
        },
      ];
    });
    if (mapped.length > 0) return mapped;
  } catch {
    // REST can be blocked on some mobile stacks; use the action API next.
  }

  const url =
    `https://en.wikipedia.org/w/api.php?action=query&list=search` +
    `&srsearch=${encodeURIComponent(query)}&srlimit=${MAX_RESULTS}` +
    `&srprop=snippet&format=json&formatversion=2&origin=*`;
  const json = await wikipediaJson<{
    error?: { info?: string };
    query?: { search?: WikipediaSearchRow[] };
  }>(url);
  if (json.error?.info) {
    throw new Error(json.error.info);
  }
  const rows = mapWikipediaSearchRows(json.query?.search ?? []);
  return attachWikipediaThumbnails(rows);
}

async function attachWikipediaThumbnails(rows: WebSearchResult[]): Promise<WebSearchResult[]> {
  if (rows.length === 0) return rows;
  try {
    const titles = rows.map((row) => row.title).join('|');
    const url =
      `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages` +
      `&piprop=thumbnail&pithumbsize=240&redirects=1` +
      `&titles=${encodeURIComponent(titles)}&format=json&formatversion=2&origin=*`;
    const json = await wikipediaJson<{
      query?: { pages?: Array<{ title?: string; thumbnail?: { source?: string } }> };
    }>(url);
    const byTitle = new Map(
      (json.query?.pages ?? []).map((page) => [page.title ?? '', absoluteMediaUrl(page.thumbnail?.source)]),
    );
    return rows.map((row) => ({
      ...row,
      thumbnailUrl: row.thumbnailUrl ?? byTitle.get(row.title),
    }));
  } catch {
    return rows;
  }
}

export async function searchWeb(query: string): Promise<WebSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    return await searchWikipedia(trimmed);
  } catch (error) {
    try {
      return await searchViaEdge<WebSearchResult[]>('web', trimmed);
    } catch {
      throw error;
    }
  }
}

type SemanticScholarPaper = {
  paperId?: string;
  title?: string;
  abstract?: string | null;
  year?: number | null;
  citationCount?: number | null;
  venue?: string | null;
  url?: string | null;
  authors?: Array<{ name?: string | null } | null> | null;
  openAccessPdf?: { url?: string | null } | null;
  externalIds?: { DOI?: string | null; ArXiv?: string | null; PubMed?: string | null } | null;
};

function mapSemanticScholarPaper(paper: SemanticScholarPaper, index: number): PaperSearchResult | null {
  const title = (paper.title ?? '').replace(/\s+/g, ' ').trim();
  if (!title) return null;
  const doi = normalizeDoi(paper.externalIds?.DOI);
  const arxivId = arxivIdFromText(paper.externalIds?.ArXiv);
  const pmid = paper.externalIds?.PubMed?.replace(/^pmid:/i, '') || undefined;
  const url =
    paper.url ||
    (paper.paperId ? `https://www.semanticscholar.org/paper/${paper.paperId}` : null) ||
    (doi ? `https://doi.org/${doi}` : null) ||
    (arxivId ? `https://arxiv.org/abs/${arxivId}` : null) ||
    (pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : null);
  if (!url) return null;

  return {
    kind: 'paper',
    id: paper.paperId ?? doi ?? arxivId ?? pmid ?? `s2-${index}`,
    source: 'semanticscholar',
    title,
    authors: (paper.authors ?? []).map((author) => author?.name?.trim() ?? '').filter(Boolean),
    abstract: (paper.abstract ?? '').replace(/\s+/g, ' ').trim(),
    publishedAt: paper.year != null ? String(paper.year) : null,
    url,
    pdfUrl: paper.openAccessPdf?.url ?? (arxivId ? `https://arxiv.org/pdf/${arxivId}.pdf` : undefined),
    doi,
    venue: paper.venue || undefined,
    citationCount: typeof paper.citationCount === 'number' ? paper.citationCount : undefined,
    pmid,
  };
}

async function searchSemanticScholarApi(query: string): Promise<PaperSearchResult[]> {
  const fields = [
    'title',
    'authors',
    'abstract',
    'year',
    'citationCount',
    'openAccessPdf',
    'venue',
    'externalIds',
    'url',
  ].join(',');
  const url =
    `https://api.semanticscholar.org/graph/v1/paper/search` +
    `?query=${encodeURIComponent(query)}&limit=${MAX_RESULTS}&fields=${encodeURIComponent(fields)}`;
  const response = await researchGet(url, {
    Accept: 'application/json',
    'User-Agent': RESEARCH_USER_AGENT,
  });
  if (!response.ok) {
    throw new Error(`Semantic Scholar search failed (${response.status})`);
  }
  const json = (await response.json()) as { data?: SemanticScholarPaper[] };
  return (json.data ?? []).flatMap((paper, index) => {
    const mapped = mapSemanticScholarPaper(paper, index);
    return mapped ? [mapped] : [];
  });
}

async function searchOpenAlexAcademic(query: string): Promise<PaperSearchResult[]> {
  const cleaned = query.replace(/[,:]/g, ' ').replace(/\s+/g, ' ').trim();
  const url =
    `https://api.openalex.org/works?search=${encodeURIComponent(cleaned)}` +
    `&per_page=${MAX_RESULTS}&mailto=${encodeURIComponent(PUBMED_EMAIL)}`;
  const response = await researchGet(url, {
    Accept: 'application/json',
    'User-Agent': RESEARCH_USER_AGENT,
  });
  if (!response.ok) {
    throw new Error(`Academic search failed (${response.status})`);
  }
  const json = (await response.json()) as { results?: OpenAlexWork[] };
  return (json.results ?? []).map((work, index) => mapOpenAlexWork(work, index, 'semanticscholar'));
}

export async function searchSemanticScholar(query: string): Promise<PaperSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const results = await searchSemanticScholarApi(trimmed);
    if (results.length > 0) return results;
  } catch {
    // Semantic Scholar often blocks OkHttp on Android; OpenAlex is the mobile fallback.
  }

  try {
    return await searchOpenAlexAcademic(trimmed);
  } catch (error) {
    throw error instanceof Error ? error : new Error('Semantic Scholar search failed.');
  }
}

function queryTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.replace(/[^a-z0-9]+/gi, ''))
    .filter((term) => term.length > 1);
}

function scoreResult(result: ResearchResult, terms: string[]): number {
  let score = 0;
  const title = result.title.toLowerCase();
  const body = (result.kind === 'paper' ? result.abstract : result.snippet).toLowerCase();
  for (const term of terms) {
    if (title.includes(term)) score += 10;
    if (body.includes(term)) score += 2;
  }
  if (result.kind === 'paper' && result.citationCount) {
    score += Math.log10(result.citationCount + 1) * 3;
  }
  return score;
}

function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function deduplicateResults(results: ResearchResult[]): ResearchResult[] {
  const seenDoi = new Set<string>();
  const seenTitle = new Set<string>();
  const out: ResearchResult[] = [];
  for (const result of results) {
    const doi = result.kind === 'paper' ? result.doi?.toLowerCase() : undefined;
    if (doi) {
      if (seenDoi.has(doi)) continue;
      seenDoi.add(doi);
    }
    const title = normalizeTitleKey(result.title);
    if (title) {
      if (seenTitle.has(title)) continue;
      seenTitle.add(title);
    }
    out.push(result);
  }
  return out;
}

export type ResearchSearchBundle = {
  results: ResearchResult[];
  failedSources: ResearchLibrary[];
  lastError?: unknown;
};

export async function searchAllBundle(query: string): Promise<ResearchSearchBundle> {
  const trimmed = query.trim();
  if (!trimmed) return { results: [], failedSources: [] };

  const jobs: Array<{ source: ResearchLibrary; run: () => Promise<ResearchResult[]> }> = [
    { source: 'web', run: () => searchWeb(trimmed) },
    { source: 'arxiv', run: () => searchArxiv(trimmed) },
    { source: 'pubmed', run: () => searchPubMed(trimmed) },
    { source: 'semanticscholar', run: () => searchSemanticScholar(trimmed) },
  ];

  const settled = await Promise.allSettled(jobs.map((job) => job.run()));
  const merged: ResearchResult[] = [];
  const failedSources: ResearchLibrary[] = [];
  let lastError: unknown;
  settled.forEach((item, index) => {
    if (item.status === 'fulfilled') {
      merged.push(...item.value);
    } else {
      failedSources.push(jobs[index].source);
      lastError = item.reason;
    }
  });

  const terms = queryTerms(trimmed);
  return {
    results: deduplicateResults(merged).sort((a, b) => scoreResult(b, terms) - scoreResult(a, terms)),
    failedSources,
    lastError,
  };
}

export async function searchAll(query: string): Promise<ResearchResult[]> {
  const { results, lastError } = await searchAllBundle(query);
  if (results.length === 0 && lastError) {
    throw lastError instanceof Error ? lastError : new Error('Search failed. Please try again.');
  }
  return results;
}

export function classifyResearchError(error: unknown): ResearchErrorKind {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (
    /\b(429|502|503|504)\b/.test(message) ||
    /rate limit|too many|unavailable|overloaded|timeout|timed out/i.test(message)
  ) {
    return 'busy';
  }
  return 'failed';
}

export function researchLibraryLabel(source: ResearchLibrary): string {
  if (source === 'web') return 'Wikipedia';
  if (source === 'arxiv') return 'arXiv';
  if (source === 'pubmed') return 'PubMed';
  return 'Semantic Scholar';
}

export function buildAiOverviewPrompt(query: string, results: ResearchResult[] = []): string {
  const trimmed = query.trim();
  if (results.length === 0) {
    return [
      'The user searched research libraries for:',
      `"${trimmed}"`,
      '',
      'Live paper search is unavailable or returned no results.',
      'Write an AI overview for a student.',
      'Start by saying this is an AI overview, not a live literature search from PubMed, arXiv, or Wikipedia.',
      'Do not invent paper titles, authors, PMIDs, DOIs, citation counts, or URLs.',
      'Explain the topic clearly and mention what a real database search would be useful for.',
    ].join('\n');
  }

  const listed = results.slice(0, 8).map((result, index) => {
    if (result.kind === 'web') {
      return [
        `${index + 1}. ${result.title}`,
        `Source: Wikipedia`,
        `URL: ${result.url}`,
        result.snippet ? `Snippet: ${result.snippet}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    }
    const source =
      result.source === 'arxiv' ? 'arXiv' : result.source === 'pubmed' ? 'PubMed' : 'Semantic Scholar';
    return [
      `${index + 1}. ${result.title}`,
      `Source: ${source}`,
      result.authors.length > 0 ? `Authors: ${result.authors.join(', ')}` : null,
      result.url ? `URL: ${result.url}` : null,
      result.doi ? `DOI: ${result.doi}` : null,
      result.abstract ? `Abstract: ${result.abstract}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  });

  return [
    'The user searched research libraries for:',
    `"${trimmed}"`,
    '',
    'Summarize only the sources below. Do not add papers, authors, PMIDs, or DOIs that are not in this list.',
    'Label the reply as an AI overview of the results we actually found.',
    '',
    listed.join('\n\n'),
  ].join('\n');
}

async function fetchOpenAlexJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}mailto=${encodeURIComponent(PUBMED_EMAIL)}`);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function mergePaper(base: PaperSearchResult, extra: Partial<PaperSearchResult>): PaperSearchResult {
  return {
    ...base,
    ...extra,
    authors: extra.authors && extra.authors.length > 0 ? extra.authors : base.authors,
    abstract: extra.abstract && extra.abstract.length > (base.abstract?.length ?? 0) ? extra.abstract : base.abstract,
    pdfUrl: extra.pdfUrl ?? base.pdfUrl,
    doi: extra.doi ?? base.doi,
    venue: extra.venue ?? base.venue,
    citationCount: extra.citationCount ?? base.citationCount,
    openAlexId: extra.openAlexId ?? base.openAlexId,
    pmid: extra.pmid ?? base.pmid,
  };
}

async function fetchPaperFromOpenAlex(paper: PaperSearchResult): Promise<PaperSearchResult> {
  const filters: string[] = [];
  if (paper.openAlexId) {
    const work = await fetchOpenAlexJson<OpenAlexWork>(
      `https://api.openalex.org/works/${encodeURIComponent(paper.openAlexId)}`,
    );
    if (work) return mergePaper(paper, mapOpenAlexWork(work, 0, paper.source));
  }
  if (paper.doi) filters.push(`doi:${paper.doi}`);
  if (paper.pmid) filters.push(`pmid:${paper.pmid}`);
  for (const filter of filters) {
    const json = await fetchOpenAlexJson<{ results?: OpenAlexWork[] }>(
      `https://api.openalex.org/works?filter=${encodeURIComponent(filter)}&per_page=1`,
    );
    const work = json?.results?.[0];
    if (work) return mergePaper(paper, mapOpenAlexWork(work, 0, paper.source));
  }
  return paper;
}

async function fetchRelatedPapers(paper: PaperSearchResult): Promise<PaperSearchResult[]> {
  const openAlexId = paper.openAlexId;
  if (openAlexId) {
    const json = await fetchOpenAlexJson<{ results?: OpenAlexWork[] }>(
      `https://api.openalex.org/works?filter=related_to:${openAlexId}&per_page=${RELATED_LIMIT}`,
    );
    if (json?.results?.length) {
      return json.results.map((work, index) => mapOpenAlexWork(work, index, paper.source));
    }
  }

  if (paper.pmid) {
    try {
      const url =
        `https://www.ebi.ac.uk/europepmc/webservices/rest/MED/${encodeURIComponent(paper.pmid)}` +
        `/citations?page=1&pageSize=${RELATED_LIMIT}&format=json`;
      const response = await fetch(url);
      if (!response.ok) return [];
      const json = (await response.json()) as {
        citationList?: { citation?: EuropePmcResult | EuropePmcResult[] };
      };
      return asArray(json.citationList?.citation).slice(0, RELATED_LIMIT).map((row, index) => {
        const pmid = row.pmid ?? row.id;
        return {
          kind: 'paper' as const,
          id: pmid ?? `related-${index}`,
          source: 'pubmed' as const,
          title: (row.title ?? 'Untitled').replace(/\s+/g, ' ').trim(),
          authors: (row.authorString ?? '')
            .split(/,\s*/)
            .map((name) => name.replace(/\.$/, '').trim())
            .filter(Boolean),
          abstract: stripHtml(row.abstractText ?? ''),
          publishedAt: row.firstPublicationDate ?? row.pubYear ?? null,
          url: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : paper.url,
          doi: normalizeDoi(row.doi),
          venue: row.journalTitle || undefined,
          pmid: pmid ?? undefined,
        };
      });
    } catch {
      return [];
    }
  }

  return [];
}

async function fetchEuropePmcAbstract(paper: PaperSearchResult): Promise<string> {
  if (paper.abstract.trim()) return paper.abstract;
  const query = paper.pmid
    ? `EXT_ID:${paper.pmid} AND SRC:MED`
    : paper.doi
      ? `DOI:${paper.doi}`
      : `TITLE:"${paper.title.replace(/"/g, '')}"`;
  try {
    const url =
      `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}` +
      `&format=json&pageSize=1&resultType=core`;
    const response = await fetch(url);
    if (!response.ok) return paper.abstract;
    const json = (await response.json()) as { resultList?: { result?: EuropePmcResult | EuropePmcResult[] } };
    const row = asArray(json.resultList?.result)[0];
    return stripHtml(row?.abstractText ?? '') || paper.abstract;
  } catch {
    return paper.abstract;
  }
}

async function fetchWikipediaImages(title: string): Promise<ResearchImage[]> {
  const images: ResearchImage[] = [];
  const seen = new Set<string>();
  const push = (url?: string, caption?: string) => {
    const abs = absoluteMediaUrl(url);
    if (!abs || seen.has(abs) || !isRenderableImageUrl(abs)) return;
    seen.add(abs);
    images.push({ url: abs, caption });
  };

  try {
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
    const summary = await wikipediaJson<{
      thumbnail?: { source?: string };
      originalimage?: { source?: string };
    }>(summaryUrl);
    push(summary.originalimage?.source);
    push(summary.thumbnail?.source);
  } catch {
    // Optional.
  }

  try {
    const mediaUrl = `https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(title.replace(/ /g, '_'))}`;
    const media = await wikipediaJson<{
      items?: Array<{
        type?: string;
        showInGallery?: boolean;
        caption?: { text?: string };
        srcset?: Array<{ src?: string }>;
      }>;
    }>(mediaUrl);
    for (const item of media.items ?? []) {
      if (item.type && item.type !== 'image') continue;
      const src = item.srcset?.[item.srcset.length - 1]?.src ?? item.srcset?.[0]?.src;
      push(src, item.caption?.text);
      if (images.length >= 12) break;
    }
  } catch {
    // Gallery is optional.
  }

  return images;
}

async function fetchWikipediaDetail(result: WebSearchResult): Promise<ResearchDetail> {
  const title = result.title;
  let extract = result.snippet;
  let thumbnailUrl = result.thumbnailUrl;
  let description = result.description;

  try {
    const url =
      `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages|description` +
      `&exintro=0&explaintext=1&exchars=5000&piprop=thumbnail|original&pithumbsize=640&redirects=1` +
      `&titles=${encodeURIComponent(title)}&format=json&formatversion=2&origin=*`;
    const json = await wikipediaJson<{
      query?: {
        pages?: Array<{
          title?: string;
          extract?: string;
          description?: string;
          thumbnail?: { source?: string };
          original?: { source?: string };
        }>;
      };
    }>(url);
    const page = json.query?.pages?.[0];
    if (page?.extract) extract = page.extract;
    if (page?.description) description = page.description;
    if (page?.original?.source) thumbnailUrl = absoluteMediaUrl(page.original.source) ?? thumbnailUrl;
    else if (page?.thumbnail?.source) thumbnailUrl = absoluteMediaUrl(page.thumbnail.source) ?? thumbnailUrl;
  } catch {
    // Keep the search snippet if the extract call fails.
  }

  const images = await fetchWikipediaImages(title);
  if (thumbnailUrl && !images.some((image) => image.url === thumbnailUrl)) {
    images.unshift({ url: thumbnailUrl });
  }

  const related: WebSearchResult[] = [];
  try {
    const relatedUrl = `https://en.wikipedia.org/api/rest_v1/page/related/${encodeURIComponent(title.replace(/ /g, '_'))}`;
    const json = await wikipediaJson<{ pages?: WikipediaRestPage[] }>(relatedUrl);
    for (const page of (json.pages ?? []).slice(0, RELATED_LIMIT)) {
      const relatedTitle = page.title?.trim() || page.key?.replace(/_/g, ' ').trim();
      if (!relatedTitle) continue;
      related.push({
        kind: 'web',
        id: page.id != null ? `wiki-${page.id}` : `wiki-related-${relatedTitle}`,
        title: relatedTitle,
        url: wikipediaArticleUrl(page.key?.replace(/_/g, ' ') || relatedTitle),
        snippet: stripHtml(page.description || page.excerpt || ''),
        description: page.description || undefined,
        thumbnailUrl: thumbnailFromRestPage(page),
      });
    }
  } catch {
    // Related pages are optional.
  }

  return {
    result: {
      ...result,
      snippet: extract.slice(0, 280),
      description,
      thumbnailUrl: thumbnailUrl ?? images[0]?.url,
    },
    extract,
    thumbnailUrl: thumbnailUrl ?? images[0]?.url,
    images,
    related,
  };
}

export async function fetchResearchDetail(result: ResearchResult): Promise<ResearchDetail> {
  if (result.kind === 'web') {
    return fetchWikipediaDetail(result);
  }

  const enriched = await fetchPaperFromOpenAlex(result);
  const abstract = await fetchEuropePmcAbstract(enriched);
  const related = await fetchRelatedPapers(enriched);
  return {
    result: { ...enriched, abstract },
    extract: abstract,
    images: [],
    related,
  };
}

export function buildAskAiPrompt(result: ResearchResult, detail?: ResearchDetail): string {
  if (result.kind === 'web') {
    const extract = detail?.extract || result.snippet;
    return [
      'Help me understand this Wikipedia article.',
      '',
      `Title: ${result.title}`,
      `URL: ${result.url}`,
      result.description ? `Description: ${result.description}` : null,
      extract ? `Extract:\n${extract}` : null,
      '',
      'Summarize the key points and explain anything I would need to know as a student.',
    ]
      .filter((line) => line !== null)
      .join('\n');
  }

  const paper = (detail?.result.kind === 'paper' ? detail.result : result) as PaperSearchResult;
  const abstract = detail?.extract || paper.abstract;
  return [
    'Help me understand this research paper.',
    '',
    `Title: ${paper.title}`,
    paper.authors.length > 0 ? `Authors: ${paper.authors.join(', ')}` : null,
    paper.publishedAt ? `Published: ${paper.publishedAt}` : null,
    paper.venue ? `Venue: ${paper.venue}` : null,
    paper.doi ? `DOI: ${paper.doi}` : null,
    paper.pmid ? `PMID: ${paper.pmid}` : null,
    paper.citationCount != null ? `Citations: ${paper.citationCount}` : null,
    `Source: ${paper.source === 'arxiv' ? 'arXiv' : paper.source === 'pubmed' ? 'PubMed' : 'Semantic Scholar'} (${paper.url})`,
    abstract ? `Abstract:\n${abstract}` : null,
    '',
    'Summarize the paper, its methods, and its main findings in accessible language.',
  ]
    .filter((line) => line !== null)
    .join('\n');
}
