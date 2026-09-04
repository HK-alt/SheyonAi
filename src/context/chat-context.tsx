import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Alert, Platform } from 'react-native';

import { useAuthContext } from '@/context/auth-context';
import { useDeepSeekChat } from '@/hooks/use-deepseek-chat';
import { useRagStream } from '@/hooks/use-rag-stream';
import { useRealtimeMessages } from '@/hooks/use-realtime-messages';
import { isDevBypassUser } from '@/lib/dev-session';
import { supabase } from '@/lib/supabase';
import { attachmentLabelForCount, titleForAttachments } from '@/lib/attachment-utils';
import { displayChatTitle } from '@/lib/chat-title';
import { runMockGeneration } from '@/lib/mock-generation';
import * as attachmentsService from '@/services/attachments';
import * as conversationsService from '@/services/conversations';
import { fetchRagDocumentIds, updateRagDocumentIds } from '@/services/conversations';
import * as messagesService from '@/services/messages';
import { tryParseMindMap } from '@/subject/mind-map-parser';
import { tryParseTutorFlashcards } from '@/subject/flashcard-parser';
import { tryParseTutorHint } from '@/subject/hint-parser';
import { tryParseTutorCoach } from '@/subject/coach-parser';
import { tryParseTutorLesson } from '@/subject/lesson-parser';
import { tryParseTutorSolve } from '@/subject/solve-parser';
import { tryParseTutorPlan } from '@/subject/plan-parser';
import { tryParseTutorQuiz } from '@/subject/quiz-parser';
import { tryParseWebsitePreview } from '@/subject/website-preview-parser';
import { tryParseAnatomy } from '@/subject/biology-lab/anatomy-parser';
import { tryParseDiagram } from '@/subject/biology-lab/diagram-parser';
import { tryParseScienceGraph } from '@/subject/science-graph';
import { tryParseTreeViz } from '@/subject/tree-viz';
import { tryParsePresentation, withPresentationModeInstructions, stripPresentationModeInstructions } from '@/subject/presentation';
import { tryParseField, inferFieldFromText } from '@/subject/physics-lab/field-parser';
import {
  tryParseMolecule,
  resolveMoleculeContent,
} from '@/subject/chemistry-lab/molecule-parser';
import { inferScienceGraphFromText } from '@/subject/science-graph/graph-inference';
import type {
  Conversation,
  Message,
  MessageAttachment,
  PendingAttachment,
  SendMessagePayload,
  TypingStage,
} from '@/types/chat';
import type { Subject } from '@/subject';
import type { ConversationRow, MessageRow } from '@/types/database';
import type { ChunkSource } from '@/types/rag';

const CACHE_PREFIX = 'sheyonai.cache.v2.';
const SAVE_DEBOUNCE_MS = 400;

const TYPING_STAGE_DELAYS: { stage: TypingStage; at: number }[] = [
  { stage: 'thinking', at: 0 },
  { stage: 'writing', at: 2500 },
  { stage: 'finishing', at: 6000 },
];

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isDraftId(id: string) {
  return id.startsWith('draft-');
}

async function ensureConversationReady(conversationId: string): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .maybeSingle();
    if (data?.id) return true;
    if (attempt === 0) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return false;
}

function isConversationNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const err = error as Error & { code?: string; status?: number };
  return (
    err.code === 'conversation_missing' ||
    err.code === 'not_found' ||
    err.status === 404 ||
    /conversation does not exist|conversation not found|conversation belongs to another user/i.test(
      error.message,
    )
  );
}

type RagRecoveryContext = {
  userId: string;
  messageText: string;
  attachments: MessageAttachment[];
  title: string;
  onPromoted: (newConversationId: string) => void;
};

async function resolveAuthForSend(): Promise<{ userId: string; accessToken: string }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (userError || !user || !session?.access_token) {
    throw new Error('Your session expired. Please sign in again.');
  }
  return { userId: user.id, accessToken: session.access_token };
}

function makeTitle(text: string, attachments: PendingAttachment[] = []) {
  const cleaned = displayChatTitle(text.replace(/\s+/g, ' ').trim());
  if (cleaned !== 'New chat') {
    return cleaned.length > 30 ? `${cleaned.slice(0, 30)}…` : cleaned;
  }
  return titleForAttachments(attachments) ?? 'New chat';
}

function promptFromPayload(text: string, attachments: PendingAttachment[] = []) {
  const trimmed = text.trim();
  const count = attachments.length;
  if (count === 0) return trimmed;
  const label = attachmentLabelForCount(count, attachments);
  const note = `[User attached ${count} ${label}(s)]`;
  if (trimmed) return `${trimmed}\n\n${note}`;
  return note;
}

/** Local-only conversation; persisted to Supabase on the first message. */
function createDraftConversation(): Conversation {
  const now = Date.now();
  return {
    id: `draft-${createId()}`,
    title: 'New chat',
    messages: [],
    createdAt: now,
    updatedAt: now,
    messagesLoaded: true,
  };
}

/** Always open a blank chat on load; keep prior threads for the sidebar. */
function conversationsWithFreshDraft(existing: Conversation[]): {
  conversations: Conversation[];
  draftId: string;
} {
  const fresh = createDraftConversation();
  const rest = existing.filter((c) => !(isDraftId(c.id) && c.messages.length === 0));
  return { conversations: [fresh, ...rest], draftId: fresh.id };
}

