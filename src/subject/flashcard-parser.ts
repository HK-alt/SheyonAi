export type TutorFlashcard = {
  front: string;
  back: string;
};

export type ParsedTutorFlashcards = {
  topic: string;
  introText: string;
  cards: TutorFlashcard[];
};

const JSON_FENCE_RE = /```json[^\n]*\n([\s\S]*?)```/i;

function extractJsonFence(content: string): { body: string; start: number } | null {
  const match = JSON_FENCE_RE.exec(content);
  if (!match) return null;
  return { body: match[1] ?? '', start: match.index };
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseCard(raw: unknown): TutorFlashcard | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const front = asTrimmedString(record.front);
  const back = asTrimmedString(record.back);
  if (!front || !back) return null;
  return { front, back };
}

/** Extract a Cards-mode JSON deck from assistant markdown. */
export function tryParseTutorFlashcards(content: string): ParsedTutorFlashcards | null {
  if (!content.trim()) return null;
  const fence = extractJsonFence(content);
  if (!fence) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(fence.body);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const record = parsed as Record<string, unknown>;
  const rawCards = Array.isArray(record.cards) ? record.cards : null;
  if (!rawCards) return null;

  const cards = rawCards.map(parseCard).filter((card): card is TutorFlashcard => card !== null);
  if (cards.length < 1) return null;

  const topic = asTrimmedString(record.topic) ?? 'Flashcards';
  const introText = content.slice(0, fence.start).trim();
  return { topic, introText, cards: cards.slice(0, 20) };
}

/** True when a Cards-mode reply is still being streamed. */
export function isTutorFlashcardsPending(content: string, isStreaming: boolean): boolean {
  if (!isStreaming) return false;
  if (tryParseTutorFlashcards(content)) return false;
  const openJsonFence = /```json[^\n]*\n[\s\S]*$/i.test(content);
  return openJsonFence && !/```json[^\n]*\n[\s\S]*```/i.test(content);
}
