import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CodingModeChips } from '@/components/chat/composer/coding-mode-chips';
import { ComposerChip } from '@/components/chat/composer/composer-chip';
import { MathEquationPanel } from '@/components/chat/composer/math-equation-panel';
import { MathModeChips } from '@/components/chat/composer/math-mode-chips';
import { PersonalTutorModeChips } from '@/components/chat/composer/personal-tutor-mode-chips';
import { AttachmentSheet } from '@/components/chat/composer/attachment-sheet';
import { DocumentsSheet } from '@/components/chat/composer/documents-sheet';
import { ToolsSheet } from '@/components/chat/composer/tools-sheet';
import { OcrScannerModal } from '@/components/chat/ocr-scanner-modal';
import { useComposerState } from '@/components/chat/composer/use-composer-state';
import type { MathComposerHandle } from '@/components/chat/composer/types';
import { ClassicComposer } from '@/components/chat/composer/variants/classic';
import { WorkspaceComposer } from '@/components/chat/composer/variants/workspace';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { useTheme } from '@/hooks/use-theme';
import { useKeyboardInset } from '@/hooks/use-keyboard-inset';
import { hasRealSupabaseSession } from '@/lib/dev-session';
import {
  MindMapChip,
  PersonalTutorChip,
  SubjectChips,
  getSubjectAccentColor,
  getSubjectPlaceholder,
  type SubjectChipsMode,
} from '@/subject';
import { TREE_VIZ_MODE_PLACEHOLDERS } from '@/subject/tree-viz';
import { BiologyLabChips } from '@/subject/biology-lab/biology-lab-chips';
import { PhysicsLabChips } from '@/subject/physics-lab/physics-lab-chips';
import {
  ChemistryLabChips,
  CHEMISTRY_MODE_PLACEHOLDERS,
  DEFAULT_CHEMISTRY_MODE,
} from '@/subject/chemistry-lab';
import {
  GeographyLabChips,
  GEOGRAPHY_MODE_PLACEHOLDERS,
  DEFAULT_GEOGRAPHY_MODE,
} from '@/subject/geography-lab';
import {
  HistoryLabChips,
  HISTORY_MODE_PLACEHOLDERS,
  DEFAULT_HISTORY_MODE,
} from '@/subject/history-lab';
import {
  EnglishLabChips,
  ENGLISH_MODE_PLACEHOLDERS,
  DEFAULT_ENGLISH_MODE,
} from '@/subject/english-lab';
import {
  DzongkhaLabChips,
  DZONGKHA_MODE_PLACEHOLDERS,
  DEFAULT_DZONGKHA_MODE,
} from '@/subject/dzongkha-lab';
import { wrapComposerMath, insertLatex } from '@/lib/latex-insert';
import { CODING_MODE_PLACEHOLDERS } from '@/subject/subjects/coding-mode-prompts';
import { MATH_MODE_PLACEHOLDERS } from '@/subject/subjects/math-composer';
import { DEFAULT_TUTOR_LEVEL, DEFAULT_TUTOR_MODE, TUTOR_MODE_PLACEHOLDERS } from '@/subject/subjects/personal-tutor-modes';
import {
  BIOLOGY_MODE_PLACEHOLDERS,
  DEFAULT_BIOLOGY_MODE,
} from '@/subject/biology-lab/biology-mode-prompts';
import {
  PHYSICS_MODE_PLACEHOLDERS,
  DEFAULT_PHYSICS_MODE,
  inferPhysicsModeFromPrompt,
} from '@/subject/physics-lab';
import { HOMEWORK_INTENT_META, type HomeworkIntent } from '@/lib/homework-intent';
import type {
  BiologyMode,
  ChemistryMode,
  CodingMode,
  DzongkhaMode,
  EnglishMode,
  GeographyMode,
  HistoryMode,
  MathMode,
  PendingAttachment,
  PhysicsMode,
  SendMessagePayload,
  Subject,
  TutorLevel,
  TutorMode,
  TreeVizMode,
} from '@/types/chat';

