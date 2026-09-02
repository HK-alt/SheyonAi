export { MindMapChip } from '@/subject/mind-map-chip';
export { PersonalTutorChip } from '@/subject/personal-tutor-chip';
export { tryParseTutorFlashcards, isTutorFlashcardsPending } from '@/subject/flashcard-parser';
export type { TutorFlashcard, ParsedTutorFlashcards } from '@/subject/flashcard-parser';
export { tryParseTutorQuiz, isTutorQuizPending } from '@/subject/quiz-parser';
export type { TutorQuizQuestion, ParsedTutorQuiz } from '@/subject/quiz-parser';
export { tryParseTutorHint, isTutorHintPending } from '@/subject/hint-parser';
export type { ParsedTutorHint } from '@/subject/hint-parser';
export { tryParseTutorCoach, isTutorCoachPending } from '@/subject/coach-parser';
export type { ParsedTutorCoach } from '@/subject/coach-parser';
export { tryParseTutorLesson } from '@/subject/lesson-parser';
export type { ParsedTutorLesson } from '@/subject/lesson-parser';
export { tryParseTutorSolve } from '@/subject/solve-parser';
export type { ParsedTutorSolve } from '@/subject/solve-parser';
export { tryParseTutorPlan } from '@/subject/plan-parser';
export type { ParsedTutorPlan } from '@/subject/plan-parser';
export { MindMapViewer } from '@/subject/mind-map-viewer';
export { MindMapCard } from '@/subject/mind-map-card';
export { MindMapActions } from '@/subject/mind-map-actions';
export { MindMapExpandedPanel, MindMapModal } from '@/subject/mind-map-modal';
export { mindMapToOutline } from '@/subject/mind-map-utils';
export { MIND_MAP_SYSTEM_PROMPT } from '@/subject/mind-map-prompt';
export { resolveMindMapContent, isMindMapFallback, inferMindMapFromText } from '@/subject/mind-map-inference';
export type { MindElixirData, MindElixirNode, ParsedMindMap } from '@/subject/mind-map-types';
export type { MindMapViewerProps, MindMapVariant, MindMapViewerHandle } from '@/subject/mind-map-viewer';
export { SUBJECT_CONFIG, getSubjectConfig, getSubjectPlaceholder, getSubjectTutorTitle, getSubjectAccentColor, getSubjectChipIcon } from '@/subject/config';
export { SubjectChips } from '@/subject/subject-chips';
export type { SubjectChipsMode } from '@/subject/types';
export { SubjectSheet } from '@/subject/subject-sheet';
export {
  BiologyLabChips,
  BIOLOGY_EMPTY_STATE_HINTS,
  BIOLOGY_MODE_STARTERS,
  DEFAULT_BIOLOGY_MODE,
} from '@/subject/biology-lab';
export {
  PhysicsLabChips,
  PHYSICS_EMPTY_STATE_HINTS,
  PHYSICS_MODE_STARTERS,
  DEFAULT_PHYSICS_MODE,
} from '@/subject/physics-lab';
export {
  ChemistryLabChips,
  CHEMISTRY_EMPTY_STATE_HINTS,
  CHEMISTRY_MODE_STARTERS,
  DEFAULT_CHEMISTRY_MODE,
} from '@/subject/chemistry-lab';
export {
  GeographyLabChips,
  GEOGRAPHY_EMPTY_STATE_HINTS,
  GEOGRAPHY_MODE_STARTERS,
  DEFAULT_GEOGRAPHY_MODE,
} from '@/subject/geography-lab';
export {
  HistoryLabChips,
  HISTORY_EMPTY_STATE_HINTS,
  HISTORY_MODE_STARTERS,
  DEFAULT_HISTORY_MODE,
} from '@/subject/history-lab';
export {
  EnglishLabChips,
  ENGLISH_EMPTY_STATE_HINTS,
  ENGLISH_MODE_STARTERS,
  DEFAULT_ENGLISH_MODE,
} from '@/subject/english-lab';
export {
  DzongkhaLabChips,
  DZONGKHA_EMPTY_STATE_HINTS,
  DZONGKHA_MODE_STARTERS,
  DEFAULT_DZONGKHA_MODE,
} from '@/subject/dzongkha-lab';
export {
  ALL_SUBJECTS,
  SUBJECTS,
  SUBJECT_ICONS,
  SUBJECT_EDGE_TUTOR_PROMPTS,
  getSubjectDefinition,
  getSubjectIcon,
} from '@/subject/subjects';
export type { Subject } from '@/subject/subjects';
export type { SubjectConfig, SubjectIcon, SubjectPrompts } from '@/subject/subjects/types';
export { isSubject } from '@/subject/utils';
