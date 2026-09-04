import { fetch as expoFetch } from 'expo/fetch';
import { useCallback, useRef } from 'react';

import { edgeFunctionHeaders } from '@/lib/edge-fetch';
import { functionsUrl, supabase } from '@/lib/supabase';

export type DeepSeekUsage = {
  prompt_tokens: number;
  completion_tokens: number;
};

export type StreamReplyResult = {
  /** Full assistant reply accumulated so far (partial when aborted). */
  fullText: string;
  /** DB id of the persisted assistant message, when the stream completed. */
  messageId: string | null;
  usage: DeepSeekUsage | null;
  aborted: boolean;
};

type StreamReplyOptions = {
  conversationId: string;
  /** Subject mode; the Edge Function adds tutor instructions for it. */
  subject?: string;
  /** When true, the Edge Function adds mind-map formatting instructions. */
  mindMap?: boolean;
  /** Coding workspace sub-mode. */
  codingMode?: string;
  /** Personal Tutor workspace sub-mode. */
  tutorMode?: string;
  /** Personal Tutor learner level. */
  tutorLevel?: string;
  /** Global education level from Settings. */
  learningLevel?: string;
  /** Math workspace sub-mode (Solve). */
  mathMode?: string;
  /** Biology generate mode (3D anatomy or simulation). */
  biologyMode?: string;
  /** Physics generate mode (graph, diagram, lab, or field 3D). */
  physicsMode?: string;
  /** Chemistry generate mode (graph, diagram, lab, or molecule 3D). */
  chemistryMode?: string;
  /** Geography generate mode (graph, diagram, lab, or map). */
  geographyMode?: string;
  /** History generate mode (timeline, diagram, lab, or map). */
  historyMode?: string;
  /** English generate mode (essay, diagram, lab, or map). */
  englishMode?: string;
  /** Dzongkha generate mode (library RAG, or vocab/diagram/lab/map). */
  dzongkhaMode?: string;
  /** Home Tools D3 tree visualization layout. */
  treeVizMode?: string;
  /** When true, generates structured slide JSON for a .pptx presentation. */
  presentation?: boolean;
  /** Use the same token as the send flow; falls back to getSession() when omitted. */
  accessToken?: string;
  /** Called for every received token with the accumulated text so far. */
  onDelta: (fullText: string) => void;
};

const MAX_CONNECT_ATTEMPTS = 2;

async function resolveAccessToken(explicit?: string): Promise<string> {
  if (explicit) return explicit;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('You must be signed in to chat.');
  }
  return session.access_token;
}

async function openStream(
  conversationId: string,
  subject: string | undefined,
  mindMap: boolean | undefined,
  codingMode: string | undefined,
  tutorMode: string | undefined,
  tutorLevel: string | undefined,
  learningLevel: string | undefined,
  mathMode: string | undefined,
  biologyMode: string | undefined,
  physicsMode: string | undefined,
  chemistryMode: string | undefined,
  geographyMode: string | undefined,
  historyMode: string | undefined,
  englishMode: string | undefined,
  dzongkhaMode: string | undefined,
  treeVizMode: string | undefined,
  presentation: boolean | undefined,
  accessToken: string,
  signal: AbortSignal,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_CONNECT_ATTEMPTS; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 600));
    try {
      const response = await expoFetch(`${functionsUrl}/deepseek-chat`, {
        method: 'POST',
        headers: edgeFunctionHeaders(accessToken),
        body: JSON.stringify({
          conversationId,
          subject,
          mindMap: mindMap === true ? true : undefined,
          codingMode,
          tutorMode,
          tutorLevel,
          learningLevel,
          mathMode,
          biologyMode,
          physicsMode,
          chemistryMode,
          geographyMode,
          historyMode,
          englishMode,
          dzongkhaMode,
          treeVizMode,
          presentation: presentation === true ? true : undefined,
        }),
        signal,
      });
      if (response.ok && response.body) return response;

      const text = await response.text();
      let message = `Request failed (${response.status})`;
      try {
        message = JSON.parse(text)?.error?.message ?? message;
      } catch {
        // Non-JSON error body; keep the generic message.
      }
      lastError = new Error(message);
      // Only retry transient server-side failures.
      if (response.status < 500) break;
    } catch (error) {
      if (signal.aborted) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not reach the AI service');
}

/**
 * Streams an AI reply for a conversation through the deepseek-chat Edge
 * Function. The function reads the conversation history server-side, so the
 * pending user message must already be persisted before calling streamReply.
 */
export function useDeepSeekChat() {
  const abortRef = useRef<AbortController | null>(null);

  const streamReply = useCallback(
    async ({
      conversationId,
      subject,
      mindMap,
      codingMode,
      tutorMode,
      tutorLevel,
      learningLevel,
      mathMode,
      biologyMode,
      physicsMode,
      chemistryMode,
      geographyMode,
      historyMode,
      englishMode,
      dzongkhaMode,
      treeVizMode,
      presentation,
      accessToken,
      onDelta,
    }: StreamReplyOptions): Promise<StreamReplyResult> => {
      const token = await resolveAccessToken(accessToken);

      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;

      const result: StreamReplyResult = {
        fullText: '',
        messageId: null,
        usage: null,
        aborted: false,
      };

      try {
        const response = await openStream(
          conversationId,
          subject,
          mindMap,
          codingMode,
          tutorMode,
          tutorLevel,
          learningLevel,
          mathMode,
          biologyMode,
          physicsMode,
          chemistryMode,
          geographyMode,
          historyMode,
          englishMode,
          dzongkhaMode,
          treeVizMode,
          presentation,
          token,
          controller.signal,
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
            } else if (payload.error) {
              throw new Error(
                (payload.error as { message?: string })?.message ?? 'The AI response failed.',
              );
            } else if (payload.done) {
              result.messageId = (payload.messageId as string) ?? null;
              result.usage = (payload.usage as DeepSeekUsage) ?? null;
            }
          }
          // One UI update per network chunk — not per SSE line (avoids max update depth).
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

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  return { streamReply, stopStreaming };
}
