export { PhysicsLabChips } from '@/subject/physics-lab/physics-lab-chips';
export {
  PHYSICS_MODE_PROMPTS,
  PHYSICS_MODE_PLACEHOLDERS,
  PHYSICS_EMPTY_STATE_HINTS,
  PHYSICS_MODE_STARTERS,
  DEFAULT_PHYSICS_MODE,
} from '@/subject/physics-lab/physics-mode-prompts';
export { inferPhysicsModeFromPrompt } from '@/subject/physics-lab/physics-mode-inference';
export { tryParseField, isFieldPending, inferFieldFromText, resolveFieldContent } from '@/subject/physics-lab/field-parser';
export type { ParsedField, FieldLabel } from '@/subject/physics-lab/field-parser';
export { FieldCard } from '@/subject/physics-lab/field-card';
export { FieldPanel } from '@/subject/physics-lab/field-panel';
export { FIELD_SCENE_IDS, FIELD_CATALOG } from '@/subject/physics-lab/field-catalog';
