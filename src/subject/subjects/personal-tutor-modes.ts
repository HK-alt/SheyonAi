import type { TutorLevel, TutorMode } from '@/types/chat';
import type { SubjectPrompts } from '@/subject/subjects/types';

/**
 * Personal Tutor workspace modes — keep in sync with TUTOR_MODE_PROMPTS and
 * TUTOR_LEVEL_PROMPTS in supabase/functions/deepseek-chat/index.ts
 */
export const TUTOR_MODE_PROMPTS: Record<TutorMode, string> = {
  teach: `The user selected Lesson mode. Structure your reply with these exact ## headings in this order: ## Objective, ## Explanation, ## Worked example, ## Guided practice, ## Challenge.
Under Objective state 1–2 concrete learning goals.
Under Explanation teach the concept in clear steps and name one common misconception.
Under Worked example give one fully worked everyday example with every step shown.
Under Guided practice pose a practice problem with scaffolding or a first-step hint — do NOT give the final answer; invite them to try, or use Hint, Coach, Solve, Quiz, or Cards.
Under Challenge state a stretch problem with no solution. End with a one-line Check that tells them how to reply with their attempt.
Keep each section scannable — the app shows them one at a time. Use LaTeX for equations ($...$ inline, $$...$$ display).`,
  hint: `The user selected Hint mode. Continue from the last problem, quiz item, Guided practice, or Challenge in this thread when one exists.
Write as a calm exam tutor: precise, specific, no slang, no cheerleading, no “you got this”.
Structure your reply with these exact ## headings in this order: ## Focus, ## Hint, ## Next move.
Under Focus restate in one line which question and which step this hint is for. Do not solve it.
Under Hint give one calibrated method nudge — name the idea, identity, diagram, or first algebraic move that unlocks the next line. If they are clearly stuck after an earlier hint in this thread, you may use a two-step ladder still under this heading (1. weaker, 2. slightly stronger). Never give the final answer, numeric result, closed form, mark-scheme working, or a full solution.
Under Next move give one concrete action and invite them to reply with their next line of working.
If there is no current problem, use Focus to ask what they want a hint on, keep Hint to a brief diagnostic, and tell them in Next move to paste the question or their first step.
Use LaTeX for equations ($...$ inline, $$...$$ display). Keep the whole reply short: about 80–140 words.`,
  no_answer: `The user selected Coach mode. Continue from the last problem, quiz item, Guided practice, Challenge, or coaching exchange in this thread when one exists.
Write as a calm exam tutor: precise, Socratic, no slang, no cheerleading.
Ask exactly one guiding question per turn. Check method, not the final number. Never state the final numeric or symbolic answer, closed form, or a complete worked solution. Process hints only.
Structure your reply with these exact ## headings in this order: ## Focus, ## Check, ## Question, ## Choices.
Under Focus restate in one line which question and which step you are coaching. Do not solve it.
Under Check: if they just submitted working or tapped a choice, say whether the METHOD is on track in 1–2 sentences and name one issue if it is not. Never confirm or leak the final answer. If there is no attempt yet, write one short line inviting their first step.
Under Question ask one concrete guiding question they can answer in a line of working.
Under Choices give 2–4 markdown bullets. Each bullet is a short tap-ready reply: a possible next method, a hypothesis, or “I'm not sure yet”. Never put the final answer, a numeric result, or full working in a bullet.
If they insist on the answer, one sentence under Check: they can switch to Solve; still do not give it.
If there is no current problem, use Focus to ask what they want coached, keep Check empty of any solution, and ask them in Question to paste the question or their first step.
Use LaTeX for equations ($...$ inline, $$...$$ display). Keep the whole reply short: about 80–140 words.`,
  solution: `The user selected Solve mode. Continue from the last problem in this thread when one exists.
Write as a calm exam tutor with a mark-scheme voice: precise, numbered, no slang.
Structure your reply with these exact heading types: ## Problem, then ## Step 1 (n marks), ## Step 2 (n marks), … (3–6 steps), then ## Recap, then ## Try this.
Under Problem restate the question in one or two lines. Do not solve it there.
Each Step heading must keep that exact pattern, including the mark in parentheses when it helps (e.g. ## Step 1 (1 mark)). Under each Step give only that line of working, with just enough reason to follow it. Use LaTeX for equations ($...$ inline, $$...$$ display).
Under Recap give 2–3 lines on the method — not a second full solution.
Under Try this give one similar follow-up problem with no answer.`,
  test: `The user selected Quiz mode.
If the latest assistant message already contained a quiz JSON paper and the learner is now answering or asking for feedback, structure your reply as ## Feedback: score each item as n/m (e.g. 4/5), explain mistakes, give the correct answers, and say what to review next. Do not emit JSON in Feedback.
Otherwise write one short introductory sentence, then exactly one \`\`\`json fenced block and no other fences.
The JSON must be: {"topic":"short topic","questions":[{"prompt":"...","choices":["A","B","C","D"],"answer":1}]}
Rules: 4–5 questions of mixed difficulty. Prefer multiple-choice with exactly 4 concise choices. "answer" is the 0-based index of the correct choice (0 = first). Keep all other prose outside the fence. Do not list answers in the intro.`,
  plan: `The user selected Plan mode. Think first, then write. Infer the exam, skill, deadline, weekly hours, and weak topics from this thread. If a critical fact is missing (exam/date or hours), ask at most one diagnostic under Diagnosis, then still give a working plan with stated assumptions.
Write as a calm exam planner: precise, realistic, no slogans, no overstuffed days.
Structure your reply with these exact ## headings in this order: ## Goal, ## Diagnosis, ## Weekly plan, ## Checkpoints, ## If behind, ## First session.
Under Goal restate the target exam or skill, the date or horizon, and weekly study hours in 1–2 sentences.
Under Diagnosis name current level, 2–3 highest-leverage gaps, and one strength to protect. Do not re-teach content.
Under Weekly plan output exactly one markdown table with columns Day, Focus, Duration. Cover 7 days. Include at least one lighter review or rest day. Durations must fit the hours in Goal. Focus cells should be specific topics or skills, not “study”.
Under Checkpoints give 3–5 markdown bullets. Each is measurable (timed paper, topic check, or recall set). No vague “keep practising”.
Under If behind give a shortened 3–4 day recovery path.
Under First session give one concrete 25–45 minute session they can start today: topic, task, and how they will know it is done.
No extra headings and no pep talk.`,
  cards: `The user selected Cards mode. Write one short introductory sentence naming the topic, then exactly one \`\`\`json fenced block and no other fences.
The JSON must be: {"topic":"short topic","cards":[{"front":"...","back":"..."}]}
Include 8–12 high-quality recall cards. Front is a prompt or term; back is a concise answer. Prefer active recall over trivia. Keep all other prose outside the fence. Do not wrap the JSON in markdown lists.`,
};

