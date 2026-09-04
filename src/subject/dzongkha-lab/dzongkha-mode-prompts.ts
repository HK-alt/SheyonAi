import type { DzongkhaMode } from '@/types/chat';
import type { SubjectPrompts } from '@/subject/subjects/types';
import {
  DZONGKHA_DIAGRAM_ADDENDUM,
  SUBJECT_DIAGRAM_ACCURACY_RULES,
  SUBJECT_DIAGRAM_DESIGN_SYSTEM,
} from '@/subject/diagram-prompt';

/**
 * Verified beginner seed forms only — labs must not invent Uchen outside this list.
 * For anything else, tell the learner to use Library mode (RAG).
 * Keep in sync with DZONGKHA_MODE_PROMPTS in supabase/functions/deepseek-chat/index.ts
 */
const SEED_LEXICON = `VERIFIED SEED LEXICON (ONLY allowed Uchen in Vocab/Diagram/Lab/Map phrase panels):
| Uchen | Romanization | Gloss |
| ཀུ་ཟུ་བཟང་པོ་ལ | kuzuzangpo la | hello / greetings |
| བཀའ་དྲིན་ཆེན་ལ | kadinchen la | thank you |
| ང | nga | I / me |
| ཁྱིམ | khyim | house / home |
| དགེ་རྒན | gegen | teacher |
| ཨིང | ing | is/am (Dzongkha equative — not Tibetan ཡིན) |
| རེད | red | is (equative alternate) |
| ང་དགེ་རྒན་ཨིང། | nga gegen ing | I am a teacher. |
FORBIDDEN: བཀྲ་ཤིས་བདེ་ལེགས, ཐུགས་རྗེ་ཆེ, སློབ་དཔོན, ཡིན, or ANY Uchen not in the table above.
If the user asks for words outside this seed (family, numbers, food, travel, etc.): do NOT invent spellings. Reply with one short English sentence only (no html fence): tell them to switch to Library mode for accurate library-grounded Dzongkha.`;

/**
 * Dzongkha generate modes - keep in sync with DZONGKHA_MODE_PROMPTS in
 * supabase/functions/deepseek-chat/index.ts
 * Note: `library` is RAG-only (rag-chat) and has no HTML generate prompt here.
 */
export const DZONGKHA_MODE_PROMPTS: Record<Exclude<DzongkhaMode, 'library'>, string> = {
  vocab: `The user selected Vocab mode for Dzongkha (practice UI only — Library mode is the accuracy path).
${SEED_LEXICON}
If the request fits the seed lexicon: write one short English intro, then exactly one \`\`\`html fence (<!DOCTYPE html>), no CDNs, all CSS/JS inline.
Build a flashcard / show-hide romanization workshop using ONLY seed rows (all of them is fine). Include Check score for match or type-romanization. Never add extra Uchen.
Caption: "Practice lab from verified seed list — for other words use Library mode."
Keep JS under 200 lines. Prose outside the fence.`,

  diagram: `The user selected Diagram mode for Dzongkha (practice UI only — Library mode is the accuracy path).
${SEED_LEXICON}
If the request needs non-seed vocabulary: one English sentence only — switch to Library. No html fence.
Otherwise: one short English intro + one \`\`\`html fence (<!DOCTYPE html>), no CDNs. All CSS/JS inline.
SVG diagram for S-O-V using ONLY seed tokens, e.g. ང | དགེ་རྒན | ཨིང → ང་དགེ་རྒན་ཨིང། with romanization under each node. Label that ཨིང/རེད are Dzongkha equatives (not Tibetan ཡིན).
Caption: "Grammar practice from verified seed list — for other examples use Library mode."
Keep JS under 180 lines. Prose outside the fence.

` +
    SUBJECT_DIAGRAM_DESIGN_SYSTEM +
    `

` +
    SUBJECT_DIAGRAM_ACCURACY_RULES +
    `

` +
    DZONGKHA_DIAGRAM_ADDENDUM,

  sim: `The user selected Lab (Practice) mode for Dzongkha (practice UI only — Library mode is the accuracy path).
${SEED_LEXICON}
If the request needs non-seed vocabulary: one English sentence only — switch to Library. No html fence.
Otherwise: one short English intro + one \`\`\`html fence (<!DOCTYPE html>), no CDNs.
Interactive quiz (Check / Next / Reset, score) using ONLY seed forms: pick correct greeting, match gloss↔Uchen, reorder ང / དགེ་རྒན / ཨིང, or type romanization. Include one distractor that is the FORBIDDEN Tibetan hello and mark it wrong with a short note.
Caption: "Practice lab from verified seed list — for other drills use Library mode."
Keep JS under 220 lines. Prose outside the fence.`,

  map: `The user selected Map mode for Dzongkha / Bhutan (places from Nominatim; phrases from seed list only).
${SEED_LEXICON}
Write one short English intro, then exactly one \`\`\`html fence (<!DOCTYPE html>).
Leaflet 1.9.4 from unpkg + OSM + Esri imagery; Nominatim for real Bhutan/town GeoJSON (never invent borders). ≥1100ms between Nominatim calls.
Popups and the mini facts panel may use ONLY seed phrases (e.g. ཀུ་ཟུ་བཟང་པོ་ལ for greetings) — never invent place-name Dzongkha spellings.
Include: Streets/Satellite layers, search, measure, scale, invalidateSize after 200ms.
Caption: "Places from OSM/Nominatim; Dzongkha phrases from verified seed list — for accurate language use Library mode."
Default: Bhutan + Thimphu/Paro markers. Keep JS under 420 lines. Prose outside the fence.`,
};