function messageFromRow(row: MessageRow, subject?: Subject): Message {
  const sources = Array.isArray(row.sources)
    ? (row.sources as ChunkSource[])
    : undefined;
  const rawContent = row.content;
  const content =
    row.role === 'user'
      ? stripPresentationModeInstructions(rawContent)
      : rawContent;
  const base: Message = {
    id: row.id,
    role: row.role,
    content,
    createdAt: Date.parse(row.created_at),
    attachments: row.attachments ?? [],
    sources,
  };
  if (row.role !== 'assistant') return base;

  if (tryParseScienceGraph(content)) {
    return { ...base, scienceGraph: true };
  }

  if (
    (subject === 'physics' || subject === 'chemistry' || subject === 'biology' || subject === 'geography') &&
    inferScienceGraphFromText(content)
  ) {
    return { ...base, scienceGraph: true };
  }

  if (tryParseField(content)) {
    return { ...base, physicsField: true };
  }

  if (subject === 'physics' && inferFieldFromText(content)) {
    return { ...base, physicsField: true };
  }

  if (tryParseTreeViz(content)) {
    return { ...base, treeViz: true };
  }

  if (subject !== 'physics' && subject !== 'chemistry' && tryParseDiagram(content)) {
    return { ...base, biologyDiagram: true };
  }

  if (subject === 'chemistry' || subject === undefined) {
    if (tryParseMolecule(content)) {
      return { ...base, chemistryMolecule: true };
    }
    const moleculeish =
      subject === 'chemistry' &&
      /\b(3d\s+molecule|molecule\s+3d|ball[- ]?and[- ]?stick|molecular\s+structure)\b/i.test(
        content.slice(0, 600),
      ) &&
      resolveMoleculeContent(content, { preferInfer: true });
    if (moleculeish) {
      return { ...base, chemistryMolecule: true };
    }
  }

  if (subject === 'biology' || subject === undefined) {
    if (tryParseAnatomy(content)) {
      return { ...base, biologyAnatomy: true };
    }
  }

  if (tryParseWebsitePreview(content)) {
    return { ...base, websitePreview: true };
  }

  if (tryParsePresentation(content)) {
    return { ...base, presentation: true };
  }

  if (tryParseTutorFlashcards(content)) {
    return { ...base, flashcards: true };
  }

  if (tryParseTutorQuiz(content)) {
    return { ...base, quiz: true };
  }

  if (tryParseTutorHint(content)) {
    return { ...base, tutorHint: true };
  }

  if (tryParseTutorCoach(content)) {
    return { ...base, tutorCoach: true };
  }

  if (tryParseTutorSolve(content)) {
    return { ...base, tutorSolve: true };
  }

  if (tryParseTutorLesson(content)) {
    return { ...base, tutorLesson: true };
  }

  if (tryParseTutorPlan(content)) {
    return { ...base, tutorPlan: true };
  }

  if (tryParseMindMap(content)) {
    return { ...base, mindMap: true };
  }

  return base;
}

function isHtmlPreviewMode(
  codingMode?: string,
  biologyMode?: string,
  physicsMode?: string,
  chemistryMode?: string,
  geographyMode?: string,
  historyMode?: string,
  englishMode?: string,
  dzongkhaMode?: string,
) {
  return (
    codingMode === 'build' ||
    biologyMode === 'sim' ||
    biologyMode === 'diagram' ||
    physicsMode === 'diagram' ||
    physicsMode === 'sim' ||
    chemistryMode === 'diagram' ||
    chemistryMode === 'sim' ||
    geographyMode === 'diagram' ||
    geographyMode === 'sim' ||
    geographyMode === 'map' ||
    historyMode === 'timeline' ||
    historyMode === 'diagram' ||
    historyMode === 'sim' ||
    historyMode === 'map' ||
    englishMode === 'essay' ||
    englishMode === 'diagram' ||
    englishMode === 'sim' ||
    englishMode === 'map' ||
    dzongkhaMode === 'vocab' ||
    dzongkhaMode === 'diagram' ||
    dzongkhaMode === 'sim' ||
    dzongkhaMode === 'map'
  );
}

function isAnatomyMode(biologyMode?: string) {
  return biologyMode === 'anatomy';
}

function isBiologyDiagramMode(biologyMode?: string) {
  return biologyMode === 'diagram';
}

function isScienceGraphMode(
  biologyMode?: string,
  physicsMode?: string,
  chemistryMode?: string,
  geographyMode?: string,
) {
  return (
    biologyMode === 'graph' ||
    physicsMode === 'graph' ||
    chemistryMode === 'graph' ||
    geographyMode === 'graph'
  );
}

function isPhysicsFieldMode(physicsMode?: string) {
  return physicsMode === 'field';
}

function isChemistryMoleculeMode(chemistryMode?: string) {
  return chemistryMode === 'molecule';
}

function conversationFromRow(row: ConversationRow, cached?: Conversation): Conversation {
  return {
    id: row.id,
    title: row.title,
    // Stale-while-revalidate: show cached messages instantly, refetch on open.
    messages: cached?.messages ?? [],
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
    messagesLoaded: false,
  };
}

function showError(message: string) {
  if (Platform.OS === 'web') {
    alert(message);
    return;
  }
  Alert.alert('Sheyon Ai', message);
}

type ChatContextValue = {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  activeConversationId: string | null;
  isTyping: boolean;
  typingStage: TypingStage;
  streamingMessageId: string | null;
  isGenerating: boolean;
  /** IDs of documents scoped to the active conversation, or null for all. */
  activeRagDocumentIds: string[] | null;
  setActiveConversation: (id: string) => void;
  createConversation: () => void;
  deleteConversation: (id: string) => void;
  clearAllConversations: () => void;
  sendMessage: (payload: SendMessagePayload) => Promise<void>;
  regenerateLastReply: () => void;
  stopGenerating: () => void;
  /** Persist document scope for the active conversation. */
  setRagDocumentScope: (documentIds: string[] | null) => Promise<void>;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  // Keying by user id remounts the stateful provider on sign-in/out/account
  // switch, guaranteeing no state leaks between accounts.
  return (
    <ChatProviderInner key={user?.id ?? 'signed-out'} user={user}>
      {children}
    </ChatProviderInner>
  );
}

