import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ChatComposer } from '@/components/chat/composer/chat-composer';
import { ChatHeader } from '@/components/chat/chat-header';
import { TutorLevelHeaderButton, TutorLevelSheet } from '@/components/chat/tutor-level-sheet';
import { ConversationDrawer } from '@/components/chat/conversation-drawer';
import { ConversationSidebar } from '@/components/chat/conversation-sidebar';
import { EmptyState } from '@/components/chat/empty-state';
import { MessageList } from '@/components/chat/message-list';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppSettings } from '@/context/app-settings-context';
import { useChat } from '@/context/chat-context';
import { useTheme } from '@/hooks/use-theme';
import { getSubjectConfig, getSubjectTutorTitle } from '@/subject';
import { useKeyboardInset, useWebKeyboardViewportPin } from '@/hooks/use-keyboard-inset';
import { resolveMindMapContent } from '@/subject/mind-map-inference';
import { MindMapExpandedPanel } from '@/subject/mind-map-modal';
import type { MindElixirData } from '@/subject/mind-map-types';
import type { Subject } from '@/subject';
import {
  tryParseWebsitePreview,
  type ParsedWebsitePreview,
} from '@/subject/website-preview-parser';
import { tryParseAnatomy, type ParsedAnatomy } from '@/subject/biology-lab/anatomy-parser';
import { buildDiagramViewerHtml } from '@/subject/biology-lab/diagram-html';
import { tryParseDiagram } from '@/subject/biology-lab/diagram-parser';
import { buildGraphViewerHtml, tryParseScienceGraph, resolveScienceGraphContent } from '@/subject/science-graph';
import { buildTreeVizHtml, tryParseTreeViz } from '@/subject/tree-viz';
import { AnatomyPanel } from '@/subject/biology-lab/anatomy-panel';
import { tryParseField, resolveFieldContent, type ParsedField } from '@/subject/physics-lab/field-parser';
import { FieldPanel } from '@/subject/physics-lab/field-panel';
import { resolveMoleculeContent, type ParsedMolecule } from '@/subject/chemistry-lab/molecule-parser';
import { MoleculePanel } from '@/subject/chemistry-lab/molecule-panel';
import { WebsitePreviewPanel } from '@/subject/website-preview-panel';
import { DEFAULT_TUTOR_LEVEL, DEFAULT_TUTOR_MODE, TUTOR_EMPTY_STATE_HINTS } from '@/subject/subjects/personal-tutor-modes';
import { MATH_EMPTY_STATE_HINTS } from '@/subject/subjects/math-composer';
import { BIOLOGY_EMPTY_STATE_HINTS, DEFAULT_BIOLOGY_MODE } from '@/subject/biology-lab/biology-mode-prompts';
import { PHYSICS_EMPTY_STATE_HINTS, DEFAULT_PHYSICS_MODE } from '@/subject/physics-lab/physics-mode-prompts';
import { inferPhysicsModeFromPrompt } from '@/subject/physics-lab/physics-mode-inference';
import {
  CHEMISTRY_EMPTY_STATE_HINTS,
  DEFAULT_CHEMISTRY_MODE,
} from '@/subject/chemistry-lab';
import {
  GEOGRAPHY_EMPTY_STATE_HINTS,
  DEFAULT_GEOGRAPHY_MODE,
} from '@/subject/geography-lab';
import {
  HISTORY_EMPTY_STATE_HINTS,
  DEFAULT_HISTORY_MODE,
} from '@/subject/history-lab';
import {
  ENGLISH_EMPTY_STATE_HINTS,
  DEFAULT_ENGLISH_MODE,
} from '@/subject/english-lab';
import {
  DZONGKHA_EMPTY_STATE_HINTS,
  DEFAULT_DZONGKHA_MODE,
} from '@/subject/dzongkha-lab';
import type {
  BiologyMode,
  ChemistryMode,
  CodingMode,
  DzongkhaMode,
  EnglishMode,
  GeographyMode,
  HistoryMode,
  MathMode,
  PhysicsMode,
  PendingAttachment,
  TutorLevel,
  TutorMode,
} from '@/types/chat';
import type { HomeworkIntent } from '@/lib/homework-intent';

