import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { ComposerStateProps } from '@/components/chat/composer/types';
import type { PendingAttachment, SendMessagePayload, Subject } from '@/types/chat';

const DRAFTS_KEY = 'sheyonai.composerDrafts.v1';
const DRAFT_SAVE_MS = 300;

type StoredDraft = {
  text: string;
  attachments: PendingAttachment[];
  subject?: Subject | null;
};

function createAttachmentId() {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function loadAllDrafts(): Promise<Record<string, StoredDraft>> {
  try {
    const raw = await AsyncStorage.getItem(DRAFTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StoredDraft>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function saveDraft(conversationId: string, draft: StoredDraft | null) {
  const all = await loadAllDrafts();
  if (!draft || (!draft.text.trim() && draft.attachments.length === 0)) {
    delete all[conversationId];
  } else {
    all[conversationId] = draft;
  }
  await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(all));
}

export function useComposerState({
  conversationId,
  onSend,
  onStop,
  isGenerating,
  fixedSubject,
}: ComposerStateProps) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeSubject = fixedSubject ?? null;

  const draftsRef = useRef<Record<string, StoredDraft>>({});
  const prevConversationIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canSend =
    (text.trim().length > 0 || attachments.length > 0) && !isGenerating && !isSending;

  const persistCurrentDraft = useCallback(
    async (
      id: string,
      draftText: string,
      draftAttachments: PendingAttachment[],
      draftSubject: Subject | null,
    ) => {
      await saveDraft(id, {
        text: draftText,
        attachments: draftAttachments,
        subject: draftSubject,
      });
      draftsRef.current[id] = {
        text: draftText,
        attachments: draftAttachments,
        subject: draftSubject,
      };
    },
    [],
  );

  useEffect(() => {
    void loadAllDrafts().then((drafts) => {
      draftsRef.current = drafts;
    });
  }, []);

  useEffect(() => {
    const prevId = prevConversationIdRef.current;
    if (prevId && prevId !== conversationId) {
      void persistCurrentDraft(prevId, text, attachments, activeSubject);
    }

    if (conversationId) {
      const draft = draftsRef.current[conversationId];
      setText(draft?.text ?? '');
      setAttachments(draft?.attachments ?? []);
    } else {
      setText('');
      setAttachments([]);
    }

    prevConversationIdRef.current = conversationId;
    // Only run when conversation changes, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persistCurrentDraft(conversationId, text, attachments, activeSubject);
    }, DRAFT_SAVE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [conversationId, text, attachments, activeSubject, persistCurrentDraft]);

  const showHint = useCallback((message: string) => {
    setHint(message);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHint(null), 1500);
  }, []);

  const addAttachment = useCallback((attachment: Omit<PendingAttachment, 'id'>) => {
    setAttachments((prev) => [...prev, { ...attachment, id: createAttachmentId() }]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const onAppendTranscript = useCallback((transcript: string) => {
    const trimmed = transcript.trim();
    if (!trimmed) return;
    setText((prev) => (prev.trim() ? `${prev.trimEnd()} ${trimmed}` : trimmed));
  }, []);

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    const payload: SendMessagePayload = {
      text: text.trim(),
      attachments: attachments.length > 0 ? attachments : undefined,
      subject: activeSubject ?? undefined,
    };
    setIsSending(true);
    try {
      await onSend(payload);
      setText('');
      setAttachments([]);
      if (conversationId) {
        void saveDraft(conversationId, null);
        delete draftsRef.current[conversationId];
      }
    } finally {
      setIsSending(false);
    }
  }, [canSend, text, attachments, activeSubject, onSend, conversationId]);

  const handlePrimaryPress = useCallback(() => {
    if (isGenerating) {
      onStop();
      return;
    }
    void handleSend();
  }, [isGenerating, onStop, handleSend]);

  return {
    text,
    setText,
    activeSubject,
    attachments,
    addAttachment,
    removeAttachment,
    hint,
    setHint: showHint,
    isSending,
    canSend,
    sheetOpen,
    setSheetOpen,
    onAppendTranscript,
    handleSend,
    handlePrimaryPress,
  };
}
