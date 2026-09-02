export type ResearchSource = 'all' | 'web' | 'arxiv' | 'pubmed' | 'semanticscholar';

export type ResearchLibrary = Exclude<ResearchSource, 'all'>;

export type ResearchErrorKind = 'busy' | 'failed';

export type WebSearchResult = {
  kind: 'web';
  id: string;
  title: string;
  url: string;
  snippet: string;
  description?: string;
  thumbnailUrl?: string;
};

export type PaperSearchResult = {
  kind: 'paper';
  id: string;
  source: 'arxiv' | 'pubmed' | 'semanticscholar';
  title: string;
  authors: string[];
  abstract: string;
  publishedAt: string | null;
  url: string;
  pdfUrl?: string;
  doi?: string;
  venue?: string;
  citationCount?: number;
  openAlexId?: string;
  pmid?: string;
  thumbnailUrl?: string;
};

export type ResearchResult = WebSearchResult | PaperSearchResult;

export type ResearchImage = {
  url: string;
  caption?: string;
};

export type ResearchDetail = {
  result: ResearchResult;
  extract?: string;
  thumbnailUrl?: string;
  images: ResearchImage[];
  related: ResearchResult[];
};

export class ResearchConfigError extends Error {
  readonly code = 'search_not_configured';

  constructor(message = 'Web search is not configured.') {
    super(message);
    this.name = 'ResearchConfigError';
  }
}
