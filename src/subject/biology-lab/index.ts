export { BiologyLabChips } from '@/subject/biology-lab/biology-lab-chips';
export {
  BIOLOGY_MODE_PROMPTS,
  BIOLOGY_MODE_PLACEHOLDERS,
  BIOLOGY_EMPTY_STATE_HINTS,
  BIOLOGY_MODE_STARTERS,
  DEFAULT_BIOLOGY_MODE,
} from '@/subject/biology-lab/biology-mode-prompts';
export { tryParseAnatomy, isAnatomyPending } from '@/subject/biology-lab/anatomy-parser';
export type { ParsedAnatomy, AnatomyLabel } from '@/subject/biology-lab/anatomy-parser';
export { AnatomyCard } from '@/subject/biology-lab/anatomy-card';
export { ANATOMY_MODEL_IDS, GLTF_CATALOG } from '@/subject/biology-lab/gltf-catalog';
export { tryParseDiagram, isDiagramPending } from '@/subject/biology-lab/diagram-parser';
export type { ParsedDiagram, DiagramLabel } from '@/subject/biology-lab/diagram-parser';
export { buildDiagramViewerHtml } from '@/subject/biology-lab/diagram-html';
export { DIAGRAM_IDS, DIAGRAM_CATALOG, resolveDiagramId } from '@/subject/biology-lab/diagram-catalog';
export type { DiagramId } from '@/subject/biology-lab/diagram-catalog';
