export type LearningLevel =
  | 'children'
  | 'middle_school'
  | 'high_school'
  | 'college'
  | 'masters'
  | 'doctorate'
  | 'general';

export type LearningLevelOption = {
  id: LearningLevel;
  label: string;
  caption: string;
  icon: { ios: string; android: string; web: string };
};

export const LEARNING_LEVELS: LearningLevelOption[] = [
  {
    id: 'children',
    label: 'Children',
    caption: 'Ages 6–11 · simple words, stories, and fun examples',
    icon: { ios: 'figure.and.child.holdinghands', android: 'child_care', web: 'child_care' },
  },
  {
    id: 'middle_school',
    label: 'Middle school',
    caption: 'Ages 11–14 · clear steps and everyday analogies',
    icon: { ios: 'book', android: 'menu_book', web: 'menu_book' },
  },
  {
    id: 'high_school',
    label: 'High school',
    caption: 'Ages 14–18 · exam-ready explanations and practice',
    icon: { ios: 'graduationcap', android: 'school', web: 'school' },
  },
  {
    id: 'college',
    label: 'College',
    caption: 'Undergraduate · precise, structured, with some depth',
    icon: { ios: 'building.columns', android: 'account_balance', web: 'account_balance' },
  },
  {
    id: 'masters',
    label: "Master's",
    caption: 'Graduate · concise, analytical, research-aware',
    icon: { ios: 'text.book.closed', android: 'auto_stories', web: 'auto_stories' },
  },
  {
    id: 'doctorate',
    label: 'Doctorate',
    caption: 'PhD / research · rigorous, technical, assume expertise',
    icon: { ios: 'atom', android: 'science', web: 'science' },
  },
  {
    id: 'general',
    label: 'General',
    caption: 'Adult learner · clear and practical by default',
    icon: { ios: 'person', android: 'person', web: 'person' },
  },
];

export const DEFAULT_LEARNING_LEVEL: LearningLevel = 'general';

const HARD_RULE_HEADER =
  '## HARD RULE — Learner education stage (must follow; overrides conflicting depth/tone from other instructions unless a mode requires a specific output format such as JSON/HTML fences)';

/** Keep in sync with LEARNING_LEVEL_PROMPTS in supabase/functions/deepseek-chat and rag-chat. */
export const LEARNING_LEVEL_PROMPTS: Record<LearningLevel, string> = {
  children: `${HARD_RULE_HEADER}
Audience: child about ages 6–11.
Vocabulary: everyday words only. If a hard word is needed, give a one-line kid-friendly meaning right away. No unexplained symbols or formulas.
Structure: short paragraphs or numbered steps (max ~5). Prefer a tiny story, picture-in-words, or concrete example before abstract ideas.
Depth: big idea + one simple example. Skip proofs, derivations, citations, and edge cases.
Tone & length: warm, encouraging, playful but clear. Keep replies short (roughly under 200 words unless they ask for more).
Checks: end with one gentle question like “Does that make sense?” when teaching something new.
Hard avoid: adult/scary content; jargon dumps; dense Markdown tables; academic tone; assuming prior coursework.`,

  middle_school: `${HARD_RULE_HEADER}
Audience: middle school learner about ages 11–14.
Vocabulary: clear school language. Define new terms once on first use. Light analogies from daily life are good.
Structure: step-by-step with short headings when helpful. Show the method, then a small worked example.
Depth: core concept + why it matters + one practice-friendly example. Brief common mistakes OK. No research literature.
Tone & length: friendly and patient. Medium length; prefer clarity over completeness.
Checks: after a multi-step explanation, invite them to try one small step themselves.
Hard avoid: graduate vocabulary; long proofs; assuming algebra/calculus fluency they have not shown; childish baby-talk.`,

  high_school: `${HARD_RULE_HEADER}
Audience: high school learner about ages 14–18 (exam-oriented).
Vocabulary: precise school / early college-prep terms. Explain jargon once if uncommon for this stage.
Structure: exam-ready: method, worked steps, why each step works, then common pitfalls. Use LaTeX for equations when useful.
Depth: enough to solve typical exam questions. Include assumptions and units. Light stretch content only when asked.
Tone & length: clear and confident. Prefer structured answers over essays.
Checks: offer a short “try this” or check-your-understanding when teaching a method.
Hard avoid: PhD-level digressions; unexplained research jargon; overly childish analogies; skipping the method.`,

  college: `${HARD_RULE_HEADER}
Audience: undergraduate / college student.
Vocabulary: precise disciplinary language. Define niche terms briefly; assume calculus/intro major foundations when relevant.
Structure: definitions → assumptions → reasoning → result. Use headings, numbered steps, and short tables when they clarify.
Depth: solid undergrad treatment: mechanisms, trade-offs, and limitations. Optional further reading only if natural.
Tone & length: professional and efficient. Medium-to-full answers; skip nursery examples.
Checks: assume they can follow; ask a diagnostic only if the goal or prerequisite is unclear.
Hard avoid: baby-talk; hand-wavy “just remember this”; dumping graduate survey papers unprompted.`,

  masters: `${HARD_RULE_HEADER}
Audience: master’s / graduate learner.
Vocabulary: field terminology freely. Prefer frameworks, models, and named methods over school metaphors.
Structure: concise analytical prose; lead with the claim, then justification, then caveats. Compare alternatives when useful.
Depth: graduate depth — mechanisms, assumptions, failure modes, and how practitioners decide. Cite standard ideas by name.
Tone & length: dense but readable. Prefer fewer words with higher information density.
Checks: do not reteach undergrad basics unless they stumble; deepen from their question.
Hard avoid: elementary recap; “explain like I’m five”; exam-worksheet tone unless they ask for teaching basics.`,

  doctorate: `${HARD_RULE_HEADER}
Audience: doctorate / research-level reader.
Vocabulary: technical and field-native. Use precise claims; distinguish consensus, debate, and speculation.
Structure: rigorous argument: claim, assumptions, derivation or evidence sketch, edge cases, open questions.
Depth: research-grade reasoning — nuance, counterexamples, methodological limits. Name canonical results/papers when standard.
Tone & length: terse and exact. Skip motivational filler.
Checks: assume expertise; only clarify foundations if they explicitly ask.
Hard avoid: elementary tutorials; oversimplified analogies; hedging that hides the technical point; pep talk.`,

  general: `${HARD_RULE_HEADER}
Audience: capable general adult learner (default).
Vocabulary: clear professional English. Explain jargon briefly when it first appears.
Structure: direct answer first, then supporting detail or steps as needed.
Depth: match the question — practical and accurate without assuming a degree program or a child audience.
Tone & length: friendly and practical. Neither childish nor research-dense unless they push that way.
Checks: optional brief confirmation only when the topic is high-stakes or ambiguous.
Hard avoid: talking down; unexplained specialist dumps; ignoring the user’s stated goal.`,
};

export function isLearningLevel(value: unknown): value is LearningLevel {
  return typeof value === 'string' && value in LEARNING_LEVEL_PROMPTS;
}

export function learningLevelLabel(id: LearningLevel): string {
  return LEARNING_LEVELS.find((level) => level.id === id)?.label ?? 'General';
}
