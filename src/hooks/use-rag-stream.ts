import { fetch as expoFetch } from 'expo/fetch';
import { useCallback, useRef } from 'react';

import { edgeFunctionHeaders } from '@/lib/edge-fetch';
import { functionsUrl, supabase } from '@/lib/supabase';
import type { TypingStage } from '@/types/chat';
import type { ChunkSource } from '@/types/rag';

export type StreamRagResult = {
  fullText: string;
  messageId: string | null;
  sources: ChunkSource[];
  aborted: boolean;
};

type StreamRagOptions = {
  conversationId: string;
  subject?: string;
  /** Global education level from Settings. */
  learningLevel?: string;
  documentIds?: string[];
  /** Use the same token as the send flow; falls back to getSession() when omitted. */
  accessToken?: string;
  onDelta: (fullText: string) => void;
  /** Called when the server advances to a new pipeline stage (e.g. Dzongkha translation). */
  onStage?: (stage: TypingStage) => void;
};

const MAX_CONNECT_ATTEMPTS = 2;

async function resolveAccessToken(explicit?: string): Promise<string> {
  if (explicit) return explicit;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('You must be signed in to use Documents mode.');
  }
  return session.access_token;
}

async function openRagStream(
  conversationId: string,
  accessToken: string,
  signal: AbortSignal,
  subject?: string,
  documentIds?: string[],
  learningLevel?: string,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_CONNECT_ATTEMPTS; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 600));
    try {
      const body: {
        conversationId: string;
        subject?: string;
        documentIds?: string[];
        learningLevel?: string;
      } = { conversationId };
      if (subject) body.subject = subject;
      if (documentIds && documentIds.length > 0) body.documentIds = documentIds;
      if (learningLevel) body.learningLevel = learningLevel;

      const response = await expoFetch(`${functionsUrl}/rag-chat`, {
        method: 'POST',
        headers: edgeFunctionHeaders(accessToken),
        body: JSON.stringify(body),
        signal,
      });
      if (response.ok && response.body) return response;

      const text = await response.text();
      let errorMessage = `Request failed (${response.status})`;
      let errorCode: string | undefined;
      try {
        const parsed = JSON.parse(text);
        errorMessage = parsed?.error?.message ?? errorMessage;
        errorCode = parsed?.error?.code;
      } catch {
        // Non-JSON error body
      }
      const err = new Error(errorMessage) as Error & { status?: number; code?: string };
      err.status = response.status;
      err.code = errorCode;
      lastError = err;
      if (response.status < 500) break;
    } catch (error) {
      if (signal.aborted) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not reach the RAG service');
}

/**
 * Streams a RAG reply for a conversation through the rag-chat Edge Function.
 * The function reads the pending user message server-side, so the user message
 * must already be persisted before calling streamRagReply.
 */
export function useRagStream() {
  const abortRef = useRef<AbortController | null>(null);

  const streamRagReply = useCallback(
    async ({
      conversationId,
      subject,
      learningLevel,
      documentIds,
      accessToken,
      onDelta,
      onStage,
    }: StreamRagOptions): Promise<StreamRagResult> => {
      const token = await resolveAccessToken(accessToken);

      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;

      const result: StreamRagResult = {
        fullText: '',
        messageId: null,
        sources: [],
        aborted: false,
      };

      try {
        const response = await openRagStream(
          conversationId,
          token,
          controller.signal,
          subject,
          documentIds,
          learningLevel,
        );

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          let textChanged = false;
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;

            let payload: Record<string, unknown>;
            try {
              payload = JSON.parse(trimmed.slice(5).trim());
            } catch {
              continue;
            }

            if (typeof payload.delta === 'string') {
              result.fullText += payload.delta;
              textChanged = true;
            } else if (payload.stage === 'translating') {
              onStage?.('translating');
            } else if (payload.stage === 'polishing') {
              onStage?.('polishing');
            } else if (payload.error) {
              throw new Error(
                (payload.error as { message?: string })?.message ?? 'The AI response failed.',
              );
            } else if (payload.done) {
              result.messageId = (payload.messageId as string) ?? null;
              result.sources = (payload.sources as ChunkSource[]) ?? [];
            }
          }
          if (textChanged) {
            onDelta(result.fullText);
          }
        }

        return result;
      } catch (error) {
        if (controller.signal.aborted) {
          result.aborted = true;
          return result;
        }
        throw error;
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [],
  );

  const stopRagStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  return { streamRagReply, stopRagStreaming };
}