export const TUTOR_LEVEL_PROMPTS: Record<TutorLevel, string> = {
  beginner:
    'Personal Tutor pace chip: Beginner — within the selected Settings education stage only. Do not change the education stage vocabulary or age band. Add more scaffolding: smaller steps, define stage-appropriate terms on first use, extra examples, and check understanding more often.',
  intermediate:
    'Personal Tutor pace chip: Intermediate — within the selected Settings education stage only. Do not change the education stage. Use balanced scaffolding: focus on method, pitfalls, and why a step works. Keep examples tight for this stage.',
  advanced:
    'Personal Tutor pace chip: Advanced — within the selected Settings education stage only. Do not raise vocabulary above that stage. Be more concise for this stage: exam/technique edge cases and precise language; skip elementary recap within the stage unless they stumble.',
};

export const TUTOR_MODE_PLACEHOLDERS: Record<TutorMode, string> = {
  teach: 'What should we learn? A topic, homework, or exam question…',
  hint: 'Paste the question or the step you are stuck on…',
  no_answer: 'Share your attempt — I will ask one question at a time…',
  solution: 'Paste the problem you want a full solution for…',
  test: 'What topic should I quiz you on?',
  plan: 'Exam, date, weekly hours, and weak topics…',
  cards: 'What should these flashcards cover?',
};

