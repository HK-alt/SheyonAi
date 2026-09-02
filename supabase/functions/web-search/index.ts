// web-search Edge Function
//
// Proxies research search so the app can:
//   - Web search via Tavily, Brave, or SerpAPI (SEARCH_API_KEY)
//   - Academic search (arXiv / PubMed) without browser CORS issues
//
// Deploy:  supabase functions deploy web-search
// Secrets: supabase secrets set SEARCH_API_KEY=... SEARCH_PROVIDER=tavily

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const MAX_RESULTS = 10;
const PUBMED_TOOL = 'sheyonai';
const PUBMED_EMAIL = 'research@sheyonai.app';
const WIKIMEDIA_USER_AGENT = 'SheyonAi/1.0 (https://sheyonai.app; research@sheyonai.app)';

function wikimediaHeaders(): HeadersInit {
  return {
    Accept: 'application/json',
    'User-Agent': WIKIMEDIA_USER_AGENT,
    'Api-User-Agent': WIKIMEDIA_USER_AGENT,
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type SearchSource = 'web' | 'arxiv' | 'pubmed';

type WebResult = {
  kind: 'web';
  id: string;
  title: string;
  url: string;
  snippet: string;
};

type PaperResult = {
  kind: 'paper';
  id: string;
  source: 'arxiv' | 'pubmed';
  title: string;
  authors: string[];
  abstract: string;
  publishedAt: string | null;
  url: string;
  pdfUrl?: string;
};

function jsonError(message: string, status: number, code = 'error') {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function jsonOk(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function readSecret(admin: SupabaseClient, name: string): Promise<string | null> {
  const fromEnv = Deno.env.get(name);
  if (fromEnv) return fromEnv;
  const { data } = await admin.from('edge_secrets').select('value').eq('name', name).maybeSingle();
  return data?.value ?? null;
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
  while ((match = re.exec(xml))) out.push(match[1]);
  return out;
}

function attrValue(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*"([^"]+)"`, 'i');
  return re.exec(tag)?.[1] ?? null;
}

function parseArxivAtom(xml: string): PaperResult[] {
  return tagContents(xml, 'entry').map((entry, index) => {
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
    };
  });
}

async function searchArxiv(query: string, maxResults: number): Promise<PaperResult[]> {
  const url =
    `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}` +
    `&start=0&max_results=${maxResults}`;
  const response = await fetch(url, { headers: { Accept: 'application/atom+xml' } });
  if (!response.ok) throw new Error(`arXiv search failed (${response.status})`);
  return parseArxivAtom(await response.text());
}

type PubMedSummary = {
  uid?: string;
  title?: string;
  pubdate?: string;
  authors?: Array<{ name?: string }>;
};

async function searchPubMed(query: string, maxResults: number): Promise<PaperResult[]> {
  const searchUrl =
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed` +
    `&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json` +
    `&tool=${PUBMED_TOOL}&email=${encodeURIComponent(PUBMED_EMAIL)}`;
  const searchResponse = await fetch(searchUrl);
  if (!searchResponse.ok) throw new Error(`PubMed search failed (${searchResponse.status})`);
  const searchJson = (await searchResponse.json()) as { esearchresult?: { idlist?: string[] } };
  const ids = searchJson.esearchresult?.idlist?.filter(Boolean) ?? [];
  if (ids.length === 0) return [];

  const idList = ids.join(',');
  const summaryUrl =
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed` +
    `&id=${idList}&retmode=json&tool=${PUBMED_TOOL}&email=${encodeURIComponent(PUBMED_EMAIL)}`;
  const summaryResponse = await fetch(summaryUrl);
  if (!summaryResponse.ok) throw new Error(`PubMed summary failed (${summaryResponse.status})`);
  const summaryJson = (await summaryResponse.json()) as {
    result?: Record<string, PubMedSummary | string[]>;
  };

  const abstracts: Record<string, string> = {};
  try {
    const fetchUrl =
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed` +
      `&id=${idList}&retmode=xml&rettype=abstract` +
      `&tool=${PUBMED_TOOL}&email=${encodeURIComponent(PUBMED_EMAIL)}`;
    const fetchResponse = await fetch(fetchUrl);
    if (fetchResponse.ok) {
      const xml = await fetchResponse.text();
      for (const article of tagContents(xml, 'PubmedArticle')) {
        const pmid = decodeXml(tagContents(article, 'PMID')[0] ?? '');
        if (!pmid) continue;
        const parts = tagContents(article, 'AbstractText').map(decodeXml).filter(Boolean);
        if (parts.length > 0) abstracts[pmid] = parts.join(' ');
      }
    }
  } catch {
    // Abstracts are optional.
  }

  return ids.flatMap((id) => {
    const row = summaryJson.result?.[id];
    if (!row || Array.isArray(row)) return [];
    return [
      {
        kind: 'paper' as const,
        id,
        source: 'pubmed' as const,
        title: (row.title ?? 'Untitled').replace(/\s+/g, ' ').trim(),
        authors: (row.authors ?? []).map((author) => author.name?.trim() ?? '').filter(Boolean),
        abstract: abstracts[id] ?? '',
        publishedAt: row.pubdate ?? null,
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      },
    ];
  });
}

type Provider = 'tavily' | 'brave' | 'serpapi';

function resolveProvider(explicit: string | null): Provider {
  const value = (explicit ?? '').toLowerCase();
  if (value === 'brave' || value === 'serpapi' || value === 'tavily') return value;
  return 'tavily';
}

async function searchTavily(query: string, apiKey: string, maxResults: number): Promise<WebResult[]> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      search_depth: 'basic',
      include_answer: false,
    }),
  });
  if (!response.ok) throw new Error(`Tavily search failed (${response.status})`);
  const json = (await response.json()) as {
    results?: Array<{ title?: string; url?: string; content?: string }>;
  };
  return (json.results ?? []).flatMap((item, index) => {
    if (!item.url || !item.title) return [];
    return [
      {
        kind: 'web' as const,
        id: item.url || `web-${index}`,
        title: item.title,
        url: item.url,
        snippet: (item.content ?? '').replace(/\s+/g, ' ').trim(),
      },
    ];
  });
}

async function searchBrave(query: string, apiKey: string, maxResults: number): Promise<WebResult[]> {
  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`,
    {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': apiKey,
      },
    },
  );
  if (!response.ok) throw new Error(`Brave search failed (${response.status})`);
  const json = (await response.json()) as {
    web?: { results?: Array<{ title?: string; url?: string; description?: string }>; };
  };
  return (json.web?.results ?? []).flatMap((item, index) => {
    if (!item.url || !item.title) return [];
    return [
      {
        kind: 'web' as const,
        id: item.url || `web-${index}`,
        title: item.title,
        url: item.url,
        snippet: (item.description ?? '').replace(/\s+/g, ' ').trim(),
      },
    ];
  });
}