type ChatComposerProps = {
  conversationId: string | null;
  onSend: (payload: SendMessagePayload) => void | Promise<void>;
  onStop: () => void;
  isGenerating: boolean;
  subject?: Subject;
  subjectChipsMode?: SubjectChipsMode;
  /** Pre-fills the input; activates mind-map mode unless externalCodingMode is set. */
  externalPrompt?: string | null;
  onExternalPromptConsumed?: () => void;
  /** Pre-fills the input without changing tutor/mind-map mode (Research Ask AI). */
  seedText?: string | null;
  onSeedTextConsumed?: () => void;
  /** Attaches a photo from the Camera tab for vision tutoring. */
  seedAttachment?: Omit<PendingAttachment, 'id'> | null;
  /** Camera homework intent — Personal Tutor mode + seeded prompt. */
  seedHomeworkIntent?: HomeworkIntent | null;
  onSeedAttachmentConsumed?: () => void;
  /** With externalPrompt, selects this Coding mode instead of mind-map. */
  externalCodingMode?: CodingMode | null;
  /** Notifies parent when Coding workspace mode chip changes. */
  onCodingModeChange?: (mode: CodingMode | null) => void;
  /** Notifies parent when Personal Tutor workspace mode chip changes. */
  onTutorModeChange?: (mode: TutorMode) => void;
  /** Personal Tutor header level — sent with every message in that workspace. */
  tutorLevel?: TutorLevel;
  /** With a follow-up action, selects this tutor mode on the chips. */
  externalTutorMode?: TutorMode | null;
  onExternalTutorModeConsumed?: () => void;
  /** Notifies parent when Math workspace Solve chip changes. */
  onMathModeChange?: (mode: MathMode | null) => void;
  /** Notifies parent when the Math equation panel is open. */
  onEquationOpenChange?: (open: boolean) => void;
  /** Notifies parent when Biology Anatomy / Simulate mode changes. */
  /** Notifies parent when Biology Graph / Diagram / Lab / Anatomy mode changes. */
  onBiologyModeChange?: (mode: BiologyMode | null) => void;
  /** Notifies parent when Physics Graph / Diagram / Lab / Field mode changes. */
  onPhysicsModeChange?: (mode: PhysicsMode | null) => void;
  /** Notifies parent when Chemistry Graph / Diagram / Lab / Molecule mode changes. */
  onChemistryModeChange?: (mode: ChemistryMode | null) => void;
  /** Notifies parent when Geography Graph / Diagram / Lab / Map mode changes. */
  onGeographyModeChange?: (mode: GeographyMode | null) => void;
  /** Notifies parent when History Timeline / Diagram / Lab / Map mode changes. */
  onHistoryModeChange?: (mode: HistoryMode | null) => void;
  /** Notifies parent when English Essay / Diagram / Lab / Map mode changes. */
  onEnglishModeChange?: (mode: EnglishMode | null) => void;
  /** Notifies parent when Dzongkha Library / Vocab / Diagram / Lab / Map mode changes. */
  onDzongkhaModeChange?: (mode: DzongkhaMode | null) => void;
  /** Home: switch to the Research tab from the Tools sheet. */
  onOpenResearch?: () => void;
};