function ChatProviderInner({ user, children }: { user: User | null; children: ReactNode }) {
  const userId = user?.id ?? null;
  const isOfflineDev = isDevBypassUser(user);
  const { streamReply, stopStreaming } = useDeepSeekChat();
  const { streamRagReply, stopRagStreaming } = useRagStream();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [requestedConversationId, setRequestedConversationId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingStage, setTypingStage] = useState<TypingStage>('thinking');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // If the requested conversation disappears (deleted, replaced after a server
  // sync), fall back to the most recent one instead of reconciling in effects.
  const activeConversation = useMemo(
    () =>
      conversations.find((c) => c.id === requestedConversationId) ??
      conversations[0] ??
      null,
    [conversations, requestedConversationId],
  );
  const activeConversationId = activeConversation?.id ?? null;

  const conversationsRef = useRef<Conversation[]>([]);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const isGeneratingRef = useRef(false);
  useEffect(() => {
    isGeneratingRef.current = isTyping || streamingMessageId !== null;
  }, [isTyping, streamingMessageId]);

  const busyRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mockCancelRef = useRef<(() => void) | null>(null);
  const mockAbortRef = useRef<AbortController | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingMessagesRef = useRef(new Set<string>());
  const lastSubjectByConversationRef = useRef<Record<string, string | undefined>>({});
  const lastMindMapByConversationRef = useRef<Record<string, boolean>>({});
  const lastRagByConversationRef = useRef<Record<string, boolean>>({});
  const lastCodingModeByConversationRef = useRef<Record<string, string | undefined>>({});
  const lastTutorModeByConversationRef = useRef<Record<string, string | undefined>>({});
  const lastTutorLevelByConversationRef = useRef<Record<string, string | undefined>>({});
  const lastLearningLevelByConversationRef = useRef<Record<string, string | undefined>>({});
  const lastMathModeByConversationRef = useRef<Record<string, string | undefined>>({});
  const lastBiologyModeByConversationRef = useRef<Record<string, string | undefined>>({});
  const lastPhysicsModeByConversationRef = useRef<Record<string, string | undefined>>({});
  const lastChemistryModeByConversationRef = useRef<Record<string, string | undefined>>({});
  const lastGeographyModeByConversationRef = useRef<Record<string, string | undefined>>({});
  const lastHistoryModeByConversationRef = useRef<Record<string, string | undefined>>({});
  const lastEnglishModeByConversationRef = useRef<Record<string, string | undefined>>({});
  const lastDzongkhaModeByConversationRef = useRef<Record<string, string | undefined>>({});
  const lastTreeVizModeByConversationRef = useRef<Record<string, string | undefined>>({});
  // Per-conversation RAG document scope (null = search all user docs).
  const [ragDocumentIdsMap, setRagDocumentIdsMap] = useState<Record<string, string[] | null>>({});

  // ----------------------------------------------------------------------
  // Local state helpers
  // ----------------------------------------------------------------------

  const updateConversation = useCallback(
    (id: string, updater: (conversation: Conversation) => Conversation) => {
      setConversations((prev) => {
        const index = prev.findIndex((conversation) => conversation.id === id);
        if (index === -1) return prev;
        const current = prev[index];
        const nextConversation = updater(current);
        if (nextConversation === current) return prev;
        const next = prev.slice();
        next[index] = nextConversation;
        return next;
      });
    },
    [],
  );

  const appendMessage = useCallback(
    (conversationId: string, message: Message) => {
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        messages: [...conversation.messages, message],
        updatedAt: Date.now(),
      }));
    },
    [updateConversation],
  );

  const setMessageContent = useCallback(
    (conversationId: string, messageId: string, content: string) => {
      updateConversation(conversationId, (conversation) => {
        const target = conversation.messages.find((message) => message.id === messageId);
        if (!target || target.content === content) return conversation;
        return {
          ...conversation,
          messages: conversation.messages.map((message) =>
            message.id === messageId ? { ...message, content } : message,
          ),
          updatedAt: Date.now(),
        };
      });
    },
    [updateConversation],
  );

  const streamPendingRef = useRef<{
    conversationId: string;
    messageId: string;
    content: string;
  } | null>(null);
  const streamFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFlushedStreamRef = useRef<{ messageId: string; content: string } | null>(null);

  const flushStreamContentUpdate = useCallback(() => {
    if (streamFlushTimerRef.current !== null) {
      clearTimeout(streamFlushTimerRef.current);
      streamFlushTimerRef.current = null;
    }
    const pending = streamPendingRef.current;
    if (!pending) return;
    streamPendingRef.current = null;
    if (
      lastFlushedStreamRef.current?.messageId === pending.messageId &&
      lastFlushedStreamRef.current?.content === pending.content
    ) {
      return;
    }
    lastFlushedStreamRef.current = { messageId: pending.messageId, content: pending.content };
    setMessageContent(pending.conversationId, pending.messageId, pending.content);
  }, [setMessageContent]);

  /**
   * Coalesce rapid stream tokens. Uses setTimeout (not rAF): on web,
   * setState inside requestAnimationFrame counts as nested updates, and
   * expensive markdown/KaTeX renders hit React's ~50 nested-update limit.
   */
  const queueStreamContentUpdate = useCallback(
    (conversationId: string, messageId: string, content: string) => {
      streamPendingRef.current = { conversationId, messageId, content };
      if (streamFlushTimerRef.current !== null) return;
      streamFlushTimerRef.current = setTimeout(() => {
        streamFlushTimerRef.current = null;
        flushStreamContentUpdate();
      }, 32);
    },
    [flushStreamContentUpdate],
  );

  const setMessageSources = useCallback(
    (conversationId: string, messageId: string, sources: ChunkSource[]) => {
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        messages: conversation.messages.map((message) =>
          message.id === messageId ? { ...message, sources } : message,
        ),
        updatedAt: Date.now(),
      }));
    },
    [updateConversation],
  );

  const removeMessage = useCallback(
    (conversationId: string, messageId: string) => {
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        messages: conversation.messages.filter((message) => message.id !== messageId),
      }));
    },
    [updateConversation],
  );

  /** Swaps a temp message id for its DB id (dropping the temp on conflict). */
  const reconcileMessageId = useCallback(
    (conversationId: string, tempId: string, dbId: string) => {
      updateConversation(conversationId, (conversation) => {
        const alreadyExists = conversation.messages.some((m) => m.id === dbId);
        return {
          ...conversation,
          messages: alreadyExists
            ? conversation.messages.filter((m) => m.id !== tempId)
            : conversation.messages.map((m) => (m.id === tempId ? { ...m, id: dbId } : m)),
        };
      });
    },
    [updateConversation],
  );

  const clearGenerationTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const stopGenerating = useCallback(() => {
    stopStreaming();
    stopRagStreaming();
    mockCancelRef.current?.();
    mockCancelRef.current = null;
    mockAbortRef.current?.abort();
    mockAbortRef.current = null;
    flushStreamContentUpdate();
    clearGenerationTimers();
    setIsTyping(false);
    setTypingStage('thinking');
    setStreamingMessageId(null);
  }, [stopStreaming, stopRagStreaming, flushStreamContentUpdate, clearGenerationTimers]);

  // Abort any in-flight stream when this provider instance unmounts.
  useEffect(() => {
    return () => {
      stopStreaming();
      clearGenerationTimers();
      if (streamFlushTimerRef.current !== null) {
        clearTimeout(streamFlushTimerRef.current);
        streamFlushTimerRef.current = null;
      }
      streamPendingRef.current = null;
    };
  }, [stopStreaming, clearGenerationTimers]);

  // ----------------------------------------------------------------------
  // Hydration (offline cache) + server sync
  // ----------------------------------------------------------------------

  const syncFromServer = useCallback(async () => {
    let rows: ConversationRow[] | null = null;
    try {
      rows = await conversationsService.fetchConversations();
    } catch {
      // Offline or transient failure: keep showing the cached snapshot.
    }
    setConversations((prev) => {
      if (!rows) {
        return prev.length > 0 ? prev : [createDraftConversation()];
      }
      const prevById = new Map(prev.map((c) => [c.id, c]));
      const emptyDrafts = prev.filter((c) => isDraftId(c.id) && c.messages.length === 0);
      const drafts = emptyDrafts.length > 0 ? [emptyDrafts[0]] : [createDraftConversation()];
      const serverIds = new Set(rows.map((row) => row.id));
      // Keep conversations created locally that are not on the server yet (first message in flight).
      const pendingLocal = prev.filter(
        (c) => !isDraftId(c.id) && !serverIds.has(c.id) && c.messages.length > 0,
      );
      return [
        ...drafts,
        ...pendingLocal,
        ...rows.map((row) => conversationFromRow(row, prevById.get(row.id))),
      ];
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    if (isOfflineDev) {
      void (async () => {
        let cached: Conversation[] = [];
        try {
          const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${userId}`);
          if (raw) {
            const parsed = JSON.parse(raw) as {
              conversations: Conversation[];
              activeConversationId: string | null;
            };
            if (Array.isArray(parsed.conversations)) {
              cached = parsed.conversations;
            }
          }
        } catch {
          // Fall through to a fresh local conversation.
        }
        if (!cancelled) {
          const { conversations: next, draftId } = conversationsWithFreshDraft(cached);
          setConversations(next);
          setRequestedConversationId(draftId);
          setHydrated(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      let cached: Conversation[] = [];
      try {
        const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${userId}`);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            conversations: Conversation[];
            activeConversationId: string | null;
          };
          if (Array.isArray(parsed.conversations)) {
            cached = parsed.conversations;
          }
        }
      } catch {
        // Corrupt cache: server sync below is the source of truth.
      }
      if (!cancelled) {
        const { conversations: next, draftId } = conversationsWithFreshDraft(cached);
        setConversations(next);
        setRequestedConversationId(draftId);
        setHydrated(true);
        await syncFromServer();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, isOfflineDev, syncFromServer]);

  // Debounced offline-cache persistence.
  useEffect(() => {
    if (!hydrated || !userId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const snapshot = {
        conversations: conversations.map((c) => ({ ...c, messagesLoaded: false })),
        activeConversationId,
      };
      AsyncStorage.setItem(`${CACHE_PREFIX}${userId}`, JSON.stringify(snapshot)).catch(
        () => {},
      );
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [conversations, activeConversationId, hydrated, userId]);

  const activeConversationMessagesLoaded = activeConversation?.messagesLoaded ?? false;

  // Lazily fetch messages when a conversation becomes active.
  useEffect(() => {
    if (
      !activeConversationId ||
      activeConversationMessagesLoaded ||
      isDraftId(activeConversationId) ||
      loadingMessagesRef.current.has(activeConversationId)
    ) {
      return;
    }
    const id = activeConversationId;
    loadingMessagesRef.current.add(id);
    messagesService
      .fetchMessages(id)
      .then((rows) => {
        updateConversation(id, (current) => ({
          ...current,
          messages: rows.map((row) => messageFromRow(row, current.subject)),
          messagesLoaded: true,
        }));
      })
      .catch(() => {
        // Offline: keep the cached copy.
      })
      .finally(() => {
        loadingMessagesRef.current.delete(id);
      });
  }, [activeConversationId, activeConversationMessagesLoaded, updateConversation]);

  // ----------------------------------------------------------------------
  // Realtime: new messages from other devices / the Edge Function
  // ----------------------------------------------------------------------

  const handleRealtimeInsert = useCallback((row: MessageRow) => {
    // While we're generating, the local stream is the source of truth and the
    // done event reconciles ids; skip to avoid duplicating the reply.
    if (isGeneratingRef.current || busyRef.current) return;
    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== row.conversation_id) return conversation;
        if (conversation.messages.some((m) => m.id === row.id)) return conversation;
        return {
          ...conversation,
          messages: [...conversation.messages, messageFromRow(row, conversation.subject)],
          updatedAt: Date.parse(row.created_at),
        };
      }),
    );
  }, []);

  useRealtimeMessages(isOfflineDev ? null : activeConversationId, handleRealtimeInsert);

  // ----------------------------------------------------------------------
  // Generation
  // ----------------------------------------------------------------------

  const runGeneration = useCallback(
    async (
      conversationId: string,
      seedText?: string,
      subject?: string,
      mindMap?: boolean,
      codingMode?: string,
      tutorMode?: string,
      tutorLevel?: string,
      learningLevel?: string,
      mathMode?: string,
      biologyMode?: string,
      physicsMode?: string,
      chemistryMode?: string,
      geographyMode?: string,
      historyMode?: string,
      englishMode?: string,
      dzongkhaMode?: string,
      treeVizMode?: string,
      presentation?: boolean,
      accessToken?: string,
    ) => {
      if (isOfflineDev) {
        const conversation = conversationsRef.current.find((c) => c.id === conversationId);
        const prompt =
          seedText ??
          [...(conversation?.messages ?? [])]
            .reverse()
            .find((message) => message.role === 'user')?.content ??
          '';

        const controller = new AbortController();
        mockAbortRef.current = controller;
        mockCancelRef.current = runMockGeneration(
          prompt,
          {
            onTypingStart: () => {
              setIsTyping(true);
              setTypingStage('thinking');
            },
            onTypingStage: setTypingStage,
            onStreamStart: (assistantId) => {
              lastFlushedStreamRef.current = null;
              setIsTyping(false);
              setStreamingMessageId(assistantId);
              appendMessage(conversationId, {
                id: assistantId,
                role: 'assistant',
                content: '',
                mindMap: mindMap === true ? true : undefined,
                websitePreview: isHtmlPreviewMode(
                  codingMode,
                  biologyMode,
                  physicsMode,
                  chemistryMode,
                  geographyMode,
                  historyMode,
                  englishMode,
                  dzongkhaMode,
                )
                  ? true
                  : undefined,
                biologyAnatomy: isAnatomyMode(biologyMode) ? true : undefined,
                biologyDiagram: isBiologyDiagramMode(biologyMode) ? true : undefined,
                scienceGraph: isScienceGraphMode(
                  biologyMode,
                  physicsMode,
                  chemistryMode,
                  geographyMode,
                )
                  ? true
                  : undefined,
                treeViz: treeVizMode ? true : undefined,
                physicsField: isPhysicsFieldMode(physicsMode) ? true : undefined,
                chemistryMolecule: isChemistryMoleculeMode(chemistryMode) ? true : undefined,
                flashcards: tutorMode === 'cards' ? true : undefined,
                quiz: tutorMode === 'test' ? true : undefined,
                tutorHint: tutorMode === 'hint' ? true : undefined,
                tutorCoach: tutorMode === 'no_answer' ? true : undefined,
                tutorLesson: tutorMode === 'teach' ? true : undefined,
                tutorSolve: tutorMode === 'solution' || mathMode === 'solve' ? true : undefined,
                tutorPlan: tutorMode === 'plan' ? true : undefined,
                presentation: presentation ? true : undefined,
                createdAt: Date.now(),
              });
            },
            onStreamDelta: (assistantId, content) => {
              queueStreamContentUpdate(conversationId, assistantId, content);
            },
            onStreamEnd: () => {
              setStreamingMessageId(null);
              mockCancelRef.current = null;
              mockAbortRef.current = null;
            },
            onError: (message) => showError(message),
          },
          controller.signal,
          mindMap,
          presentation,
        );
        return;
      }

      setIsTyping(true);
      setTypingStage('thinking');
      clearGenerationTimers();
      timersRef.current = TYPING_STAGE_DELAYS.slice(1).map(({ stage, at }) =>
        setTimeout(() => setTypingStage(stage), at),
      );

      const assistantTempId = `temp-${createId()}`;
      let assistantCreated = false;

      try {
        const result = await streamReply({
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
          onDelta: (fullText) => {
            if (!assistantCreated) {
              assistantCreated = true;
              lastFlushedStreamRef.current = null;
              clearGenerationTimers();
              setIsTyping(false);
              setTypingStage('thinking');
              setStreamingMessageId(assistantTempId);
              appendMessage(conversationId, {
                id: assistantTempId,
                role: 'assistant',
                content: fullText,
                mindMap: mindMap === true ? true : undefined,
                websitePreview: isHtmlPreviewMode(
                  codingMode,
                  biologyMode,
                  physicsMode,
                  chemistryMode,
                  geographyMode,
                  historyMode,
                  englishMode,
                  dzongkhaMode,
                )
                  ? true
                  : undefined,
                biologyAnatomy: isAnatomyMode(biologyMode) ? true : undefined,
                biologyDiagram: isBiologyDiagramMode(biologyMode) ? true : undefined,
                scienceGraph: isScienceGraphMode(
                  biologyMode,
                  physicsMode,
                  chemistryMode,
                  geographyMode,
                )
                  ? true
                  : undefined,
                treeViz: treeVizMode ? true : undefined,
                physicsField: isPhysicsFieldMode(physicsMode) ? true : undefined,
                chemistryMolecule: isChemistryMoleculeMode(chemistryMode) ? true : undefined,
                flashcards: tutorMode === 'cards' ? true : undefined,
                quiz: tutorMode === 'test' ? true : undefined,
                tutorHint: tutorMode === 'hint' ? true : undefined,
                tutorCoach: tutorMode === 'no_answer' ? true : undefined,
                tutorLesson: tutorMode === 'teach' ? true : undefined,
                tutorSolve: tutorMode === 'solution' || mathMode === 'solve' ? true : undefined,
                tutorPlan: tutorMode === 'plan' ? true : undefined,
                presentation: presentation ? true : undefined,
                createdAt: Date.now(),
              });
            } else {
              queueStreamContentUpdate(conversationId, assistantTempId, fullText);
            }
          },
        });

        if (assistantCreated && result.messageId) {
          reconcileMessageId(conversationId, assistantTempId, result.messageId);
        }
        // When aborted, the partial text stays visible locally; it is not
        // persisted server-side, so it disappears on the next full reload.
      } catch (error) {
        if (assistantCreated) removeMessage(conversationId, assistantTempId);
        showError(error instanceof Error ? error.message : 'The AI response failed.');
      } finally {
        flushStreamContentUpdate();
        clearGenerationTimers();
        setIsTyping(false);
        setTypingStage('thinking');
        setStreamingMessageId(null);
      }
    },
    [
      isOfflineDev,
      appendMessage,
      clearGenerationTimers,
      reconcileMessageId,
      removeMessage,
      queueStreamContentUpdate,
      flushStreamContentUpdate,
      streamReply,
    ],
  );

  const runRagGeneration = useCallback(
    async (
      conversationId: string,
      subject?: string,
      accessToken?: string,
      recovery?: RagRecoveryContext,
      learningLevel?: string,
    ) => {
      if (isOfflineDev) {
        showError(
          'Dzongkha library mode requires a connected Supabase account. Confirm your test email in Supabase (see supabase/migrations/0002_confirm_test_users.sql) and sign in again.',
        );
        return;
      }
      if (isDraftId(conversationId)) {
        showError('Still starting a new chat — please try sending again.');
        return;
      }

      let activeId = conversationId;
      const ready = await ensureConversationReady(activeId);
      if (!ready) {
        throw new Error('Could not verify this chat was saved. Please try again.');
      }

      setIsTyping(true);
      setTypingStage('thinking');
      clearGenerationTimers();
      timersRef.current = TYPING_STAGE_DELAYS.slice(1).map(({ stage, at }) =>
        setTimeout(() => setTypingStage(stage), at),
      );

      const assistantTempId = `temp-${createId()}`;
      let assistantCreated = false;

      const documentIds = ragDocumentIdsMap[activeId] ?? undefined;

      const streamOnce = async (targetId: string) => {
        return streamRagReply({
          conversationId: targetId,
          subject,
          learningLevel,
          documentIds: documentIds && documentIds.length > 0 ? documentIds : undefined,
          accessToken,
          onStage: (stage) => {
            clearGenerationTimers();
            setIsTyping(true);
            setTypingStage(stage);
          },
          onDelta: (fullText) => {
            if (!assistantCreated) {
              assistantCreated = true;
              lastFlushedStreamRef.current = null;
              clearGenerationTimers();
              setIsTyping(false);
              setTypingStage('thinking');
              setStreamingMessageId(assistantTempId);
              appendMessage(targetId, {
                id: assistantTempId,
                role: 'assistant',
                content: fullText,
                createdAt: Date.now(),
              });
            } else {
              queueStreamContentUpdate(targetId, assistantTempId, fullText);
            }
          },
        });
      };

      try {
        let result: Awaited<ReturnType<typeof streamRagReply>>;
        try {
          result = await streamOnce(activeId);
        } catch (firstError) {
          if (!recovery || !isConversationNotFoundError(firstError)) {
            throw firstError;
          }
          const row = await conversationsService.createConversation(recovery.userId, recovery.title);
          activeId = row.id;
          recovery.onPromoted(activeId);
          await messagesService.insertUserMessage(
            activeId,
            recovery.userId,
            recovery.messageText,
            recovery.attachments,
          );
          const retryReady = await ensureConversationReady(activeId);
          if (!retryReady) {
            throw new Error('Could not start a new chat. Please sign out and sign in again.');
          }
          assistantCreated = false;
          result = await streamOnce(activeId);
        }

        const finalId = result.messageId ?? assistantTempId;
        if (assistantCreated && result.messageId) {
          reconcileMessageId(activeId, assistantTempId, result.messageId);
        }
        if (assistantCreated && result.sources.length > 0) {
          setMessageSources(activeId, finalId, result.sources);
        }
      } catch (error) {
        if (assistantCreated) removeMessage(activeId, assistantTempId);
        showError(error instanceof Error ? error.message : 'The document response failed.');
      } finally {
        flushStreamContentUpdate();
        clearGenerationTimers();
        setIsTyping(false);
        setTypingStage('thinking');
        setStreamingMessageId(null);
      }
    },
    [
      isOfflineDev,
      ragDocumentIdsMap,
      appendMessage,
      clearGenerationTimers,
      reconcileMessageId,
      removeMessage,
      queueStreamContentUpdate,
      flushStreamContentUpdate,
      setMessageSources,
      streamRagReply,
    ],
  );

  const setRagDocumentScope = useCallback(
    async (documentIds: string[] | null) => {
      const conversationId = activeConversationId;
      if (!conversationId || isDraftId(conversationId)) return;
      setRagDocumentIdsMap((prev) => ({ ...prev, [conversationId]: documentIds }));
      try {
        await updateRagDocumentIds(conversationId, documentIds);
      } catch {
        // Non-fatal: in-memory value is already updated; will sync next load.
      }
    },
    [activeConversationId],
  );

  const sendMessage = useCallback(
    async (payload: SendMessagePayload) => {
      const trimmed = payload.text.trim();
      const pending = payload.rag ? [] : (payload.attachments ?? []);
      const hasContent = payload.rag ? trimmed.length > 0 : trimmed.length > 0 || pending.length > 0;
      if (!hasContent || !userId || busyRef.current || isGeneratingRef.current) {
        return;
      }
      const conversationId = activeConversationId;
      if (!conversationId) return;
      const conversation = conversationsRef.current.find((c) => c.id === conversationId);
      if (!conversation) return;

      busyRef.current = true;

      const optimisticAttachments: MessageAttachment[] = pending.map((item) => ({
        path: item.localUri,
        mimeType: item.mimeType,
        name: item.name,
        size: item.size,
        localUri: item.localUri,
      }));

      const tempUserId = `temp-${createId()}`;
      appendMessage(conversationId, {
        id: tempUserId,
        role: 'user',
        content: trimmed,
        createdAt: Date.now(),
        attachments: optimisticAttachments.length > 0 ? optimisticAttachments : undefined,
      });
      if (conversation.messages.length === 0) {
        updateConversation(conversationId, (c) => ({
          ...c,
          title: makeTitle(trimmed, pending),
          ...(payload.subject ? { subject: payload.subject } : {}),
        }));
      } else if (payload.subject) {
        updateConversation(conversationId, (c) => ({
          ...c,
          subject: payload.subject,
        }));
      }

      const generationSeed = promptFromPayload(trimmed, pending);

      if (isOfflineDev) {
        try {
          if (payload.rag || payload.subject === 'dzongkha') {
            showError(
              'Dzongkha library mode requires a connected Supabase account. Confirm your test email in Supabase (see supabase/migrations/0002_confirm_test_users.sql) and sign in again.',
            );
          } else {
            await runGeneration(
              conversationId,
              generationSeed,
              payload.subject,
              payload.treeVizMode ? false : payload.mindMap,
              payload.codingMode,
              payload.tutorMode,
              payload.tutorLevel,
              payload.learningLevel,
              payload.mathMode,
              payload.biologyMode,
              payload.physicsMode,
              payload.chemistryMode,
              payload.geographyMode,
              payload.historyMode,
              payload.englishMode,
              payload.dzongkhaMode,
              payload.treeVizMode,
              payload.presentation,
            );
          }
        } finally {
          busyRef.current = false;
        }
        return;
      }

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (authError || !authUser || !session?.access_token) {
        showError('Your session expired. Please sign in again.');
        busyRef.current = false;
        setIsTyping(false);
        setTypingStage('thinking');
        return;
      }
      const authenticatedUserId = authUser.id;
      const accessToken = session.access_token;

      setIsTyping(true);
      setTypingStage('thinking');

      try {
        let realId = conversationId;
        let uploadedAttachments: MessageAttachment[] = [];

        if (pending.length > 0) {
          uploadedAttachments = await Promise.all(
            pending.map((item) =>
              attachmentsService.uploadAttachment(authenticatedUserId, item.localUri, item.mimeType, item.name),
            ),
          );
        }

        // Long uploads can leave the JWT near expiry; refresh before RLS-checked inserts.
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshed.session?.user?.id) {
          const {
            data: { session: fallbackSession },
          } = await supabase.auth.getSession();
          if (!fallbackSession?.user?.id) {
            throw new Error('Your session expired. Please sign in again.');
          }
        }
        const {
          data: { user: sendUser },
        } = await supabase.auth.getUser();
        if (!sendUser?.id) {
          throw new Error('Your session expired. Please sign in again.');
        }
        const sendUserId = sendUser.id;

        const sendTitle = makeTitle(trimmed, pending);

        if (isDraftId(conversationId)) {
          const row = await conversationsService.createConversation(sendUserId, sendTitle);
          realId = row.id;
          setConversations((prev) =>
            prev.map((c) =>
              c.id === conversationId
                ? {
                    ...c,
                    id: row.id,
                    title: row.title,
                    createdAt: Date.parse(row.created_at),
                    updatedAt: Date.parse(row.updated_at),
                    messagesLoaded: true,
                  }
                : c,
            ),
          );
          setRequestedConversationId(row.id);
        } else {
          // Orphaned local conversation IDs fail messages RLS (conversation not owned / missing).
          const ensured = await conversationsService.ensureOwnedConversation(
            conversationId,
            sendUserId,
            sendTitle,
          );
          realId = ensured.id;
          if (ensured.created) {
            setConversations((prev) =>
              prev.map((c) =>
                c.id === conversationId
                  ? { ...c, id: realId, title: sendTitle, messagesLoaded: true }
                  : c,
              ),
            );
            setRequestedConversationId(realId);
          } else if (conversation.messages.length === 0) {
            void conversationsService.renameConversation(realId, sendTitle).catch(() => {});
          }
        }

        if (uploadedAttachments.length > 0) {
          updateConversation(realId, (current) => ({
            ...current,
            messages: current.messages.map((message) =>
              message.id === tempUserId
                ? { ...message, attachments: uploadedAttachments }
                : message,
            ),
          }));
        }

        const row = await messagesService.insertUserMessage(
          realId,
          sendUserId,
          payload.presentation ? withPresentationModeInstructions(trimmed) : trimmed,
          uploadedAttachments,
        );
        reconcileMessageId(realId, tempUserId, row.id);

        if (payload.subject) {
          lastSubjectByConversationRef.current[realId] = payload.subject;
        } else if (!payload.rag) {
          delete lastSubjectByConversationRef.current[realId];
        }

        if (payload.rag) {
          lastRagByConversationRef.current[realId] = true;
        } else {
          delete lastRagByConversationRef.current[realId];
        }

        const codingSubject =
          payload.subject === 'coding' || lastSubjectByConversationRef.current[realId] === 'coding';

        if (payload.codingMode) {
          lastCodingModeByConversationRef.current[realId] = payload.codingMode;
        } else {
          delete lastCodingModeByConversationRef.current[realId];
        }

        if (payload.tutorMode) {
          lastTutorModeByConversationRef.current[realId] = payload.tutorMode;
        } else {
          delete lastTutorModeByConversationRef.current[realId];
        }

        if (payload.tutorLevel) {
          lastTutorLevelByConversationRef.current[realId] = payload.tutorLevel;
        } else {
          delete lastTutorLevelByConversationRef.current[realId];
        }

        if (payload.learningLevel) {
          lastLearningLevelByConversationRef.current[realId] = payload.learningLevel;
        } else {
          delete lastLearningLevelByConversationRef.current[realId];
        }

        if (payload.mathMode) {
          lastMathModeByConversationRef.current[realId] = payload.mathMode;
        } else {
          delete lastMathModeByConversationRef.current[realId];
        }

        if (payload.biologyMode) {
          lastBiologyModeByConversationRef.current[realId] = payload.biologyMode;
        } else {
          delete lastBiologyModeByConversationRef.current[realId];
        }

        if (payload.physicsMode) {
          lastPhysicsModeByConversationRef.current[realId] = payload.physicsMode;
        } else {
          delete lastPhysicsModeByConversationRef.current[realId];
        }

        if (payload.chemistryMode) {
          lastChemistryModeByConversationRef.current[realId] = payload.chemistryMode;
        } else {
          delete lastChemistryModeByConversationRef.current[realId];
        }

        if (payload.geographyMode) {
          lastGeographyModeByConversationRef.current[realId] = payload.geographyMode;
        } else {
          delete lastGeographyModeByConversationRef.current[realId];
        }

        if (payload.historyMode) {
          lastHistoryModeByConversationRef.current[realId] = payload.historyMode;
        } else {
          delete lastHistoryModeByConversationRef.current[realId];
        }

        if (payload.englishMode) {
          lastEnglishModeByConversationRef.current[realId] = payload.englishMode;
        } else {
          delete lastEnglishModeByConversationRef.current[realId];
        }

        if (payload.dzongkhaMode) {
          lastDzongkhaModeByConversationRef.current[realId] = payload.dzongkhaMode;
        } else {
          delete lastDzongkhaModeByConversationRef.current[realId];
        }

        if (payload.treeVizMode) {
          lastTreeVizModeByConversationRef.current[realId] = payload.treeVizMode;
        } else {
          delete lastTreeVizModeByConversationRef.current[realId];
        }

        if (
          payload.mindMap &&
          !codingSubject &&
          !payload.biologyMode &&
          !payload.physicsMode &&
          !payload.chemistryMode &&
          !payload.geographyMode &&
          !payload.historyMode &&
          !payload.englishMode &&
          !payload.dzongkhaMode &&
          !payload.treeVizMode
        ) {
          lastMindMapByConversationRef.current[realId] = true;
        } else {
          delete lastMindMapByConversationRef.current[realId];
        }

        if (isDraftId(realId)) {
          throw new Error('Could not save this chat. Please try again.');
        }

        const ragRecovery: RagRecoveryContext | undefined = payload.rag
          ? {
              userId: sendUserId,
              messageText: trimmed,
              attachments: uploadedAttachments,
              title: makeTitle(trimmed, pending),
              onPromoted: (newId) => {
                realId = newId;
                setConversations((prev) => {
                  const existing = prev.find((c) => c.id === conversationId || c.id === newId);
                  if (existing) {
                    return prev.map((c) =>
                      c.id === conversationId || c.id === newId
                        ? { ...c, id: newId, messagesLoaded: true }
                        : c,
                    );
                  }
                  return [
                    {
                      id: newId,
                      title: makeTitle(trimmed, pending),
                      messages: conversationsRef.current.find((c) => c.id === conversationId)?.messages ?? [],
                      createdAt: Date.now(),
                      updatedAt: Date.now(),
                      messagesLoaded: true,
                    },
                    ...prev.filter((c) => c.id !== conversationId),
                  ];
                });
                setRequestedConversationId(newId);
              },
            }
          : undefined;

        // Prefer refreshed token for the edge call after a long upload.
        const {
          data: { session: sendSession },
        } = await supabase.auth.getSession();
        const streamToken = sendSession?.access_token ?? accessToken;

        if (payload.rag) {
          await runRagGeneration(
            realId,
            payload.subject,
            streamToken,
            ragRecovery,
            payload.learningLevel,
          );
        } else {
          await runGeneration(
            realId,
            undefined,
            payload.subject,
            codingSubject ||
              payload.biologyMode ||
              payload.physicsMode ||
              payload.chemistryMode ||
              payload.geographyMode ||
              payload.historyMode ||
              payload.englishMode ||
              (payload.dzongkhaMode && payload.dzongkhaMode !== 'library') ||
              payload.treeVizMode ||
              payload.presentation
              ? false
              : payload.mindMap,
            payload.codingMode,
            payload.tutorMode,
            payload.tutorLevel,
            payload.learningLevel,
            payload.mathMode,
            // When presentation mode is on, suppress lab generate modes so the
            // Edge Function produces slide JSON instead of subject diagrams.
            payload.presentation ? undefined : payload.biologyMode,
            payload.presentation ? undefined : payload.physicsMode,
            payload.presentation ? undefined : payload.chemistryMode,
            payload.presentation ? undefined : payload.geographyMode,
            payload.presentation ? undefined : payload.historyMode,
            payload.presentation ? undefined : payload.englishMode,
            payload.presentation ? undefined : payload.dzongkhaMode,
            payload.treeVizMode,
            payload.presentation,
            streamToken,
          );
        }
      } catch (error) {
        clearGenerationTimers();
        setIsTyping(false);
        setTypingStage('thinking');
        showError(error instanceof Error ? error.message : 'Could not send your message.');
      } finally {
        busyRef.current = false;
      }
    },
    [
      userId,
      isOfflineDev,
      activeConversationId,
      appendMessage,
      updateConversation,
      reconcileMessageId,
      runGeneration,
      runRagGeneration,
      clearGenerationTimers,
    ],
  );

  const regenerateLastReply = useCallback(() => {
    if (!userId || busyRef.current || isGeneratingRef.current) return;
    const conversationId = activeConversationId;
    if (!conversationId || isDraftId(conversationId)) return;
    const conversation = conversationsRef.current.find((c) => c.id === conversationId);
    if (!conversation) return;

    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'assistant') return;

    busyRef.current = true;
    void (async () => {
      try {
        removeMessage(conversationId, lastMessage.id);
        if (!isOfflineDev && !lastMessage.id.startsWith('temp-')) {
          await messagesService.deleteMessage(lastMessage.id);
        }
        const { accessToken } = isOfflineDev
          ? { accessToken: undefined }
          : await resolveAuthForSend();
        if (lastRagByConversationRef.current[conversationId]) {
          await runRagGeneration(
            conversationId,
            lastSubjectByConversationRef.current[conversationId],
            accessToken,
            undefined,
            lastLearningLevelByConversationRef.current[conversationId],
          );
        } else {
          await runGeneration(
            conversationId,
            undefined,
            lastSubjectByConversationRef.current[conversationId],
            lastMindMapByConversationRef.current[conversationId],
            lastCodingModeByConversationRef.current[conversationId],
            lastTutorModeByConversationRef.current[conversationId],
            lastTutorLevelByConversationRef.current[conversationId],
            lastLearningLevelByConversationRef.current[conversationId],
            lastMathModeByConversationRef.current[conversationId],
            lastBiologyModeByConversationRef.current[conversationId],
            lastPhysicsModeByConversationRef.current[conversationId],
            lastChemistryModeByConversationRef.current[conversationId],
            lastGeographyModeByConversationRef.current[conversationId],
            lastHistoryModeByConversationRef.current[conversationId],
            lastEnglishModeByConversationRef.current[conversationId],
            lastDzongkhaModeByConversationRef.current[conversationId],
            lastTreeVizModeByConversationRef.current[conversationId],
            undefined, // presentation — regenerate never re-triggers slide mode
            accessToken,
          );
        }
      } catch (error) {
        showError(
          error instanceof Error ? error.message : 'Could not regenerate the reply.',
        );
      } finally {
        busyRef.current = false;
      }
    })();
  }, [userId, isOfflineDev, activeConversationId, removeMessage, runGeneration, runRagGeneration]);

  // ----------------------------------------------------------------------
  // Conversation management
  // ----------------------------------------------------------------------

  const setActiveConversation = useCallback(
    (id: string) => {
      stopGenerating();
      setRequestedConversationId(id);
      // Lazily load document scope for real conversations.
      if (!isDraftId(id) && !isOfflineDev) {
        fetchRagDocumentIds(id).then((ids) => {
          setRagDocumentIdsMap((prev) => ({ ...prev, [id]: ids }));
        }).catch(() => {});
      }
    },
    [stopGenerating, isOfflineDev],
  );

  const createConversation = useCallback(() => {
    stopGenerating();
    // Reuse an existing empty draft instead of stacking new ones.
    const existingDraft = conversationsRef.current.find(
      (c) => isDraftId(c.id) && c.messages.length === 0,
    );
    if (existingDraft) {
      setRequestedConversationId(existingDraft.id);
      return;
    }
    const fresh = createDraftConversation();
    setConversations((prev) => [fresh, ...prev]);
    setRequestedConversationId(fresh.id);
  }, [stopGenerating]);

  const deleteConversation = useCallback(
    (id: string) => {
      stopGenerating();
      setConversations((prev) => {
        const remaining = prev.filter((conversation) => conversation.id !== id);
        return remaining.length === 0 ? [createDraftConversation()] : remaining;
      });
      // Falls back to the most recent conversation via the derived active id.
      setRequestedConversationId((current) => (current === id ? null : current));
      if (!isOfflineDev && !isDraftId(id)) {
        conversationsService.deleteConversation(id).catch(() => {
          showError('Could not delete the conversation on the server.');
        });
      }
    },
    [stopGenerating, isOfflineDev],
  );

  const clearAllConversations = useCallback(() => {
    stopGenerating();
    const fresh = createDraftConversation();
    setConversations([fresh]);
    setRequestedConversationId(fresh.id);
    if (userId && !isOfflineDev) {
      conversationsService.deleteAllConversations(userId).catch(() => {
        showError('Could not clear conversations on the server.');
      });
    }
  }, [stopGenerating, userId, isOfflineDev]);

  const activeRagDocumentIds = activeConversationId
    ? (ragDocumentIdsMap[activeConversationId] ?? null)
    : null;

  const value = useMemo<ChatContextValue>(
    () => ({
      conversations,
      activeConversation,
      activeConversationId,
      isTyping,
      typingStage,
      streamingMessageId,
      isGenerating: isTyping || streamingMessageId !== null,
      activeRagDocumentIds,
      setActiveConversation,
      createConversation,
      deleteConversation,
      clearAllConversations,
      sendMessage,
      regenerateLastReply,
      stopGenerating,
      setRagDocumentScope,
    }),
    [
      conversations,
      activeConversation,
      activeConversationId,
      isTyping,
      typingStage,
      streamingMessageId,
      activeRagDocumentIds,
      setActiveConversation,
      createConversation,
      deleteConversation,
      clearAllConversations,
      sendMessage,
      regenerateLastReply,
      stopGenerating,
      setRagDocumentScope,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
