import { create } from 'zustand';

import {
  deleteDocument,
  ingestUrl,
  listDocuments,
  uploadAndProcess,
  type PickedFile,
} from '@/services/rag-documents';
import type { DocumentRecord, UploadStatus } from '@/types/rag';

type UploadedDocument = DocumentRecord & { chunksCreated: number };

type DocumentState = {
  documents: DocumentRecord[];
  isFetching: boolean;
  fetchError: string | null;
  uploadStatus: UploadStatus;

  fetchDocuments: () => Promise<void>;
  uploadDocument: (file: PickedFile, userId: string) => Promise<UploadedDocument>;
  ingestUrl: (url: string) => Promise<DocumentRecord>;
  deleteDocument: (id: string) => Promise<void>;
  clearUploadStatus: () => void;
};

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  isFetching: false,
  fetchError: null,
  uploadStatus: { stage: 'idle' },

  async fetchDocuments() {
    set({ isFetching: true, fetchError: null });
    try {
      const docs = await listDocuments();
      set({ documents: docs, isFetching: false });
    } catch (err) {
      set({
        isFetching: false,
        fetchError: err instanceof Error ? err.message : 'Failed to load documents',
      });
    }
  },

  async uploadDocument(file, userId) {
    set({ uploadStatus: { stage: 'uploading', progress: 0 } });
    try {
      const { document: doc, chunksCreated } = await uploadAndProcess(file, userId, (stage) => {
        set({
          uploadStatus:
            stage === 'uploading'
              ? { stage: 'uploading', progress: 50 }
              : { stage: 'processing' },
        });
      });
      set((state) => ({
        documents: [doc, ...state.documents],
        uploadStatus: { stage: 'done', documentId: doc.id, chunksCreated },
      }));
      return { ...doc, chunksCreated };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      set({ uploadStatus: { stage: 'error', message } });
      throw err;
    }
  },

  async ingestUrl(url) {
    set({ uploadStatus: { stage: 'processing' } });
    try {
      const doc = await ingestUrl(url);
      set((state) => ({
        documents: [doc, ...state.documents],
        uploadStatus: { stage: 'done', documentId: doc.id },
      }));
      return doc;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'URL ingestion failed';
      set({ uploadStatus: { stage: 'error', message } });
      throw err;
    }
  },

  async deleteDocument(id) {
    // Optimistic removal
    const previous = get().documents;
    set((state) => ({ documents: state.documents.filter((d) => d.id !== id) }));
    try {
      await deleteDocument(id);
    } catch (err) {
      // Rollback on failure
      set({ documents: previous });
      throw err;
    }
  },

  clearUploadStatus() {
    set({ uploadStatus: { stage: 'idle' } });
  },
}));
