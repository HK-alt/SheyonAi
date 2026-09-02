import type { LearningLevel } from '@/lib/learning-level';
import type { Subject } from '@/subject';
import type { TreeVizMode } from '@/subject/tree-viz/tree-viz-types';
import type { ChunkSource } from '@/types/rag';

export type { TreeVizMode };

export type Role = 'user' | 'assistant';

export type MessageAttachment = {
  path: string;
  mimeType: string;
  name: string;
  size?: number;
  /** Local URI for optimistic UI before upload completes. */
  localUri?: string;
};

export type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  attachments?: MessageAttachment[];
  /** True when this assistant message was produced in mind-map mode. */
  mindMap?: boolean;
  /** True when this assistant message includes a live website preview (Build mode). */
  websitePreview?: boolean;
  /** True when this assistant message is Anatomy JSON for the GLTF viewer. */
  biologyAnatomy?: boolean;
  /** True when this assistant message is Diagram JSON for the curated SVG catalog. */
  biologyDiagram?: boolean;
  /** True when this assistant message is Graph/Timeline JSON for the D3 viewer. */
  scienceGraph?: boolean;
  /** True when this assistant message is Tools D3 tree-viz JSON. */
  treeViz?: boolean;
  /** True when this assistant message is Physics Field/Orbit JSON for the 3D viewer. */
  physicsField?: boolean;
  /** True when this assistant message is Chemistry Molecule JSON for the 3D viewer. */
  chemistryMolecule?: boolean;
  /** True when this assistant message includes flip flashcards (Cards mode). */
  flashcards?: boolean;
  /** True when this assistant message includes an interactive quiz (Quiz mode). */
  quiz?: boolean;
  /** True when this assistant message is a structured Hint-mode note. */
  tutorHint?: boolean;
  /** True when this assistant message is an interactive Coach-mode note. */
  tutorCoach?: boolean;
  /** True when this assistant message is a sectioned Lesson. */
  tutorLesson?: boolean;
  /** True when this assistant message is a step-reveal Solve. */
  tutorSolve?: boolean;
  /** True when this assistant message is a structured Plan. */
  tutorPlan?: boolean;
  /** RAG citation sources attached to assistant replies. */
  sources?: ChunkSource[];
};

export type PendingAttachment = {
  id: string;
  localUri: string;
  mimeType: string;
  name: string;
  size?: number;
};

export type CodingMode = 'debug' | 'review' | 'explain' | 'build' | 'learn';

export type TutorMode =
  | 'teach'
  | 'hint'
  | 'no_answer'
  | 'solution'
  | 'test'
  | 'plan'
  | 'cards';

export type TutorLevel = 'beginner' | 'intermediate' | 'advanced';

export type MathMode = 'solve';

/** Biology workspace: graph, diagram, interactive lab, or 3D anatomy viewer. */
export type BiologyMode = 'graph' | 'diagram' | 'sim' | 'anatomy';

/** Physics workspace: graph, diagram, interactive lab, or 3D field/orbit viewer. */
export type PhysicsMode = 'graph' | 'diagram' | 'sim' | 'field';

/** Chemistry workspace: graph, diagram, interactive lab, or 3D molecule viewer. */
export type ChemistryMode = 'graph' | 'diagram' | 'sim' | 'molecule';

/** Geography workspace: graph, diagram, interactive lab, or teaching map. */
export type GeographyMode = 'graph' | 'diagram' | 'sim' | 'map';

/** History workspace: timeline, diagram, interactive lab, or historical map. */
export type HistoryMode = 'timeline' | 'diagram' | 'sim' | 'map';

/** English workspace: essay workshop, diagram, practice lab, or literary map. */
export type EnglishMode = 'essay' | 'diagram' | 'sim' | 'map';

/** Dzongkha workspace: library RAG, vocab, diagram, practice lab, or Bhutan map. */
export type DzongkhaMode = 'library' | 'vocab' | 'diagram' | 'sim' | 'map';

export type SendMessagePayload = {
  text: string;
  attachments?: PendingAttachment[];
  /** Active subject mode; the AI answers as a tutor for this subject. */
  subject?: Subject;
  /** When true, DeepSeek returns Mind Elixir JSON for an interactive map. */
  mindMap?: boolean;
  /** When true, answer is grounded in uploaded documents via RAG. */
  rag?: boolean;
  /** Coding workspace sub-mode; appends structured tutor instructions. */
  codingMode?: CodingMode;
  /** Personal Tutor workspace sub-mode; appends lesson / hint / quiz instructions. */
  tutorMode?: TutorMode;
  /** Personal Tutor learner level; appends depth instructions. */
  tutorLevel?: TutorLevel;
  /** Global education level from Settings; adjusts explanation depth. */
  learningLevel?: LearningLevel;
  /** Math workspace sub-mode; Solve uses structured step-by-step cards. */
  mathMode?: MathMode;
  /** Biology workspace: generate 3D anatomy or an interactive simulation. */
  biologyMode?: BiologyMode;
  /** Physics workspace: graph, diagram, lab simulation, or 3D field/orbit. */
  physicsMode?: PhysicsMode;
  /** Chemistry workspace: graph, diagram, lab simulation, or 3D molecule. */
  chemistryMode?: ChemistryMode;
  /** Geography workspace: graph, diagram, lab simulation, or teaching map. */
  geographyMode?: GeographyMode;
  /** History workspace: timeline, diagram, lab simulation, or historical map. */
  historyMode?: HistoryMode;
  /** English workspace: essay workshop, diagram, practice lab, or literary map. */
  englishMode?: EnglishMode;
  /** Dzongkha workspace: library RAG or vocab/diagram/lab/map HTML generate. */
  dzongkhaMode?: DzongkhaMode;
  /** Home Tools D3 tree visualization layout. */
  treeVizMode?: TreeVizMode;
};

export type { Subject };

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  /** Subject workspace for this thread (in-memory; set on first subject message). */
  subject?: Subject;
  /** True once messages have been fetched from Supabase (or never need to be). */
  messagesLoaded?: boolean;
};

export type TypingStage = 'thinking' | 'writing' | 'translating' | 'polishing' | 'finishing';

export const TYPING_STAGE_LABELS: Record<TypingStage, string> = {
  thinking: 'Thinking',
  writing: 'Writing',
  translating: 'Translating to Dzongkha',
  polishing: 'Polishing Dzongkha',
  finishing: 'Almost done',
};

export type ThemePreference = 'system' | 'light' | 'dark';

export const SUGGESTED_PROMPTS = [
  'Explain quantum computing',
  'Write a poem',
  'Help me debug code',
  'Plan a trip',
] as const;
