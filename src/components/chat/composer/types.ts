import type { Ref } from 'react';

import type { PendingAttachment, SendMessagePayload, Subject } from '@/types/chat';

export type ComposerStateProps = {
  conversationId: string | null;
  onSend: (payload: SendMessagePayload) => void | Promise<void>;
  onStop: () => void;
  isGenerating: boolean;
  /** When set, subject is fixed (subject screen) and not toggled by the user. */
  fixedSubject?: Subject;
};

export type MathComposerHandle = {
  focus: () => void;
  insertLatex: (snippet: string) => void;
  jumpNextPlaceholder: () => void;
  deleteBackward: () => void;
};

export type ComposerVariantProps = {
  text: string;
  setText: (text: string) => void;
  inputPlaceholder: string;
  attachments: PendingAttachment[];
  onRemoveAttachment: (id: string) => void;
  onOpenAttachmentSheet: () => void;
  onAppendTranscript: (transcript: string) => void;
  hint: string | null;
  setHint: (hint: string) => void;
  isGenerating: boolean;
  isSending: boolean;
  canSend: boolean;
  onSend: () => void;
  onStop: () => void;
  onPrimaryPress: () => void;
  /** Used by the Math equation panel to insert at the caret. */
  selection?: { start: number; end: number };
  onSelectionChange?: (selection: { start: number; end: number }) => void;
  /** When true, the Math workspace shows an editable rendered equation. */
  equationVisual?: boolean;
  equationDisplayMode?: boolean;
  equationInputRef?: Ref<MathComposerHandle>;
};