async function searchSerpApi(query: string, apiKey: string, maxResults: number): Promise<WebResult[]> {
  const response = await fetch(
    `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${encodeURIComponent(apiKey)}&num=${maxResults}`,
  );
  if (!response.ok) throw new Error(`SerpAPI search failed (${response.status})`);
  const json = (await response.json()) as {
    organic_results?: Array<{ title?: string; link?: string; snippet?: string }>;
  };
  return (json.organic_results ?? []).flatMap((item, index) => {
    if (!item.link || !item.title) return [];
    return [
      {
        kind: 'web' as const,
        id: item.link || `web-${index}`,
        title: item.title,
        url: item.link,
        snippet: (item.snippet ?? '').replace(/\s+/g, ' ').trim(),
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

function wikipediaArticleUrl(title: string): string {
  const slug = title.replace(/ /g, '_');
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(slug).replace(/%2F/g, '/')}`;
}

async function searchWikipedia(query: string, maxResults: number): Promise<WebResult[]> {
  const restUrl =
    `https://en.wikipedia.org/w/rest.php/v1/search/page` +
    `?q=${encodeURIComponent(query)}&limit=${maxResults}`;
  try {
    const restResponse = await fetch(restUrl, { headers: wikimediaHeaders() });
    if (restResponse.ok) {
      const restJson = (await restResponse.json()) as {
        pages?: Array<{
          id?: number;
          key?: string;
          title?: string;
          excerpt?: string;
          description?: string;
        }>;
      };
      const mapped = (restJson.pages ?? []).flatMap((page, index) => {
        const title = page.title?.trim() || page.key?.replace(/_/g, ' ').trim();
        if (!title) return [];
        return [
          {
            kind: 'web' as const,
            id: page.id != null ? `wiki-${page.id}` : `wiki-${index}`,
            title,
            url: wikipediaArticleUrl(page.key?.replace(/_/g, ' ') || title),
            snippet: stripHtml(page.description || page.excerpt || ''),
          },
        ];
      });
      if (mapped.length > 0) return mapped;
    }
  } catch {
    // Fall through to action API.
  }

  const url =
    `https://en.wikipedia.org/w/api.php?action=query&list=search` +
    `&srsearch=${encodeURIComponent(query)}&srlimit=${maxResults}` +
    `&srprop=snippet&format=json&formatversion=2`;
  const response = await fetch(url, { headers: wikimediaHeaders() });
  if (!response.ok) throw new Error(`Wikipedia search failed (${response.status})`);
  const json = (await response.json()) as {
    error?: { info?: string };
    query?: { search?: Array<{ pageid?: number; title?: string; snippet?: string }> };
  };
  if (json.error?.info) throw new Error(json.error.info);
  return (json.query?.search ?? []).flatMap((row, index) => {
    const title = row.title?.trim();
    if (!title) return [];
    return [
      {
        kind: 'web' as const,
        id: row.pageid != null ? `wiki-${row.pageid}` : `wiki-${index}`,
        title,
        url: wikipediaArticleUrl(title),
        snippet: stripHtml(row.snippet ?? ''),
      },
    ];
  });
}

async function searchWeb(
  query: string,
  admin: SupabaseClient,
  maxResults: number,
): Promise<WebResult[]> {
  const provider = resolveProvider(await readSecret(admin, 'SEARCH_PROVIDER'));
  const apiKey =
    (await readSecret(admin, 'SEARCH_API_KEY')) ??
    (await readSecret(admin, 'TAVILY_API_KEY')) ??
    (await readSecret(admin, 'BRAVE_SEARCH_API_KEY')) ??
    (await readSecret(admin, 'SERPAPI_API_KEY'));

  if (!apiKey) {
    return searchWikipedia(query, maxResults);
  }

  if (provider === 'brave') return searchBrave(query, apiKey, maxResults);
  if (provider === 'serpapi') return searchSerpApi(query, apiKey, maxResults);
  return searchTavily(query, apiKey, maxResults);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonError('Method not allowed', 405, 'method_not_allowed');
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonError('Missing Authorization header', 401, 'unauthorized');

  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const {
    data: { user },
    error: userError,
  } = await supabaseAuth.auth.getUser();
  if (userError || !user) return jsonError('Invalid or expired token', 401, 'unauthorized');

  let query: string;
  let source: SearchSource = 'web';
  let maxResults = MAX_RESULTS;
  try {
    const body = await req.json();
    query = typeof body?.query === 'string' ? body.query.trim() : '';
    if (!query) throw new Error('query is required');
    if (body?.source === 'arxiv' || body?.source === 'pubmed' || body?.source === 'web') {
      source = body.source;
    }
    if (typeof body?.maxResults === 'number' && body.maxResults > 0) {
      maxResults = Math.min(20, Math.floor(body.maxResults));
    }
  } catch {
    return jsonError('Body must be JSON with a "query" string', 400, 'bad_request');
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    if (source === 'arxiv') {
      return jsonOk({ results: await searchArxiv(query, maxResults) });
    }
    if (source === 'pubmed') {
      return jsonOk({ results: await searchPubMed(query, maxResults) });
    }
    return jsonOk({ results: await searchWeb(query, admin, maxResults) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Search failed';
    const code = (err as { code?: string })?.code;
    if (code === 'search_not_configured') {
      return jsonError(message, 503, 'search_not_configured');
    }
    console.error('web-search error:', err);
    return jsonError(message, 502, 'search_failed');
  }
});
