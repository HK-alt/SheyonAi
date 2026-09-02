export type ScienceChartType =
  | 'line'
  | 'multiLine'
  | 'area'
  | 'bar'
  | 'scatter'
  | 'timeline';

export type ScienceGraphModelType =
  | 'logistic'
  | 'michaelisMenten'
  | 'linear'
  | 'exponential'
  | 'quadratic'
  | 'sine'
  | 'power';

export type ScienceAxis = {
  label: string;
  unit?: string;
};

export type ScienceSeriesPoint = [number, number];

export type ScienceSeries = {
  id: string;
  label: string;
  color?: string;
  points: ScienceSeriesPoint[];
  /** Left (default) or right Y axis for dual-scale charts. */
  yAxis?: 'left' | 'right';
  /** Line dash style for comparison curves. */
  dash?: 'solid' | 'dashed' | 'dotted';
  /** Draw markers on points (useful for scatter / sparse data). */
  markers?: boolean;
};

export type ScienceAnnotation = {
  id?: string;
  label: string;
  /** Vertical reference at x. */
  x?: number;
  /** Horizontal reference at y (left axis unless yAxis is right). */
  y?: number;
  yAxis?: 'left' | 'right';
  color?: string;
  detail?: string;
};

export type ScienceTimelineEvent = {
  id: string;
  label: string;
  start: number;
  end?: number;
  detail?: string;
  category?: string;
  color?: string;
  /** 1–5; larger markers for pivotal moments. */
  importance?: number;
};

export type ScienceEraBand = {
  id?: string;
  label: string;
  start: number;
  end: number;
  color?: string;
};

export type ScienceGraphControl = {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
};

export type ScienceGraphModel = {
  type: ScienceGraphModelType;
  params: Record<string, number>;
};

export type ScienceGraphPayload = {
  chartType: ScienceChartType;
  title: string;
  goal?: string;
  caption?: string;
  xAxis?: ScienceAxis;
  yAxis?: ScienceAxis;
  /** Optional second Y axis for dual-scale charts. */
  yAxisRight?: ScienceAxis;
  series?: ScienceSeries[];
  events?: ScienceTimelineEvent[];
  /** Background era/period bands on timelines. */
  eras?: ScienceEraBand[];
  annotations?: ScienceAnnotation[];
  /** Short teaching bullets shown under the figure. */
  insights?: string[];
  controls?: ScienceGraphControl[];
  model?: ScienceGraphModel;
};

export type ParsedScienceGraph = ScienceGraphPayload & {
  introText: string;
};

export const SCIENCE_CHART_TYPES: readonly ScienceChartType[] = [
  'line',
  'multiLine',
  'area',
  'bar',
  'scatter',
  'timeline',
] as const;

export const SCIENCE_MODEL_TYPES: readonly ScienceGraphModelType[] = [
  'logistic',
  'michaelisMenten',
  'linear',
  'exponential',
  'quadratic',
  'sine',
  'power',
] as const;