export type ChatScreenProps = {
  /** When set, all messages are sent with this subject and the workspace UI is shown. */
  subject?: Subject;
  headerTitle?: string;
  onBack?: () => void;
  /** Pre-fills the composer without turning on mind-map mode (Research → Ask AI). */
  seedText?: string | null;
  onSeedTextConsumed?: () => void;
  /** Attaches a photo from the Camera tab for vision tutoring. */
  seedAttachment?: Omit<PendingAttachment, 'id'> | null;
  /** Camera homework intent — seeds Personal Tutor mode + prompt. */
  seedHomeworkIntent?: HomeworkIntent | null;
  onSeedAttachmentConsumed?: () => void;
  /** Parent already applied the top safe-area inset. */
  nestedHeader?: boolean;
  /** Parent already renders the web conversation sidebar. */
  hidePersistentSidebar?: boolean;
  /** Home Tools sheet → switch to the Research tab. */
  onOpenResearch?: () => void;
};

type ExpandedMapState = {
  messageId: string;
  data: MindElixirData;
};

type ExpandedPreviewState = {
  messageId: string;
  preview: ParsedWebsitePreview;
};

type ExpandedAnatomyState = {
  messageId: string;
  anatomy: ParsedAnatomy;
};

type ExpandedFieldState = {
  messageId: string;
  field: ParsedField;
};

type ExpandedMoleculeState = {
  messageId: string;
  molecule: ParsedMolecule;
};

