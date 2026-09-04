export type {
  SlideLayout,
  Slide,
  SlideColumn,
  SlideFact,
  SlideCard,
  ParsedPresentation,
  // Visual layout types
  ChartType,
  SlideChartSeries,
  SlideNode,
  SlideEdge,
  SlideVertex,
  SlideLevel,
} from './presentation-parser';
export { tryParsePresentation, isPresentationPending } from './presentation-parser';
export {
  buildPresentationPrompt,
  PRESENTATION_MODE_PLACEHOLDER,
  withPresentationModeInstructions,
  stripPresentationModeInstructions,
} from './presentation-prompt';
export {
  PRESENTATION_THEMES,
  PRESENTATION_THEME_IDS,
  resolveTheme,
  buildThemePromptBlock,
} from './presentation-theme';
export type { PresentationThemeId, SlideThemeTokens } from './presentation-theme';
export { PresentationCard } from './presentation-card';
export { PresentationFullscreenModal } from './presentation-fullscreen-modal';
export { exportPresentation } from './presentation-export';