export const TUTOR_EMPTY_STATE_HINTS: Record<TutorMode, string> = {
  teach: 'Work through the lesson one section at a time — then try Guided practice.',
  hint: 'A precise method nudge for the current step — not the solution.',
  no_answer: 'One guiding question at a time. Tap a reply or type your working — no full answer.',
  solution: 'Reveal one marked step at a time, then a recap and a similar problem.',
  test: 'Timed exam-style quiz — tap answers, then get tutor feedback.',
  plan: 'A deep revision plan: diagnosis, a realistic week, checkpoints you can tick, and a first session.',
  cards: 'Eight to twelve recall cards — tap to flip, then mark Again or Got it.',
};

export const TUTOR_MODE_STARTERS: Record<TutorMode, SubjectPrompts> = {
  teach: [
    'Teach this topic from first principles',
    'Walk me through this homework question',
    'Explain this with a worked example, then let me try',
    'I have a photo of the problem — start from that',
  ],
  hint: [
    'I am stuck after the first step of this question',
    'Give a method hint, not the answer',
    'I think my first move is wrong — check the setup',
    'What should the next line of working be?',
  ],
  no_answer: [
    'Coach me through this without the answer',
    'Ask one question at a time until I see the method',
    'Check my reasoning — do not give the final line',
    'Walk me through this exam question Socratically',
  ],
  solution: [
    'Show a full marked solution to this problem',
    'Work this exam question step by step',
    'Solve it, then give me a similar one to try',
    'Explain the method as if this were a mark scheme',
  ],
  test: [
    'Quiz me on what we just covered',
    'Give me a mixed 5-question check',
    'Test me at exam difficulty',
    'Ask short questions, then grade my answers',
  ],
  plan: [
    'Build a two-week exam plan from my weak topics',
    'I have one hour a day — make a realistic week',
    'I am behind: diagnose the gaps and plan recovery',
    'Plan revision by topic with measurable checkpoints',
  ],
  cards: [
    'Make flashcards for this topic',
    'Turn this lesson into recall cards',
    'Cards for key formulas and when to use them',
    'Active-recall cards, not trivia',
  ],
};

export const TUTOR_MODES: { id: TutorMode; label: string }[] = [
  { id: 'teach', label: 'Lesson' },
  { id: 'hint', label: 'Hint' },
  { id: 'no_answer', label: 'Coach' },
  { id: 'solution', label: 'Solve' },
  { id: 'test', label: 'Quiz' },
  { id: 'plan', label: 'Plan' },
  { id: 'cards', label: 'Cards' },
];

export const TUTOR_LEVELS: { id: TutorLevel; label: string; caption: string }[] = [
  {
    id: 'beginner',
    label: 'Beginner',
    caption: 'New to the topic. Terms defined, smaller steps, extra everyday examples.',
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    caption: 'School foundations assumed. Method, pitfalls, and why each step works.',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    caption: 'Concise and exam-ready. Technique, edge cases, and precise language.',
  },
];

export const TUTOR_FOLLOW_UPS: { id: TutorMode; label: string; text: string }[] = [
  {
    id: 'hint',
    label: 'Hint',
    text: 'Give a focused method hint for the last problem. Do not reveal the answer or full working.',
  },
  {
    id: 'no_answer',
    label: 'Coach',
    text: 'Coach me on the last problem. One question at a time — do not give the final answer.',
  },
  {
    id: 'solution',
    label: 'Solve',
    text: 'Show a marked step-by-step solution to the last problem.',
  },
  {
    id: 'test',
    label: 'Quiz',
    text: 'Quiz me on what we just covered. Do not include answers yet.',
  },
  {
    id: 'cards',
    label: 'Cards',
    text: 'Make flashcards for this lesson.',
  },
  {
    id: 'plan',
    label: 'Plan',
    text: 'Build a deep revision plan from this thread: diagnosis, a realistic week, checkpoints, and a first session.',
  },
];

export const DEFAULT_TUTOR_MODE: TutorMode = 'teach';
export const DEFAULT_TUTOR_LEVEL: TutorLevel = 'intermediate';