export const DZONGKHA_MODE_PLACEHOLDERS: Record<DzongkhaMode, string> = {
  library: 'Ask anything — accurate Dzongkha from the library…',
  vocab: 'Seed vocab practice only (greetings / teacher)…',
  diagram: 'Seed S-O-V diagram only — or use Library…',
  sim: 'Seed practice quiz only — or use Library…',
  map: 'Bhutan map + seed greetings — language via Library…',
};

export const DZONGKHA_EMPTY_STATE_HINTS: Record<DzongkhaMode, string> = {
  library:
    'Accurate path: library-grounded answers (Uchen + romanization). Machine translation may need a human check.',
  vocab:
    'Practice UI only (verified seed words). For accurate new vocabulary, switch to Library.',
  diagram:
    'Practice UI only (seed S-O-V). For accurate grammar from sources, switch to Library.',
  sim: 'Practice UI only (seed quiz). For accurate drills from the library, switch to Library.',
  map: 'Real Bhutan map + seed greetings only. For accurate language, switch to Library.',
};

export const DZONGKHA_MODE_STARTERS: Record<DzongkhaMode, SubjectPrompts> = {
  library: [
    'ཀུ་ཟུ་བཟང་པོ་ལ — teach me greetings (beginner)',
    'Explain S-O-V with Dzongkha examples',
    'How do I say "I am a teacher" in Dzongkha?',
    'Quiz me on basic Dzongkha vocabulary',
  ],
  vocab: [
    'Seed vocab lab: greetings flashcards',
    'Seed vocab lab: ང / དགེ་རྒན / ཁྱིམ',
    'Practice thank-you and hello from the seed list',
    'Show seed flashcards with romanization hide/show',
  ],
  diagram: [
    'Diagram seed S-O-V: ང་དགེ་རྒན་ཨིང།',
    'Show ང | དགེ་རྒན | ཨིང as a sentence tree',
    'Label equative ཨིང vs forbidden Tibetan ཡིན',
    'Diagram seed tokens only for word order',
  ],
  sim: [
    'Quiz: pick ཀུ་ཟུ་བཟང་པོ་ལ (not Tibetan hello)',
    'Reorder ང / དགེ་རྒན / ཨིང',
    'Match seed glosses to Uchen',
    'Type romanization for seed greetings',
  ],
  map: [
    'Highlight Bhutan and label Thimphu',
    'Map Paro with seed greeting in the facts panel',
    'Thimphu → Paro journey + seed thank-you phrase',
    'Bhutan map with seed hello in popups only',
  ],
};

/** Default Dzongkha chip — Library keeps RAG grounded answers. */
export const DEFAULT_DZONGKHA_MODE: DzongkhaMode = 'library';