export function ChatScreen({
  subject,
  headerTitle,
  onBack,
  seedText,
  onSeedTextConsumed,
  seedAttachment,
  seedHomeworkIntent,
  onSeedAttachmentConsumed,
  nestedHeader = false,
  hidePersistentSidebar = false,
  onOpenResearch,
}: ChatScreenProps) {
  const theme = useTheme();
  const keyboardInset = useKeyboardInset();
  useWebKeyboardViewportPin(keyboardInset);
  const { width } = useWindowDimensions();
  const layoutHasSidebar = Platform.OS === 'web' && width >= 900;
  const persistentSidebar = layoutHasSidebar && !hidePersistentSidebar;
  const {
    activeConversation,
    activeConversationId,
    isTyping,
    typingStage,
    streamingMessageId,
    isGenerating,
    sendMessage,
    regenerateLastReply,
    stopGenerating,
    createConversation,
  } = useChat();
  const { learningLevel } = useAppSettings();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [nodeDraft, setNodeDraft] = useState<string | null>(null);
  const [expandedMap, setExpandedMap] = useState<ExpandedMapState | null>(null);
  const [expandedPreview, setExpandedPreview] = useState<ExpandedPreviewState | null>(null);
  const [expandedAnatomy, setExpandedAnatomy] = useState<ExpandedAnatomyState | null>(null);
  const [expandedField, setExpandedField] = useState<ExpandedFieldState | null>(null);
  const [expandedMolecule, setExpandedMolecule] = useState<ExpandedMoleculeState | null>(null);
  const [activeCodingMode, setActiveCodingMode] = useState<CodingMode | null>(null);
  const [activeTutorMode, setActiveTutorMode] = useState<TutorMode>(DEFAULT_TUTOR_MODE);
  const [activeTutorLevel, setActiveTutorLevel] = useState<TutorLevel>(DEFAULT_TUTOR_LEVEL);
  const [activeMathMode, setActiveMathMode] = useState<MathMode | null>(null);
  const [activeBiologyMode, setActiveBiologyMode] = useState<BiologyMode>(DEFAULT_BIOLOGY_MODE);
  const [activePhysicsMode, setActivePhysicsMode] = useState<PhysicsMode>(DEFAULT_PHYSICS_MODE);
  const [activeChemistryMode, setActiveChemistryMode] =
    useState<ChemistryMode>(DEFAULT_CHEMISTRY_MODE);
  const [activeGeographyMode, setActiveGeographyMode] =
    useState<GeographyMode>(DEFAULT_GEOGRAPHY_MODE);
  const [activeHistoryMode, setActiveHistoryMode] =
    useState<HistoryMode>(DEFAULT_HISTORY_MODE);
  const [activeEnglishMode, setActiveEnglishMode] =
    useState<EnglishMode>(DEFAULT_ENGLISH_MODE);
  const [activeDzongkhaMode, setActiveDzongkhaMode] =
    useState<DzongkhaMode>(DEFAULT_DZONGKHA_MODE);
  const [equationOpen, setEquationOpen] = useState(false);
  const [levelSheetOpen, setLevelSheetOpen] = useState(false);
  const [externalTutorMode, setExternalTutorMode] = useState<TutorMode | null>(null);
  const dismissedMapIdRef = useRef<string | null>(null);
  const dismissedPreviewIdRef = useRef<string | null>(null);
  const dismissedAnatomyIdRef = useRef<string | null>(null);
  const dismissedFieldIdRef = useRef<string | null>(null);
  const dismissedMoleculeIdRef = useRef<string | null>(null);
  /** Timestamp when the user entered the current subject workspace. */
  const enteredSubjectAtRef = useRef<number | null>(null);
  const prevSubjectRef = useRef<Subject | undefined>(undefined);

  const messages = activeConversation?.messages ?? [];
  const showEmptyState = messages.length === 0 && !isTyping;

  const lastMessage = messages[messages.length - 1];
  const lastParsedMindMap = useMemo(() => {
    if (!lastMessage || lastMessage.role !== 'assistant' || !lastMessage.mindMap) return null;
    return resolveMindMapContent(lastMessage.content, { preferInfer: true });
  }, [lastMessage]);

  const lastParsedPreview = useMemo(() => {
    if (!lastMessage || lastMessage.role !== 'assistant') return null;
    if (lastMessage.biologyDiagram) {
      const diagram = tryParseDiagram(lastMessage.content);
      if (diagram) {
        return {
          introText: diagram.introText,
          htmlDocument: buildDiagramViewerHtml(diagram),
          title: diagram.title,
        } satisfies ParsedWebsitePreview;
      }
    }
    if (lastMessage.scienceGraph) {
      const graph = resolveScienceGraphContent(lastMessage.content, {
        preferInfer: streamingMessageId !== lastMessage.id,
      });
      if (graph) {
        return {
          introText: graph.introText,
          htmlDocument: buildGraphViewerHtml(graph),
          title: graph.title,
        } satisfies ParsedWebsitePreview;
      }
    }
    if (lastMessage.treeViz) {
      const tree = tryParseTreeViz(lastMessage.content);
      if (tree) {
        return {
          introText: tree.introText,
          htmlDocument: buildTreeVizHtml(tree),
          title: tree.title,
        } satisfies ParsedWebsitePreview;
      }
    }
    if (!lastMessage.websitePreview) return null;
    return tryParseWebsitePreview(lastMessage.content);
  }, [lastMessage]);

  const lastParsedAnatomy = useMemo(() => {
    if (!lastMessage || lastMessage.role !== 'assistant' || !lastMessage.biologyAnatomy) {
      return null;
    }
    return tryParseAnatomy(lastMessage.content);
  }, [lastMessage]);

  const lastParsedField = useMemo(() => {
    if (!lastMessage || lastMessage.role !== 'assistant' || !lastMessage.physicsField) {
      return null;
    }
    return resolveFieldContent(lastMessage.content, {
      preferInfer: streamingMessageId !== lastMessage.id,
    });
  }, [lastMessage]);

  const lastParsedMolecule = useMemo(() => {
    if (!lastMessage || lastMessage.role !== 'assistant' || !lastMessage.chemistryMolecule) {
      return null;
    }
    return resolveMoleculeContent(lastMessage.content, {
      preferInfer: streamingMessageId !== lastMessage.id,
    });
  }, [lastMessage, streamingMessageId]);

  // Entering a subject workspace: fresh chat + tutor empty state (no shared history).
  useEffect(() => {
    if (!subject) {
      enteredSubjectAtRef.current = null;
      prevSubjectRef.current = undefined;
      return;
    }
    if (prevSubjectRef.current === subject) return;
    prevSubjectRef.current = subject;

    enteredSubjectAtRef.current = Date.now();
    setExpandedMap(null);
    setExpandedPreview(null);
    setExpandedAnatomy(null);
    setExpandedField(null);
    setExpandedMolecule(null);
    dismissedMapIdRef.current = null;
    dismissedPreviewIdRef.current = null;
    dismissedAnatomyIdRef.current = null;
    dismissedFieldIdRef.current = null;
    dismissedMoleculeIdRef.current = null;
    setActiveCodingMode(null);
    setActiveBiologyMode(DEFAULT_BIOLOGY_MODE);
    setActivePhysicsMode(DEFAULT_PHYSICS_MODE);
    setActiveChemistryMode(DEFAULT_CHEMISTRY_MODE);
    setActiveGeographyMode(DEFAULT_GEOGRAPHY_MODE);
    setActiveHistoryMode(DEFAULT_HISTORY_MODE);
    setActiveEnglishMode(DEFAULT_ENGLISH_MODE);
    setActiveDzongkhaMode(DEFAULT_DZONGKHA_MODE);
    setNodeDraft(null);
    createConversation();
  }, [subject, createConversation]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    try {
      setSidebarCollapsed(window.localStorage.getItem('sheyonai.sidebar.collapsed') === '1');
    } catch {
      // Ignore storage errors.
    }
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((current) => {
      const next = !current;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('sheyonai.sidebar.collapsed', next ? '1' : '0');
        } catch {
          // Ignore storage errors.
        }
      }
      return next;
    });
  }, []);

  // Open latest mind map by default once it is ready (not in Coding or Personal Tutor).
  useEffect(() => {
    if (subject === 'coding' || subject === 'personal') {
      setExpandedMap(null);
      return;
    }
    if (
      lastMessage?.websitePreview ||
      lastMessage?.biologyAnatomy ||
      lastMessage?.biologyDiagram ||
      lastMessage?.scienceGraph ||
      lastMessage?.treeViz ||
      lastMessage?.physicsField ||
      lastMessage?.chemistryMolecule
    ) {
      setExpandedMap(null);
      return;
    }
    if (!lastMessage || !lastParsedMindMap) {
      setExpandedMap(null);
      return;
    }
    if (streamingMessageId === lastMessage.id) {
      setExpandedMap(null);
      dismissedMapIdRef.current = null;
      return;
    }
    if (
      subject &&
      enteredSubjectAtRef.current != null &&
      lastMessage.createdAt <= enteredSubjectAtRef.current
    ) {
      return;
    }
    if (dismissedMapIdRef.current === lastMessage.id) return;
    setExpandedPreview(null);
    setExpandedAnatomy(null);
    setExpandedField(null);
    setExpandedMolecule(null);
    setExpandedMap({ messageId: lastMessage.id, data: lastParsedMindMap.data });
  }, [lastMessage, lastParsedMindMap, streamingMessageId, subject]);

  // Open latest website preview once HTML is parseable (including late in a stream).
  useEffect(() => {
    if (!lastMessage || !lastParsedPreview) {
      if (streamingMessageId === lastMessage?.id) {
        dismissedPreviewIdRef.current = null;
      } else {
        setExpandedPreview(null);
      }
      return;
    }
    if (
      subject &&
      enteredSubjectAtRef.current != null &&
      lastMessage.createdAt <= enteredSubjectAtRef.current
    ) {
      return;
    }
    if (dismissedPreviewIdRef.current === lastMessage.id) return;
    setExpandedMap(null);
    setExpandedAnatomy(null);
    setExpandedField(null);
    setExpandedMolecule(null);
    setExpandedPreview({ messageId: lastMessage.id, preview: lastParsedPreview });
  }, [lastMessage, lastParsedPreview, streamingMessageId, subject]);

  // Open latest anatomy viewer once JSON is parseable (including late in a stream).
  useEffect(() => {
    if (!lastMessage || !lastParsedAnatomy) {
      if (streamingMessageId === lastMessage?.id) {
        dismissedAnatomyIdRef.current = null;
      } else {
        setExpandedAnatomy(null);
      }
      return;
    }
    if (
      subject &&
      enteredSubjectAtRef.current != null &&
      lastMessage.createdAt <= enteredSubjectAtRef.current
    ) {
      return;
    }
    if (dismissedAnatomyIdRef.current === lastMessage.id) return;
    setExpandedMap(null);
    setExpandedPreview(null);
    setExpandedField(null);
    setExpandedMolecule(null);
    setExpandedAnatomy({ messageId: lastMessage.id, anatomy: lastParsedAnatomy });
  }, [lastMessage, lastParsedAnatomy, streamingMessageId, subject]);

  // Open latest physics field viewer once the JSON is ready.
  useEffect(() => {
    if (!lastMessage || !lastParsedField) {
      setExpandedField(null);
      return;
    }
    if (streamingMessageId === lastMessage.id) {
      setExpandedField(null);
      dismissedFieldIdRef.current = null;
      return;
    }
    if (
      subject &&
      enteredSubjectAtRef.current != null &&
      lastMessage.createdAt <= enteredSubjectAtRef.current
    ) {
      return;
    }
    if (dismissedFieldIdRef.current === lastMessage.id) return;
    setExpandedMap(null);
    setExpandedPreview(null);
    setExpandedAnatomy(null);
    setExpandedMolecule(null);
    setExpandedField({ messageId: lastMessage.id, field: lastParsedField });
  }, [lastMessage, lastParsedField, streamingMessageId, subject]);

  // Open latest chemistry molecule viewer once the JSON is ready.
  useEffect(() => {
    if (!lastMessage || !lastParsedMolecule) {
      setExpandedMolecule(null);
      return;
    }
    if (streamingMessageId === lastMessage.id) {
      setExpandedMolecule(null);
      dismissedMoleculeIdRef.current = null;
      return;
    }
    if (
      subject &&
      enteredSubjectAtRef.current != null &&
      lastMessage.createdAt <= enteredSubjectAtRef.current
    ) {
      return;
    }
    if (dismissedMoleculeIdRef.current === lastMessage.id) return;
    setExpandedMap(null);
    setExpandedPreview(null);
    setExpandedAnatomy(null);
    setExpandedField(null);
    setExpandedMolecule({ messageId: lastMessage.id, molecule: lastParsedMolecule });
  }, [lastMessage, lastParsedMolecule, streamingMessageId, subject]);

  const handleNewChat = useCallback(() => {
    setExpandedMap(null);
    setExpandedPreview(null);
    setExpandedAnatomy(null);
    setExpandedField(null);
    setExpandedMolecule(null);
    dismissedMapIdRef.current = null;
    dismissedPreviewIdRef.current = null;
    dismissedAnatomyIdRef.current = null;
    dismissedFieldIdRef.current = null;
    dismissedMoleculeIdRef.current = null;
    setNodeDraft(null);
    createConversation();
  }, [createConversation]);

  const subjectConfig = subject ? getSubjectConfig(subject) : null;
  const title =
    headerTitle ??
    (getSubjectTutorTitle(subject) ?? (activeConversation?.title ?? 'Sheyon Ai'));

  const handleSend = subject
    ? (payload: Parameters<typeof sendMessage>[0]) =>
        sendMessage({
          ...payload,
          learningLevel: payload.learningLevel ?? learningLevel,
          subject: payload.subject ?? subject,
          biologyMode:
            subject === 'biology'
              ? (payload.biologyMode ?? activeBiologyMode)
              : payload.biologyMode,
          physicsMode:
            subject === 'physics'
              ? (payload.physicsMode ?? activePhysicsMode)
              : payload.physicsMode,
          chemistryMode:
            subject === 'chemistry'
              ? (payload.chemistryMode ?? activeChemistryMode)
              : payload.chemistryMode,
          geographyMode:
            subject === 'geography'
              ? (payload.geographyMode ?? activeGeographyMode)
              : payload.geographyMode,
          historyMode:
            subject === 'history'
              ? (payload.historyMode ?? activeHistoryMode)
              : payload.historyMode,
          englishMode:
            subject === 'english'
              ? (payload.englishMode ?? activeEnglishMode)
              : payload.englishMode,
          dzongkhaMode:
            subject === 'dzongkha'
              ? (payload.dzongkhaMode ?? activeDzongkhaMode)
              : payload.dzongkhaMode,
        })
    : (payload: Parameters<typeof sendMessage>[0]) =>
        sendMessage({
          ...payload,
          learningLevel: payload.learningLevel ?? learningLevel,
        });

  const handleTutorFollowUp = useCallback(
    (mode: TutorMode, text: string) => {
      setExternalTutorMode(mode);
      void handleSend({
        text,
        tutorMode: mode,
        tutorLevel: activeTutorLevel,
      });
    },
    [handleSend, activeTutorLevel],
  );

  const handleQuizReview = useCallback(
    (summary: string) => {
      setExternalTutorMode('test');
      void handleSend({
        text: summary,
        tutorMode: 'test',
        tutorLevel: activeTutorLevel,
      });
    },
    [handleSend, activeTutorLevel],
  );

  const handleCoachReply = useCallback(
    (text: string) => {
      setExternalTutorMode('no_answer');
      void handleSend({
        text,
        tutorMode: 'no_answer',
        tutorLevel: activeTutorLevel,
      });
    },
    [handleSend, activeTutorLevel],
  );

  const handleExpandMap = useCallback((messageId: string, data: MindElixirData) => {
    dismissedMapIdRef.current = null;
    setExpandedPreview(null);
    setExpandedAnatomy(null);
    setExpandedField(null);
    setExpandedMolecule(null);
    setExpandedMap({ messageId, data });
  }, []);

  const handleExpandPreview = useCallback((messageId: string, preview: ParsedWebsitePreview) => {
    dismissedPreviewIdRef.current = null;
    setExpandedMap(null);
    setExpandedAnatomy(null);
    setExpandedField(null);
    setExpandedMolecule(null);
    setExpandedPreview({ messageId, preview });
  }, []);

  const handleExpandAnatomy = useCallback((messageId: string, anatomy: ParsedAnatomy) => {
    dismissedAnatomyIdRef.current = null;
    setExpandedMap(null);
    setExpandedPreview(null);
    setExpandedField(null);
    setExpandedMolecule(null);
    setExpandedAnatomy({ messageId, anatomy });
  }, []);

  const handleExpandField = useCallback((messageId: string, field: ParsedField) => {
    dismissedFieldIdRef.current = null;
    setExpandedMap(null);
    setExpandedPreview(null);
    setExpandedAnatomy(null);
    setExpandedMolecule(null);
    setExpandedField({ messageId, field });
  }, []);

  const handleExpandMolecule = useCallback((messageId: string, molecule: ParsedMolecule) => {
    dismissedMoleculeIdRef.current = null;
    setExpandedMap(null);
    setExpandedPreview(null);
    setExpandedAnatomy(null);
    setExpandedField(null);
    setExpandedMolecule({ messageId, molecule });
  }, []);

  const handleDismissAnatomy = useCallback(() => {
    if (expandedAnatomy) dismissedAnatomyIdRef.current = expandedAnatomy.messageId;
    setExpandedAnatomy(null);
  }, [expandedAnatomy]);

  const handleDismissField = useCallback(() => {
    if (expandedField) dismissedFieldIdRef.current = expandedField.messageId;
    setExpandedField(null);
  }, [expandedField]);

  const handleDismissMolecule = useCallback(() => {
    if (expandedMolecule) dismissedMoleculeIdRef.current = expandedMolecule.messageId;
    setExpandedMolecule(null);
  }, [expandedMolecule]);

  const handleDismissPreview = useCallback(() => {
    if (expandedPreview) dismissedPreviewIdRef.current = expandedPreview.messageId;
    setExpandedPreview(null);
  }, [expandedPreview]);

  const handleNodeSelect = useCallback((topic: string) => {
    setNodeDraft(`Explain "${topic}" in more detail`);
    setExpandedMap((current) => {
      if (current) dismissedMapIdRef.current = current.messageId;
      return null;
    });
  }, []);

  const mainContent = expandedMolecule ? (
    <MoleculePanel molecule={expandedMolecule.molecule} onDismiss={handleDismissMolecule} />
  ) : expandedField ? (
    <FieldPanel field={expandedField.field} onDismiss={handleDismissField} />
  ) : expandedAnatomy ? (
    <AnatomyPanel anatomy={expandedAnatomy.anatomy} onDismiss={handleDismissAnatomy} />
  ) : expandedPreview ? (
    <WebsitePreviewPanel
      preview={expandedPreview.preview}
      onDismiss={handleDismissPreview}
    />
  ) : expandedMap ? (
    <MindMapExpandedPanel data={expandedMap.data} onNodeSelect={handleNodeSelect} />
  ) : showEmptyState ? (
    <EmptyState
      subject={subject}
      codingMode={subject === 'coding' ? activeCodingMode : null}
      tutorMode={subject === 'personal' ? activeTutorMode : null}
      mathMode={subject === 'math' ? activeMathMode : null}
      biologyMode={subject === 'biology' ? activeBiologyMode : null}
      physicsMode={subject === 'physics' ? activePhysicsMode : null}
      chemistryMode={subject === 'chemistry' ? activeChemistryMode : null}
      geographyMode={subject === 'geography' ? activeGeographyMode : null}
      historyMode={subject === 'history' ? activeHistoryMode : null}
      englishMode={subject === 'english' ? activeEnglishMode : null}
      dzongkhaMode={subject === 'dzongkha' ? activeDzongkhaMode : null}
      equationOpen={subject === 'math' && equationOpen}
      onSelectPrompt={(text) => {
        const inferredPhysicsMode =
          subject === 'physics' ? inferPhysicsModeFromPrompt(text) : null;
        if (inferredPhysicsMode) {
          setActivePhysicsMode(inferredPhysicsMode);
        }
        void handleSend({
          text,
          codingMode: activeCodingMode ?? undefined,
          tutorMode: subject === 'personal' ? activeTutorMode : undefined,
          tutorLevel: subject === 'personal' ? activeTutorLevel : undefined,
          mathMode: subject === 'math' ? (activeMathMode ?? undefined) : undefined,
          biologyMode: subject === 'biology' ? activeBiologyMode : undefined,
          physicsMode:
            subject === 'physics'
              ? (inferredPhysicsMode ?? activePhysicsMode)
              : undefined,
          chemistryMode: subject === 'chemistry' ? activeChemistryMode : undefined,
          geographyMode: subject === 'geography' ? activeGeographyMode : undefined,
          historyMode: subject === 'history' ? activeHistoryMode : undefined,
          englishMode: subject === 'english' ? activeEnglishMode : undefined,
          dzongkhaMode: subject === 'dzongkha' ? activeDzongkhaMode : undefined,
          rag: subject === 'dzongkha' && activeDzongkhaMode === 'library' ? true : undefined,
        });
      }}
    />
  ) : (
    <MessageList
      messages={messages}
      isTyping={isTyping}
      typingStage={typingStage}
      streamingMessageId={streamingMessageId}
      onRegenerate={regenerateLastReply}
      onMindMapNodeSelect={handleNodeSelect}
      onMindMapExpand={handleExpandMap}
      onWebsitePreviewExpand={handleExpandPreview}
      onAnatomyExpand={handleExpandAnatomy}
      onFieldExpand={handleExpandField}
      onMoleculeExpand={handleExpandMolecule}
      showTutorFollowUps={subject === 'personal'}
      onTutorFollowUp={subject === 'personal' ? handleTutorFollowUp : undefined}
      onQuizReview={subject === 'personal' ? handleQuizReview : undefined}
      onCoachReply={subject === 'personal' ? handleCoachReply : undefined}
    />
  );

  return (
    <ThemedView style={[styles.container, persistentSidebar && styles.desktopRow]}>
      {persistentSidebar ? (
        <ConversationSidebar
          variant="persistent"
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleSidebarCollapsed}
        />
      ) : null}

      <View style={styles.mainColumn}>
        <ChatHeader
          title={title}
          nested={nestedHeader}
          subtitle={
            subject === 'personal'
              ? TUTOR_EMPTY_STATE_HINTS[activeTutorMode]
              : subject === 'math' && activeMathMode === 'solve'
                ? MATH_EMPTY_STATE_HINTS.solve
              : subject === 'math' && equationOpen
                ? MATH_EMPTY_STATE_HINTS.equation
                : subject === 'biology'
                  ? BIOLOGY_EMPTY_STATE_HINTS[activeBiologyMode]
                  : subject === 'physics'
                    ? PHYSICS_EMPTY_STATE_HINTS[activePhysicsMode]
                    : subject === 'chemistry'
                      ? CHEMISTRY_EMPTY_STATE_HINTS[activeChemistryMode]
                      : subject === 'geography'
                        ? GEOGRAPHY_EMPTY_STATE_HINTS[activeGeographyMode]
                        : subject === 'history'
                          ? HISTORY_EMPTY_STATE_HINTS[activeHistoryMode]
                          : subject === 'english'
                            ? ENGLISH_EMPTY_STATE_HINTS[activeEnglishMode]
                            : subject === 'dzongkha'
                              ? DZONGKHA_EMPTY_STATE_HINTS[activeDzongkhaMode]
                              : subjectConfig?.modeHint
          }
          onBack={onBack}
          onOpenDrawer={onBack || layoutHasSidebar ? undefined : () => setDrawerOpen(true)}
          onNewChat={handleNewChat}
          showNewChat={!layoutHasSidebar}
          trailing={
            subject === 'personal' ? (
              <TutorLevelHeaderButton
                level={activeTutorLevel}
                onPress={() => setLevelSheetOpen(true)}
              />
            ) : undefined
          }
        />

        <View
          style={[
            styles.flex,
            // Web: document is pinned to visualViewport while the keyboard is open
            // (see useKeyboardInset). Keep this column scroll-contained so the dock
            // stays at the visible bottom. Native still uses the spacer below.
            Platform.OS === 'web' && keyboardInset > 0 ? styles.flexWebKeyboard : null,
          ]}>
          <View
            style={[
              styles.contentSurface,
              { backgroundColor: Platform.OS === 'web' ? theme.background : theme.chatSurface },
            ]}>
            <View style={styles.contentColumn}>{mainContent}</View>
          </View>

          <View
            style={[
              styles.composerDock,
              Platform.OS === 'web' && keyboardInset > 0 ? styles.composerDockWebKeyboard : null,
              { backgroundColor: Platform.OS === 'web' ? 'transparent' : theme.background },
            ]}>
            <View style={styles.composerColumn}>
              <ChatComposer
                conversationId={activeConversationId}
                onSend={handleSend}
                onStop={stopGenerating}
                isGenerating={isGenerating}
                subject={subject}
                subjectChipsMode={subject ? 'workspace' : 'launcher'}
                externalPrompt={nodeDraft}
                onExternalPromptConsumed={() => {
                  setNodeDraft(null);
                }}
                seedText={seedText}
                onSeedTextConsumed={onSeedTextConsumed}
                seedAttachment={seedAttachment}
                seedHomeworkIntent={seedHomeworkIntent}
                onSeedAttachmentConsumed={onSeedAttachmentConsumed}
                onCodingModeChange={setActiveCodingMode}
                onTutorModeChange={setActiveTutorMode}
                tutorLevel={subject === 'personal' ? activeTutorLevel : undefined}
                externalTutorMode={externalTutorMode}
                onExternalTutorModeConsumed={() => setExternalTutorMode(null)}
                onMathModeChange={setActiveMathMode}
                onEquationOpenChange={setEquationOpen}
                onBiologyModeChange={(mode) => {
                  if (mode) setActiveBiologyMode(mode);
                }}
                onPhysicsModeChange={(mode) => {
                  if (mode) setActivePhysicsMode(mode);
                }}
                onChemistryModeChange={(mode) => {
                  if (mode) setActiveChemistryMode(mode);
                }}
                onGeographyModeChange={(mode) => {
                  if (mode) setActiveGeographyMode(mode);
                }}
                onHistoryModeChange={(mode) => {
                  if (mode) setActiveHistoryMode(mode);
                }}
                onEnglishModeChange={(mode) => {
                  if (mode) setActiveEnglishMode(mode);
                }}
                onDzongkhaModeChange={(mode) => {
                  if (mode) setActiveDzongkhaMode(mode);
                }}
                onOpenResearch={onOpenResearch}
              />
            </View>
          </View>
          <View
            style={{
              // Web pins html/body to visualViewport height — extra spacer would
              // double-count and crush the message list. Native still needs it.
              height: Platform.OS === 'web' ? 0 : keyboardInset,
              backgroundColor: theme.background,
              pointerEvents: 'none',
            }}
          />
        </View>
      </View>

      {subject === 'personal' ? (
        <TutorLevelSheet
          visible={levelSheetOpen}
          selected={activeTutorLevel}
          onSelect={setActiveTutorLevel}
          onClose={() => setLevelSheetOpen(false)}
        />
      ) : null}

      {!onBack && !layoutHasSidebar ? (
        <ConversationDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  desktopRow: {
    flexDirection: 'row',
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  flex: {
    flex: 1,
    minHeight: 0,
  },
  flexWebKeyboard: {
    overflow: 'hidden',
  },
  contentSurface: {
    flex: 1,
    minHeight: 0,
  },
  contentColumn: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    minHeight: 0,
  },
  composerDock: {
    flexShrink: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: 'none',
      },
    }),
  },
  composerDockWebKeyboard: {
    zIndex: 5,
  },
  composerColumn: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.one,
    ...Platform.select({
      web: {
        paddingHorizontal: Spacing.three,
      },
    }),
  },
});
