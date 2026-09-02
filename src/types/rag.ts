export type DocumentRecord = {
  id: string;
  user_id: string;
  filename: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  source_type?: 'upload' | 'url';
  source_url?: string | null;
};

export type ChunkSource = {
  filename: string;
  snippet: string;
  /** Larger parent chunk context for richer citation display. */
  parent_snippet?: string | null;
  similarity: number;
  document_id: string;
  chunk_id: string;
  rerank_score?: number;
};

export type RagMessage = {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: ChunkSource[] | null;
  created_at: string;
  /** Partial content while streaming; not persisted. */
  streamingContent?: string;
};

export type RagSession = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: RagMessage[];
  messagesLoaded?: boolean;
};

export type UploadStatus =
  | { stage: 'idle' }
  | { stage: 'uploading'; progress: number }
  | { stage: 'processing' }
  | { stage: 'done'; documentId: string; chunksCreated?: number }
  | { stage: 'error'; message: string };
