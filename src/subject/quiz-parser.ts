export type TutorQuizQuestion = {
  prompt: string;
  choices: string[];
  /** 0-based index of the correct choice, when known. */
  answerIndex: number | null;
  /** Short-answer expected text, when there are no choices. */
  expected?: string;
};

export type ParsedTutorQuiz = {
  topic: string;
  introText: string;
  questions: TutorQuizQuestion[];
};

const JSON_FENCE_RE = /```json[^\n]*\n([\s\S]*?)```/i;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

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

function resolveAnswerIndex(raw: unknown, choices: string[]): number | null {
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 && raw < choices.length) {
    return raw;
  }
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  if (/^[A-Za-z]$/.test(text)) {
    const index = text.toUpperCase().charCodeAt(0) - 65;
    if (index >= 0 && index < choices.length) return index;
  }
  const asNumber = Number(text);
  if (Number.isInteger(asNumber) && asNumber >= 0 && asNumber < choices.length) {
    return asNumber;
  }
  const match = choices.findIndex((choice) => choice.trim().toLowerCase() === text.toLowerCase());
  return match >= 0 ? match : null;
}

function parseQuestion(raw: unknown): TutorQuizQuestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const prompt =
    asTrimmedString(record.prompt) ??
    asTrimmedString(record.question) ??
    asTrimmedString(record.q);
  if (!prompt) return null;

  const rawChoices = Array.isArray(record.choices)
    ? record.choices
    : Array.isArray(record.options)
      ? record.options
      : [];
  const choices = rawChoices
    .map((item) => asTrimmedString(item))
    .filter((item): item is string => item !== null)
    .slice(0, 6);

  const answerRaw = record.answer ?? record.correct ?? record.answerIndex;
  if (choices.length >= 2) {
    return {
      prompt,
      choices,
      answerIndex: resolveAnswerIndex(answerRaw, choices),
    };
  }

  const expected = asTrimmedString(answerRaw);
  return { prompt, choices: [], answerIndex: null, expected: expected ?? undefined };
}

/** Extract a Quiz-mode JSON paper from assistant markdown. */
export function tryParseTutorQuiz(content: string): ParsedTutorQuiz | null {
  if (!content.trim()) return null;
  const fence = extractJsonFence(content);
  if (!fence) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(fence.body);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const record = parsed as Record<string, unknown>;
  if (Array.isArray(record.cards)) return null;

  const rawQuestions = Array.isArray(record.questions)
    ? record.questions
    : Array.isArray(record.items)
      ? record.items
      : null;
  if (!rawQuestions) return null;

  const questions = rawQuestions
    .map(parseQuestion)
    .filter((item): item is TutorQuizQuestion => item !== null)
    .slice(0, 8);
  if (questions.length < 1) return null;

  return {
    topic: asTrimmedString(record.topic) ?? 'Quiz',
    introText: content.slice(0, fence.start).trim(),
    questions,
  };
}

export function isTutorQuizPending(content: string, isStreaming: boolean): boolean {
  if (!isStreaming) return false;
  if (tryParseTutorQuiz(content)) return false;
  const openJsonFence = /```json[^\n]*\n[\s\S]*$/i.test(content);
  return openJsonFence && !/```json[^\n]*\n[\s\S]*```/i.test(content);
}

export function formatQuizReview(
  quiz: ParsedTutorQuiz,
  responses: Array<{ choice?: number; text?: string }>,
  score: { correct: number; total: number },
): string {
  const lines = [
    `I completed the quiz on ${quiz.topic}. Local score: ${score.correct}/${score.total}.`,
    '',
  ];
  quiz.questions.forEach((question, index) => {
    const response = responses[index];
    let given = '—';
    if (question.choices.length > 0 && typeof response?.choice === 'number') {
      const letter = LETTERS[response.choice] ?? String(response.choice + 1);
      given = `${letter}. ${question.choices[response.choice] ?? ''}`.trim();
    } else if (response?.text?.trim()) {
      given = response.text.trim();
    }
    lines.push(`${index + 1}. ${question.prompt}`);
    lines.push(`My answer: ${given}`);
    lines.push('');
  });
  lines.push(
    'Please give ## Feedback: confirm the score, explain mistakes, and say what to review next.',
  );
  return lines.join('\n');
}

export { LETTERS as QUIZ_CHOICE_LETTERS };