export function ChatComposer({
  conversationId,
  onSend,
  onStop,
  isGenerating,
  subject,
  subjectChipsMode = 'launcher',
  externalPrompt,
  onExternalPromptConsumed,
  seedText,
  onSeedTextConsumed,
  seedAttachment,
  seedHomeworkIntent,
  onSeedAttachmentConsumed,
  externalCodingMode,
  onCodingModeChange,
  onTutorModeChange,
  tutorLevel,
  externalTutorMode,
  onExternalTutorModeConsumed,
  onMathModeChange,
  onEquationOpenChange,
  onBiologyModeChange,
  onPhysicsModeChange,
  onChemistryModeChange,
  onGeographyModeChange,
  onHistoryModeChange,
  onEnglishModeChange,
  onDzongkhaModeChange,
  onOpenResearch,
}: ChatComposerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  const keyboardVisible = keyboardInset > 60;
  const { session, isDevBypassSession } = useSupabaseAuth();
  const [mindMapActive, setMindMapActive] = useState(false);
  const [ragActive, setRagActive] = useState(false);
  const [treeVizMode, setTreeVizMode] = useState<TreeVizMode | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [documentsSheetOpen, setDocumentsSheetOpen] = useState(false);
  const [codingMode, setCodingMode] = useState<CodingMode | null>(null);
  const [tutorMode, setTutorMode] = useState<TutorMode>(DEFAULT_TUTOR_MODE);
  const [ocrScannerOpen, setOcrScannerOpen] = useState(false);
  const [equationOpen, setEquationOpen] = useState(false);
  const [mathMode, setMathMode] = useState<MathMode | null>(null);
  /** Camera homework session — forces Personal Tutor send until the next message. */
  const [homeworkIntent, setHomeworkIntent] = useState<HomeworkIntent | null>(null);
  const [biologyMode, setBiologyMode] = useState<BiologyMode>(DEFAULT_BIOLOGY_MODE);
  const [physicsMode, setPhysicsMode] = useState<PhysicsMode>(DEFAULT_PHYSICS_MODE);
  const physicsModeManualRef = useRef(false);
  const [chemistryMode, setChemistryMode] = useState<ChemistryMode>(DEFAULT_CHEMISTRY_MODE);
  const [geographyMode, setGeographyMode] = useState<GeographyMode>(DEFAULT_GEOGRAPHY_MODE);
  const [historyMode, setHistoryMode] = useState<HistoryMode>(DEFAULT_HISTORY_MODE);
  const [englishMode, setEnglishMode] = useState<EnglishMode>(DEFAULT_ENGLISH_MODE);
  const [dzongkhaMode, setDzongkhaMode] = useState<DzongkhaMode>(DEFAULT_DZONGKHA_MODE);
  const [mathDisplayMode, setMathDisplayMode] = useState(true);
  const mathInputRef = useRef<MathComposerHandle>(null);

  const isDzongkhaWorkspace = subject === 'dzongkha';
  const isCodingWorkspace = subject === 'coding';
  const isPersonalWorkspace = subject === 'personal';
  const isMathWorkspace = subject === 'math';
  const isBiologyWorkspace = subject === 'biology';
  const isPhysicsWorkspace = subject === 'physics';
  const isChemistryWorkspace = subject === 'chemistry';
  const isGeographyWorkspace = subject === 'geography';
  const isHistoryWorkspace = subject === 'history';
  const isEnglishWorkspace = subject === 'english';

  useEffect(() => {
    if (isBiologyWorkspace) {
      setBiologyMode((current) => current ?? DEFAULT_BIOLOGY_MODE);
      return;
    }
  }, [isBiologyWorkspace]);

  useEffect(() => {
    if (isPhysicsWorkspace) {
      setPhysicsMode((current) => current ?? DEFAULT_PHYSICS_MODE);
      physicsModeManualRef.current = false;
      return;
    }
  }, [isPhysicsWorkspace, conversationId]);

  useEffect(() => {
    if (isChemistryWorkspace) {
      setChemistryMode((current) => current ?? DEFAULT_CHEMISTRY_MODE);
      return;
    }
  }, [isChemistryWorkspace]);

  useEffect(() => {
    if (isGeographyWorkspace) {
      setGeographyMode((current) => current ?? DEFAULT_GEOGRAPHY_MODE);
      return;
    }
  }, [isGeographyWorkspace]);

  useEffect(() => {
    if (isHistoryWorkspace) {
      setHistoryMode((current) => current ?? DEFAULT_HISTORY_MODE);
      return;
    }
  }, [isHistoryWorkspace]);

  useEffect(() => {
    if (isEnglishWorkspace) {
      setEnglishMode((current) => current ?? DEFAULT_ENGLISH_MODE);
      return;
    }
  }, [isEnglishWorkspace]);

  useEffect(() => {
    if (isDzongkhaWorkspace) {
      setDzongkhaMode((current) => current ?? DEFAULT_DZONGKHA_MODE);
      return;
    }
  }, [isDzongkhaWorkspace]);

  const dzongkhaNeedsRealAuth =
    isDzongkhaWorkspace && (!hasRealSupabaseSession(session) || isDevBypassSession);
  const effectiveRagActive =
    ragActive || (isDzongkhaWorkspace && dzongkhaMode === 'library');

  const showDzongkhaAuthMessage = useCallback(() => {
    const message =
      'Dzongkha library needs a Supabase sign-in. In Supabase SQL Editor, run supabase/migrations/0002_confirm_test_users.sql, then sign out and sign in again.';
    if (Platform.OS === 'web') {
      alert(message);
      return;
    }
    Alert.alert('Sign in required', message);
  }, []);

  const handleSend = useCallback(
    async (payload: SendMessagePayload) => {
      if (isDzongkhaWorkspace && dzongkhaNeedsRealAuth) {
        showDzongkhaAuthMessage();
        return;
      }
      const homeworkMeta = homeworkIntent ? HOMEWORK_INTENT_META[homeworkIntent] : null;
      const useHomeworkTutor = !!homeworkMeta && !isPersonalWorkspace && !isMathWorkspace;
      const effectiveTutorMode = isPersonalWorkspace
        ? tutorMode
        : homeworkMeta
          ? homeworkMeta.tutorMode
          : undefined;
      const isCodingSubject = isCodingWorkspace || payload.subject === 'coding';
      const text = isMathWorkspace
        ? wrapComposerMath(payload.text, mathDisplayMode, { force: equationOpen })
        : payload.text;
      let effectivePhysicsMode = physicsMode;
      if (isPhysicsWorkspace && !physicsModeManualRef.current) {
        const inferred = inferPhysicsModeFromPrompt(text);
        if (inferred) {
          effectivePhysicsMode = inferred;
          setPhysicsMode(inferred);
        }
      }
      await onSend({
        ...payload,
        text,
        subject: isDzongkhaWorkspace
          ? 'dzongkha'
          : useHomeworkTutor
            ? 'personal'
            : payload.subject,
        mindMap:
          effectiveRagActive ||
          !!treeVizMode ||
          isDzongkhaWorkspace ||
          isCodingSubject ||
          isPersonalWorkspace ||
          useHomeworkTutor ||
          biologyMode ||
          isPhysicsWorkspace ||
          isChemistryWorkspace ||
          isGeographyWorkspace ||
          isHistoryWorkspace ||
          isEnglishWorkspace
            ? undefined
            : mindMapActive || undefined,
        rag: effectiveRagActive || undefined,
        codingMode: isCodingWorkspace ? (codingMode ?? undefined) : undefined,
        tutorMode: effectiveTutorMode,
        tutorLevel:
          isPersonalWorkspace || useHomeworkTutor
            ? (tutorLevel ?? DEFAULT_TUTOR_LEVEL)
            : undefined,
        mathMode: isMathWorkspace ? (mathMode ?? undefined) : undefined,
        biologyMode: isBiologyWorkspace ? biologyMode : undefined,
        physicsMode: isPhysicsWorkspace ? effectivePhysicsMode : undefined,
        chemistryMode: isChemistryWorkspace ? chemistryMode : undefined,
        geographyMode: isGeographyWorkspace ? geographyMode : undefined,
        historyMode: isHistoryWorkspace ? historyMode : undefined,
        englishMode: isEnglishWorkspace ? englishMode : undefined,
        dzongkhaMode: isDzongkhaWorkspace ? dzongkhaMode : undefined,
        treeVizMode: treeVizMode ?? undefined,
      });
      if (homeworkIntent) setHomeworkIntent(null);
    },
    [
      codingMode,
      tutorMode,
      tutorLevel,
      mathMode,
      biologyMode,
      physicsMode,
      chemistryMode,
      geographyMode,
      historyMode,
      englishMode,
      dzongkhaMode,
      equationOpen,
      mathDisplayMode,
      mindMapActive,
      treeVizMode,
      effectiveRagActive,
      homeworkIntent,
      isCodingWorkspace,
      isPersonalWorkspace,
      isMathWorkspace,
      isBiologyWorkspace,
      isPhysicsWorkspace,
      isChemistryWorkspace,
      isGeographyWorkspace,
      isHistoryWorkspace,
      isEnglishWorkspace,
      isDzongkhaWorkspace,
      dzongkhaNeedsRealAuth,
      onSend,
      showDzongkhaAuthMessage,
    ],
  );

  const state = useComposerState({
    conversationId,
    onSend: handleSend,
    onStop,
    isGenerating,
    fixedSubject: subject,
  });

  // Apply external prompt (mind-map node tap or website refine draft).
  useEffect(() => {
    if (!externalPrompt) return;
    state.setText(externalPrompt);
    if (externalCodingMode && isCodingWorkspace) {
      setCodingMode(externalCodingMode);
      setMindMapActive(false);
    } else if (
      isCodingWorkspace ||
      isPersonalWorkspace ||
      isBiologyWorkspace ||
      isPhysicsWorkspace ||
      isChemistryWorkspace ||
      isGeographyWorkspace ||
      isHistoryWorkspace ||
      isEnglishWorkspace ||
      isDzongkhaWorkspace
    ) {
      setMindMapActive(false);
    } else {
      setMindMapActive(true);
      setRagActive(false);
      setTreeVizMode(null);
    }
    onExternalPromptConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalPrompt, externalCodingMode]);

  // Research "Ask AI" seeds the composer without changing workspace mode.
  useEffect(() => {
    if (!seedText) return;
    state.setText(seedText);
    onSeedTextConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedText]);

  // Camera tab seeds a photo (+ optional homework intent) for DeepSeek Vision.
  useEffect(() => {
    if (!seedAttachment) return;
    state.addAttachment(seedAttachment);
    if (seedHomeworkIntent) {
      const meta = HOMEWORK_INTENT_META[seedHomeworkIntent];
      setHomeworkIntent(seedHomeworkIntent);
      state.setText(meta.seedText);
      state.setHint(meta.hint);
      if (isPersonalWorkspace) {
        setTutorMode(meta.tutorMode);
      }
    } else {
      state.setHint('Photo attached — add a question or send');
    }
    onSeedAttachmentConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedAttachment, seedHomeworkIntent]);

  // When homework lands in Personal Tutor workspace, keep chips in sync.
  useEffect(() => {
    if (!homeworkIntent || !isPersonalWorkspace) return;
    setTutorMode(HOMEWORK_INTENT_META[homeworkIntent].tutorMode);
  }, [homeworkIntent, isPersonalWorkspace]);

  // Coding and Personal Tutor never use mind-map mode; clear stale chip state.
  useEffect(() => {
    if (
      isCodingWorkspace ||
      isPersonalWorkspace ||
      isBiologyWorkspace ||
      isPhysicsWorkspace ||
      isChemistryWorkspace ||
      isGeographyWorkspace ||
      isHistoryWorkspace ||
      isEnglishWorkspace ||
      isDzongkhaWorkspace ||
      state.activeSubject === 'coding'
    ) {
      setMindMapActive(false);
      setRagActive(false);
      setTreeVizMode(null);
    }
  }, [
    isCodingWorkspace,
    isPersonalWorkspace,
    isBiologyWorkspace,
    isPhysicsWorkspace,
    isChemistryWorkspace,
    isGeographyWorkspace,
    isHistoryWorkspace,
    isEnglishWorkspace,
    isDzongkhaWorkspace,
    state.activeSubject,
  ]);

  useEffect(() => {
    onCodingModeChange?.(isCodingWorkspace ? codingMode : null);
  }, [codingMode, isCodingWorkspace, onCodingModeChange]);

  useEffect(() => {
    if (isPersonalWorkspace) onTutorModeChange?.(tutorMode);
  }, [tutorMode, isPersonalWorkspace, onTutorModeChange]);

  useEffect(() => {
    if (!externalTutorMode || !isPersonalWorkspace) return;
    setTutorMode(externalTutorMode);
    onExternalTutorModeConsumed?.();
  }, [externalTutorMode, isPersonalWorkspace, onExternalTutorModeConsumed]);

  useEffect(() => {
    onMathModeChange?.(isMathWorkspace ? mathMode : null);
  }, [mathMode, isMathWorkspace, onMathModeChange]);

  useEffect(() => {
    onEquationOpenChange?.(isMathWorkspace && equationOpen);
  }, [equationOpen, isMathWorkspace, onEquationOpenChange]);

  useEffect(() => {
    onBiologyModeChange?.(isBiologyWorkspace ? biologyMode : null);
  }, [biologyMode, isBiologyWorkspace, onBiologyModeChange]);

  useEffect(() => {
    onPhysicsModeChange?.(isPhysicsWorkspace ? physicsMode : null);
  }, [physicsMode, isPhysicsWorkspace, onPhysicsModeChange]);

  useEffect(() => {
    onChemistryModeChange?.(isChemistryWorkspace ? chemistryMode : null);
  }, [chemistryMode, isChemistryWorkspace, onChemistryModeChange]);

  useEffect(() => {
    onGeographyModeChange?.(isGeographyWorkspace ? geographyMode : null);
  }, [geographyMode, isGeographyWorkspace, onGeographyModeChange]);

  useEffect(() => {
    onHistoryModeChange?.(isHistoryWorkspace ? historyMode : null);
  }, [historyMode, isHistoryWorkspace, onHistoryModeChange]);

  useEffect(() => {
    onEnglishModeChange?.(isEnglishWorkspace ? englishMode : null);
  }, [englishMode, isEnglishWorkspace, onEnglishModeChange]);

  useEffect(() => {
    onDzongkhaModeChange?.(isDzongkhaWorkspace ? dzongkhaMode : null);
  }, [dzongkhaMode, isDzongkhaWorkspace, onDzongkhaModeChange]);

  const handleMindMapToggle = useCallback(() => {
    setMindMapActive((prev) => {
      const next = !prev;
      if (next) {
        setRagActive(false);
        setTreeVizMode(null);
      }
      return next;
    });
  }, []);

  const handleDocumentsToggle = useCallback(() => {
    setRagActive((prev) => {
      const next = !prev;
      if (next) {
        setMindMapActive(false);
        setTreeVizMode(null);
        setDocumentsSheetOpen(true);
      }
      return next;
    });
  }, []);

  const handleSelectTreeViz = useCallback((mode: TreeVizMode) => {
    setTreeVizMode((current) => {
      const next = current === mode ? null : mode;
      if (next) {
        setMindMapActive(false);
        setRagActive(false);
      }
      return next;
    });
  }, []);

  const insertMathSnippet = useCallback(
    (snippet: string) => {
      if (mathInputRef.current) {
        mathInputRef.current.insertLatex(snippet);
        mathInputRef.current.focus();
        return;
      }
      const result = insertLatex(state.text, { start: state.text.length, end: state.text.length }, snippet);
      state.setText(result.text);
    },
    [state],
  );

  const jumpNextMathSlot = useCallback(() => {
    mathInputRef.current?.jumpNextPlaceholder();
    mathInputRef.current?.focus();
  }, []);

  const deleteMathBackward = useCallback(() => {
    mathInputRef.current?.deleteBackward();
    mathInputRef.current?.focus();
  }, []);

  const placeholder = useMemo(() => {
    if (isDzongkhaWorkspace) {
      return DZONGKHA_MODE_PLACEHOLDERS[dzongkhaMode];
    }
    if (isCodingWorkspace && codingMode) {
      return CODING_MODE_PLACEHOLDERS[codingMode];
    }
    if (isPersonalWorkspace) {
      return TUTOR_MODE_PLACEHOLDERS[tutorMode];
    }
    if (isMathWorkspace && mathMode === 'solve') {
      return MATH_MODE_PLACEHOLDERS.solve;
    }
    if (isMathWorkspace && equationOpen) {
      return MATH_MODE_PLACEHOLDERS.equation;
    }
    if (isBiologyWorkspace) {
      return BIOLOGY_MODE_PLACEHOLDERS[biologyMode];
    }
    if (isPhysicsWorkspace) {
      return PHYSICS_MODE_PLACEHOLDERS[physicsMode];
    }
    if (isChemistryWorkspace) {
      return CHEMISTRY_MODE_PLACEHOLDERS[chemistryMode];
    }
    if (isGeographyWorkspace) {
      return GEOGRAPHY_MODE_PLACEHOLDERS[geographyMode];
    }
    if (isHistoryWorkspace) {
      return HISTORY_MODE_PLACEHOLDERS[historyMode];
    }
    if (isEnglishWorkspace) {
      return ENGLISH_MODE_PLACEHOLDERS[englishMode];
    }
    if (mindMapActive) {
      return 'Describe a topic for your mind map...';
    }
    if (treeVizMode) {
      return TREE_VIZ_MODE_PLACEHOLDERS[treeVizMode];
    }
    if (ragActive) {
      return 'Ask a question about your documents...';
    }
    return getSubjectPlaceholder(state.activeSubject);
  }, [
    codingMode,
    isCodingWorkspace,
    isDzongkhaWorkspace,
    isPersonalWorkspace,
    isMathWorkspace,
    isBiologyWorkspace,
    isPhysicsWorkspace,
    isChemistryWorkspace,
    isGeographyWorkspace,
    isHistoryWorkspace,
    isEnglishWorkspace,
    mathMode,
    biologyMode,
    physicsMode,
    chemistryMode,
    geographyMode,
    historyMode,
    englishMode,
    dzongkhaMode,
    equationOpen,
    mindMapActive,
    treeVizMode,
    ragActive,
    state.activeSubject,
    tutorMode,
  ]);

  const modeDisabled = isGenerating || state.isSending;

  const variantProps = {
    text: state.text,
    setText: state.setText,
    inputPlaceholder: placeholder,
    attachments: effectiveRagActive ? [] : state.attachments,
    onRemoveAttachment: state.removeAttachment,
    onOpenAttachmentSheet: () => state.setSheetOpen(true),
    onAppendTranscript: state.onAppendTranscript,
    hint: state.hint,
    setHint: state.setHint,
    isGenerating,
    isSending: state.isSending,
    canSend: dzongkhaNeedsRealAuth
      ? false
      : effectiveRagActive
        ? state.text.trim().length > 0 && !isGenerating && !state.isSending
        : state.canSend,
    onSend: () => void state.handleSend(),
    onStop,
    onPrimaryPress: state.handlePrimaryPress,
    equationVisual: isMathWorkspace && equationOpen,
    equationDisplayMode: mathDisplayMode,
    equationInputRef: mathInputRef,
  };

  const isWorkspace = subjectChipsMode === 'workspace' && !!subject;
  const isWebShell = Platform.OS === 'web';
  const useCard = isWorkspace || isWebShell;
  const subjectAccent = getSubjectAccentColor(subject) ?? theme.accent;
  const showHomeTools = !isWorkspace;
  const toolsChipActive = ragActive || !!treeVizMode;

  const composerInput = useCard ? (
    <WorkspaceComposer
      {...variantProps}
      accentColor={isWebShell && !subject ? theme.sendButton : subjectAccent}
    />
  ) : (
    <ClassicComposer {...variantProps} />
  );

  return (
    <View
      style={[
        styles.wrapper,
        useCard && styles.wrapperWorkspace,
        isWebShell && styles.wrapperWeb,
        {
          paddingBottom:
            keyboardInset > 0
              ? Spacing.one
              : Math.max(insets.bottom, useCard ? Spacing.three : Spacing.two),
          borderTopColor: useCard ? 'transparent' : theme.headerBorder,
          backgroundColor: useCard ? 'transparent' : theme.background,
        },
      ]}>
      <View
        style={
          useCard
            ? [
                styles.workspaceCard,
                isWebShell && styles.workspaceCardWeb,
                {
                  backgroundColor: theme.composerBackground,
                  borderColor: theme.composerBorder,
                  ...(Platform.OS === 'web' ? null : { shadowColor: theme.composerShadow }),
                },
              ]
            : undefined
        }>
      {dzongkhaNeedsRealAuth ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.dzongkhaNotice}>
          Dzongkha library requires Supabase sign-in. Confirm test users in Supabase, then sign in
          again.
        </ThemedText>
      ) : null}
      {state.isSending && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.uploading}>
          Uploading…
        </ThemedText>
      )}
      <ScrollView
        horizontal
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        style={styles.tools}
        contentContainerStyle={styles.toolsContent}>
        {!effectiveRagActive && (
          <SubjectChips
            mode={subjectChipsMode}
            activeSubject={state.activeSubject}
            disabled={modeDisabled}
          />
        )}
        {!effectiveRagActive && !isWorkspace && subject !== 'personal' && (
          <PersonalTutorChip mode={subjectChipsMode} disabled={modeDisabled} />
        )}
        {isCodingWorkspace ? (
          <CodingModeChips
            activeMode={codingMode}
            onSelect={setCodingMode}
            disabled={modeDisabled}
            scroll={false}
          />
        ) : isPersonalWorkspace ? (
          <PersonalTutorModeChips
            activeMode={tutorMode}
            onSelect={setTutorMode}
            disabled={modeDisabled}
            scroll={false}
          />
        ) : isBiologyWorkspace ? (
          <BiologyLabChips
            activeMode={biologyMode}
            onSelect={setBiologyMode}
            disabled={modeDisabled}
          />
        ) : isPhysicsWorkspace ? (
          <PhysicsLabChips
            activeMode={physicsMode}
            onSelect={(mode) => {
              physicsModeManualRef.current = true;
              setPhysicsMode(mode);
            }}
            disabled={modeDisabled}
          />
        ) : isChemistryWorkspace ? (
          <ChemistryLabChips
            activeMode={chemistryMode}
            onSelect={setChemistryMode}
            disabled={modeDisabled}
          />
        ) : isGeographyWorkspace ? (
          <GeographyLabChips
            activeMode={geographyMode}
            onSelect={setGeographyMode}
            disabled={modeDisabled}
          />
        ) : isHistoryWorkspace ? (
          <HistoryLabChips
            activeMode={historyMode}
            onSelect={setHistoryMode}
            disabled={modeDisabled}
          />
        ) : isEnglishWorkspace ? (
          <EnglishLabChips
            activeMode={englishMode}
            onSelect={setEnglishMode}
            disabled={modeDisabled}
          />
        ) : isDzongkhaWorkspace ? (
          <DzongkhaLabChips
            activeMode={dzongkhaMode}
            onSelect={setDzongkhaMode}
            disabled={modeDisabled}
          />
        ) : isMathWorkspace ? (
          <MathModeChips
            equationOpen={equationOpen}
            onToggleEquation={() => {
              setEquationOpen((open) => {
                const next = !open;
                if (next) Keyboard.dismiss();
                return next;
              });
            }}
            solveActive={mathMode === 'solve'}
            onToggleSolve={() => setMathMode((mode) => (mode === 'solve' ? null : 'solve'))}
            disabled={modeDisabled}
          />
        ) : null}
        {!effectiveRagActive &&
          !isCodingWorkspace &&
          !isPersonalWorkspace &&
          !isBiologyWorkspace &&
          !isPhysicsWorkspace &&
          !isChemistryWorkspace &&
          !isGeographyWorkspace &&
          !isHistoryWorkspace &&
          !isEnglishWorkspace &&
          !isDzongkhaWorkspace &&
          state.activeSubject !== 'coding' && (
          <MindMapChip
            active={mindMapActive}
            onToggle={handleMindMapToggle}
            disabled={modeDisabled}
          />
        )}
        {showHomeTools && (
          <ComposerChip
            label="Tools"
            icon={{ ios: 'wrench.and.screwdriver', android: 'build', web: 'build' }}
            iconColor="#64748B"
            active={toolsChipActive}
            disabled={modeDisabled}
            onPress={() => setToolsOpen(true)}
          />
        )}
      </ScrollView>
      {isMathWorkspace && equationOpen && !keyboardVisible ? (
        <MathEquationPanel
          displayMode={mathDisplayMode}
          onDisplayModeChange={setMathDisplayMode}
          onInsert={insertMathSnippet}
          onNextSlot={jumpNextMathSlot}
          onBackspace={deleteMathBackward}
          onClose={() => setEquationOpen(false)}
          disabled={modeDisabled}
        />
      ) : null}
      {composerInput}
      </View>
      <AttachmentSheet
        visible={state.sheetOpen}
        onClose={() => state.setSheetOpen(false)}
        onAdd={state.addAttachment}
        onError={state.setHint}
        onHint={state.setHint}
        onScanText={() => setOcrScannerOpen(true)}
        documentsOnly={effectiveRagActive}
      />
      {showHomeTools ? (
        <>
          <ToolsSheet
            visible={toolsOpen}
            onClose={() => setToolsOpen(false)}
            documentsActive={ragActive}
            onToggleDocuments={handleDocumentsToggle}
            treeVizMode={treeVizMode}
            onSelectTreeViz={handleSelectTreeViz}
            onOpenResearch={onOpenResearch}
            disabled={modeDisabled}
          />
          <DocumentsSheet
            visible={documentsSheetOpen}
            onClose={() => setDocumentsSheetOpen(false)}
            onHint={state.setHint}
          />
        </>
      ) : null}
      <OcrScannerModal
        visible={ocrScannerOpen}
        onClose={() => setOcrScannerOpen(false)}
        onAdd={state.addAttachment}
        onAppendTranscript={state.onAppendTranscript}
        onError={state.setHint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  wrapperFloating: {
    borderTopWidth: 0,
    paddingHorizontal: 0,
  },
  wrapperCompact: {
    borderTopWidth: 0,
    backgroundColor: 'transparent',
  },
  wrapperWorkspace: {
    borderTopWidth: 0,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    backgroundColor: 'transparent',
  },
  wrapperWeb: {
    paddingHorizontal: 0,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.two,
  },
  workspaceCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 5,
      },
      default: {
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
      },
    }),
  },
  workspaceCardWeb: {
    borderRadius: 22,
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 28px rgba(26, 25, 21, 0.08)',
      },
    }),
  },
  tools: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: Spacing.two,
  },
  toolsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingRight: Spacing.three,
  },
  toolsContentFloating: {
    paddingHorizontal: Spacing.two,
  },
  uploading: {
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  dzongkhaNotice: {
    textAlign: 'center',
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
});
