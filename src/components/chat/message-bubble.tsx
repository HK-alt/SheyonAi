import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AssistantAvatar } from '@/components/chat/assistant-avatar';
import { MathFormula } from '@/components/chat/math-formula';
import { MarkdownText } from '@/components/chat/markdown-text';
import { MessageActions } from '@/components/chat/message-actions';
import { KeyTermsRow } from '@/components/chat/key-terms-row';
import { CoachCard } from '@/components/chat/coach-card';
import { FlashcardDeck } from '@/components/chat/flashcard-deck';
import { HintCard } from '@/components/chat/hint-card';
import { LessonCard } from '@/components/chat/lesson-card';
import { PlanCard } from '@/components/chat/plan-card';
import { QuizCard } from '@/components/chat/quiz-card';
import { SolveCard } from '@/components/chat/solve-card';
import { TutorFollowUps } from '@/components/chat/tutor-follow-ups';
import { MessageAttachments } from '@/components/chat/message-attachments';
import { CitationCard } from '@/components/rag/citation-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/context/theme-preference-context';
import { extractStandaloneEquation, wrapComposerMath } from '@/lib/latex-insert';
import { extractKeyTerms } from '@/lib/markdown-enrich';
import { hasExplicitMathDelimiters } from '@/lib/math-preprocess';
import { hasMathDelimiters } from '@/lib/markdown-math';
import { isMindMapPending } from '@/subject/mind-map-parser';
import { resolveMindMapContent, isMindMapFallback } from '@/subject/mind-map-inference';
import { MindMapCard } from '@/subject/mind-map-card';
import { MindMapActions } from '@/subject/mind-map-actions';
import {
  isTutorFlashcardsPending,
  tryParseTutorFlashcards,
} from '@/subject/flashcard-parser';
import { tryParseTutorCoach } from '@/subject/coach-parser';
import { tryParseTutorHint } from '@/subject/hint-parser';
import { tryParseTutorLesson } from '@/subject/lesson-parser';
import { tryParseTutorPlan } from '@/subject/plan-parser';
import { tryParseTutorSolve } from '@/subject/solve-parser';
import {
  isTutorQuizPending,
  tryParseTutorQuiz,
} from '@/subject/quiz-parser';
import { AnatomyCard } from '@/subject/biology-lab/anatomy-card';
import {
  isAnatomyPending,
  tryParseAnatomy,
  type ParsedAnatomy,
} from '@/subject/biology-lab/anatomy-parser';
import { buildDiagramViewerHtml } from '@/subject/biology-lab/diagram-html';
import {
  isDiagramPending,
  tryParseDiagram,
} from '@/subject/biology-lab/diagram-parser';
import {
  buildGraphViewerHtml,
  isScienceGraphPending,
  tryParseScienceGraph,
  resolveScienceGraphContent,
  isScienceGraphFallback,
} from '@/subject/science-graph';
import {
  buildTreeVizHtml,
  isTreeVizPending,
  tryParseTreeViz,
} from '@/subject/tree-viz';
import { FieldCard } from '@/subject/physics-lab/field-card';
import {
  isFieldPending,
  tryParseField,
  resolveFieldContent,
  type ParsedField,
} from '@/subject/physics-lab/field-parser';
import { MoleculeCard } from '@/subject/chemistry-lab/molecule-card';
import {
  isMoleculePending,
  resolveMoleculeContent,
  type ParsedMolecule,
} from '@/subject/chemistry-lab/molecule-parser';
import {
  isWebsitePreviewPending,
  tryParseWebsitePreview,
  type ParsedWebsitePreview,
} from '@/subject/website-preview-parser';
import { WebsitePreviewCard } from '@/subject/website-preview-card';
import { mathPadPalette } from '@/subject/subjects/math-composer';
import type { MindElixirData } from '@/subject/mind-map-types';
import type { Message, TutorMode } from '@/types/chat';

type MessageBubbleProps = {
  message: Message;
  isStreaming?: boolean;
  isLastAssistant?: boolean;
  onRegenerate?: () => void;
  onMindMapNodeSelect?: (topic: string) => void;
  onMindMapExpand?: (messageId: string, data: MindElixirData) => void;
  onWebsitePreviewExpand?: (messageId: string, preview: ParsedWebsitePreview) => void;
  onAnatomyExpand?: (messageId: string, anatomy: ParsedAnatomy) => void;
  onFieldExpand?: (messageId: string, field: ParsedField) => void;
  onMoleculeExpand?: (messageId: string, molecule: ParsedMolecule) => void;
  showTutorFollowUps?: boolean;
  onTutorFollowUp?: (mode: TutorMode, text: string) => void;
  onQuizReview?: (summary: string) => void;
  onCoachReply?: (text: string) => void;
};

function PendingContent({
  content,
  label,
  isStreaming,
}: {
  content: string;
  label: string;
  isStreaming: boolean;
}) {
  const theme = useTheme();
  const pulse = useSharedValue(0.55);

  useEffect(() => {
    const breathe = { duration: 720, easing: Easing.inOut(Easing.sin) };
    pulse.value = withRepeat(withSequence(withTiming(1, breathe), withTiming(0.5, breathe)), -1, false);
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const stripped = content.replace(/```[\s\S]*$/, '').trim();
  return (
    <>
      {stripped.length > 0 && <MarkdownText content={stripped} isStreaming={isStreaming} />}
      <Animated.Text style={[styles.pending, { color: theme.accent }, pulseStyle]}>
        {label}
      </Animated.Text>
    </>
  );
}

function StreamingCursor() {
  const theme = useTheme();
  const opacity = useSharedValue(1);

  useEffect(() => {
    const breathe = { duration: 520, easing: Easing.inOut(Easing.sin) };
    opacity.value = withRepeat(withSequence(withTiming(0.2, breathe), withTiming(1, breathe)), -1, false);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.cursorRow}>
      <Animated.View style={[styles.cursorGlow, { backgroundColor: theme.accentMuted }, animatedStyle]}>
        <View style={[styles.cursor, { backgroundColor: theme.accent }]} />
      </Animated.View>
    </View>
  );
}

export function MessageBubble({
  message,
  isStreaming = false,
  isLastAssistant = false,
  onRegenerate,
  onMindMapExpand,
  onWebsitePreviewExpand,
  onAnatomyExpand,
  onFieldExpand,
  onMoleculeExpand,
  showTutorFollowUps = false,
  onTutorFollowUp,
  onQuizReview,
  onCoachReply,
}: MessageBubbleProps) {
  const theme = useTheme();
  const { resolvedScheme } = useThemePreference();
  const paper = mathPadPalette(resolvedScheme);
  const isUser = message.role === 'user';
  const parsedMindMap =
    !isUser && message.mindMap
      ? resolveMindMapContent(message.content, { preferInfer: !isStreaming })
      : null;
  const mindMapUsedFallback =
    !isUser && !!message.mindMap && !isStreaming && isMindMapFallback(message.content);
  const parsedWebsitePreview =
    !isUser && message.websitePreview ? tryParseWebsitePreview(message.content) : null;
  const parsedAnatomy =
    !isUser && message.biologyAnatomy ? tryParseAnatomy(message.content) : null;
  const parsedDiagram =
    !isUser && message.biologyDiagram ? tryParseDiagram(message.content) : null;
  const diagramPreview: ParsedWebsitePreview | null = parsedDiagram
    ? {
        introText: parsedDiagram.introText,
        htmlDocument: buildDiagramViewerHtml(parsedDiagram),
        title: parsedDiagram.title,
      }
    : null;
  const parsedScienceGraph =
    !isUser && message.scienceGraph
      ? resolveScienceGraphContent(message.content, { preferInfer: !isStreaming })
      : null;
  const scienceGraphUsedFallback =
    !isUser &&
    !!message.scienceGraph &&
    !isStreaming &&
    isScienceGraphFallback(message.content);
  const scienceGraphPreview: ParsedWebsitePreview | null = parsedScienceGraph
    ? {
        introText: parsedScienceGraph.introText,
        htmlDocument: buildGraphViewerHtml(parsedScienceGraph),
        title: parsedScienceGraph.title,
      }
    : null;
  const parsedTreeViz =
    !isUser && message.treeViz ? tryParseTreeViz(message.content) : null;
  const treeVizPreview: ParsedWebsitePreview | null = parsedTreeViz
    ? {
        introText: parsedTreeViz.introText,
        htmlDocument: buildTreeVizHtml(parsedTreeViz),
        title: parsedTreeViz.title,
      }
    : null;
  const parsedField =
    !isUser && message.physicsField
      ? resolveFieldContent(message.content, { preferInfer: !isStreaming })
      : null;
  const parsedMolecule =
    !isUser && message.chemistryMolecule
      ? resolveMoleculeContent(message.content, {
          preferInfer: !isStreaming,
        })
      : null;
  const parsedFlashcards =
    !isUser && message.flashcards ? tryParseTutorFlashcards(message.content) : null;
  const parsedQuiz = !isUser && message.quiz ? tryParseTutorQuiz(message.content) : null;
  const parsedHint =
    !isUser && message.tutorHint ? tryParseTutorHint(message.content) : null;
  const parsedCoach =
    !isUser && message.tutorCoach ? tryParseTutorCoach(message.content) : null;
  const parsedLesson =
    !isUser && message.tutorLesson ? tryParseTutorLesson(message.content) : null;
  const parsedSolve =
    !isUser && message.tutorSolve ? tryParseTutorSolve(message.content) : null;
  const parsedPlan =
    !isUser && message.tutorPlan ? tryParseTutorPlan(message.content) : null;
  const mindMapPending =
    !isUser && !!message.mindMap && isMindMapPending(message.content, isStreaming);
  const websitePreviewPending =
    !isUser &&
    !!message.websitePreview &&
    !message.biologyDiagram &&
    !message.scienceGraph &&
    !message.treeViz &&
    isWebsitePreviewPending(message.content, isStreaming);
  const anatomyPending =
    !isUser && !!message.biologyAnatomy && isAnatomyPending(message.content, isStreaming);
  const diagramPending =
    !isUser &&
    !!message.biologyDiagram &&
    (isDiagramPending(message.content, isStreaming) ||
      (!!message.websitePreview && isWebsitePreviewPending(message.content, isStreaming)));
  const scienceGraphPending =
    !isUser &&
    !!message.scienceGraph &&
    (isScienceGraphPending(message.content, isStreaming) ||
      (!!message.websitePreview &&
        !scienceGraphPreview &&
        isWebsitePreviewPending(message.content, isStreaming)));
  const treeVizPending =
    !isUser &&
    !!message.treeViz &&
    (isTreeVizPending(message.content, isStreaming) ||
      (!!message.websitePreview &&
        !treeVizPreview &&
        isWebsitePreviewPending(message.content, isStreaming)));
  const fieldPending =
    !isUser && !!message.physicsField && isFieldPending(message.content, isStreaming);
  const moleculePending =
    !isUser &&
    !!message.chemistryMolecule &&
    (isMoleculePending(message.content, isStreaming) ||
      (isStreaming && !parsedMolecule));
  const flashcardsPending =
    !isUser &&
    !!message.flashcards &&
    isTutorFlashcardsPending(message.content, isStreaming);
  const quizPending =
    !isUser && !!message.quiz && isTutorQuizPending(message.content, isStreaming);
  const isParsedCard = Boolean(
    parsedMindMap ||
      parsedWebsitePreview ||
      parsedAnatomy ||
      diagramPreview ||
      scienceGraphPreview ||
      treeVizPreview ||
      parsedField ||
      parsedMolecule ||
      parsedFlashcards ||
      parsedQuiz,
  );
  const showMessageActions =
    !isStreaming &&
    (isParsedCard
      ? isLastAssistant && !!onRegenerate
      : message.content.length > 0);
  const keyTerms = !isUser && !isStreaming ? extractKeyTerms(message.content) : [];
  const userHasMath = isUser && hasMathDelimiters(message.content);
  const standaloneEquation = isUser ? extractStandaloneEquation(message.content) : null;
  const userMathContent =
    userHasMath && !standaloneEquation && !hasExplicitMathDelimiters(message.content)
      ? wrapComposerMath(message.content, true, { force: true })
      : message.content;

  if (isUser) {
    if (standaloneEquation) {
      return (
        <View style={styles.userRow}>
          <View
            style={[
              styles.equationPlate,
              {
                backgroundColor: paper.surface,
                borderColor: paper.line,
                ...Platform.select({
                  ios: {
                    shadowColor: theme.accent,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.12,
                    shadowRadius: 14,
                  },
                  android: { elevation: 3 },
                }),
              },
            ]}>
            <View style={[styles.equationRail, { backgroundColor: theme.accent }]} />
            <View style={styles.equationInner}>
              {message.attachments && message.attachments.length > 0 && (
                <MessageAttachments attachments={message.attachments} />
              )}
              <View style={styles.equationHeader}>
                <View style={[styles.equationDot, { backgroundColor: theme.accent }]} />
                <ThemedText style={[styles.equationKicker, { color: theme.accent }]}>EQUATION</ThemedText>
              </View>
              {message.content.length > 0 ? (
                <MathFormula
                  latex={standaloneEquation.latex}
                  displayMode={standaloneEquation.displayMode}
                  color={paper.ink}
                />
              ) : null}
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.userRow}>
        <View
          style={[
            styles.userBubble,
            Platform.OS === 'web' && styles.userBubbleWeb,
            {
              backgroundColor: theme.userBubble,
              ...Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 6,
                },
                android: { elevation: 1 },
              }),
            },
          ]}>
          {message.attachments && message.attachments.length > 0 && (
            <MessageAttachments attachments={message.attachments} />
          )}
          {message.content.length > 0 &&
            (userHasMath ? (
              <MarkdownText content={userMathContent} textColor={theme.userBubbleText} />
            ) : (
              <ThemedText style={[styles.messageText, { color: theme.userBubbleText }]}>
                {message.content}
              </ThemedText>
            ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.assistantRow, Platform.OS === 'web' && styles.assistantRowWeb]}>
      {Platform.OS === 'web' ? null : <AssistantAvatar />}
      <View style={styles.assistantContent}>
        {Platform.OS === 'web' ? null : (
          <ThemedText type="smallBold" style={styles.assistantLabel}>
            Sheyon Ai
          </ThemedText>
        )}

        {parsedMindMap ? (
          <>
            {parsedMindMap.introText.length > 0 && (
              <MarkdownText content={parsedMindMap.introText} />
            )}
            {mindMapUsedFallback ? (
              <ThemedText themeColor="textSecondary" style={styles.fallbackNote}>
                Used teaching fallback mind map — model returned unexpected format.
              </ThemedText>
            ) : null}
            <MindMapCard
              data={parsedMindMap.data}
              onPress={() => onMindMapExpand?.(message.id, parsedMindMap.data)}
            />
            {!isStreaming && <MindMapActions data={parsedMindMap.data} />}
          </>
        ) : diagramPreview ? (
          <>
            {diagramPreview.introText.length > 0 && (
              <MarkdownText content={diagramPreview.introText} />
            )}
            <WebsitePreviewCard
              preview={diagramPreview}
              onPress={() => onWebsitePreviewExpand?.(message.id, diagramPreview)}
            />
          </>
        ) : scienceGraphPreview ? (
          <>
            {scienceGraphPreview.introText.length > 0 && (
              <MarkdownText content={scienceGraphPreview.introText} />
            )}
            {scienceGraphUsedFallback ? (
              <ThemedText themeColor="textSecondary" style={styles.fallbackNote}>
                Used teaching fallback graph — model returned unexpected format.
              </ThemedText>
            ) : null}
            <WebsitePreviewCard
              preview={scienceGraphPreview}
              onPress={() => onWebsitePreviewExpand?.(message.id, scienceGraphPreview)}
            />
          </>
        ) : treeVizPreview ? (
          <>
            {treeVizPreview.introText.length > 0 && (
              <MarkdownText content={treeVizPreview.introText} />
            )}
            <WebsitePreviewCard
              preview={treeVizPreview}
              onPress={() => onWebsitePreviewExpand?.(message.id, treeVizPreview)}
            />
          </>
        ) : parsedWebsitePreview ? (
          <>
            {parsedWebsitePreview.introText.length > 0 && (
              <MarkdownText content={parsedWebsitePreview.introText} />
            )}
            <WebsitePreviewCard
              preview={parsedWebsitePreview}
              onPress={() => onWebsitePreviewExpand?.(message.id, parsedWebsitePreview)}
            />
          </>
        ) : parsedAnatomy ? (
          <>
            {parsedAnatomy.introText.length > 0 && (
              <MarkdownText content={parsedAnatomy.introText} />
            )}
            <AnatomyCard
              anatomy={parsedAnatomy}
              onPress={() => onAnatomyExpand?.(message.id, parsedAnatomy)}
            />
          </>
        ) : parsedField ? (
          <>
            {parsedField.introText.length > 0 && (
              <MarkdownText content={parsedField.introText} />
            )}
            <FieldCard
              field={parsedField}
              onPress={() => onFieldExpand?.(message.id, parsedField)}
            />
          </>
        ) : parsedMolecule ? (
          <>
            {parsedMolecule.introText.length > 0 && (
              <MarkdownText content={parsedMolecule.introText} />
            )}
            <MoleculeCard
              molecule={parsedMolecule}
              onPress={() => onMoleculeExpand?.(message.id, parsedMolecule)}
            />
          </>
        ) : parsedFlashcards ? (
          <>
            {parsedFlashcards.introText.length > 0 && (
              <MarkdownText content={parsedFlashcards.introText} />
            )}
            <FlashcardDeck deck={parsedFlashcards} />
          </>
        ) : parsedQuiz ? (
          <>
            {parsedQuiz.introText.length > 0 && (
              <MarkdownText content={parsedQuiz.introText} />
            )}
            <QuizCard quiz={parsedQuiz} onReview={onQuizReview} />
          </>
        ) : message.tutorHint ? (
          <HintCard
            hint={parsedHint}
            fallbackContent={parsedHint ? undefined : message.content}
            isStreaming={isStreaming}
            interactive={isLastAssistant && !isStreaming}
            onAction={onTutorFollowUp}
          />
        ) : message.tutorCoach ? (
          <CoachCard
            coach={parsedCoach}
            fallbackContent={parsedCoach ? undefined : message.content}
            isStreaming={isStreaming}
            interactive={isLastAssistant && !isStreaming}
            disabled={!onCoachReply}
            onReply={onCoachReply}
          />
        ) : parsedLesson ? (
          <LessonCard lesson={parsedLesson} leftover={parsedLesson.leftover} />
        ) : parsedSolve ? (
          <SolveCard solve={parsedSolve} />
        ) : parsedPlan ? (
          <PlanCard
            plan={parsedPlan}
            leftover={parsedPlan.leftover}
            interactive={isLastAssistant && !isStreaming}
            onAction={onTutorFollowUp}
          />
        ) : message.tutorLesson ? (
          <MarkdownText content={message.content} isStreaming={isStreaming} />
        ) : message.tutorSolve ? (
          <MarkdownText content={message.content} isStreaming={isStreaming} />
        ) : message.tutorPlan ? (
          <MarkdownText content={message.content} isStreaming={isStreaming} />
        ) : mindMapPending ? (
          <PendingContent content={message.content} label="Building mind map…" isStreaming={isStreaming} />
        ) : diagramPending ? (
          <PendingContent content={message.content} label="Building diagram…" isStreaming={isStreaming} />
        ) : scienceGraphPending ? (
          <PendingContent content={message.content} label="Building graph…" isStreaming={isStreaming} />
        ) : treeVizPending ? (
          <PendingContent content={message.content} label="Building tree…" isStreaming={isStreaming} />
        ) : websitePreviewPending ? (
          <PendingContent content={message.content} label="Building preview…" isStreaming={isStreaming} />
        ) : anatomyPending ? (
          <PendingContent content={message.content} label="Loading 3D anatomy…" isStreaming={isStreaming} />
        ) : fieldPending ? (
          <PendingContent content={message.content} label="Loading 3D field…" isStreaming={isStreaming} />
        ) : moleculePending ? (
          <PendingContent content={message.content} label="Loading 3D molecule…" isStreaming={isStreaming} />
        ) : flashcardsPending ? (
          <PendingContent content={message.content} label="Building flashcards…" isStreaming={isStreaming} />
        ) : quizPending ? (
          <PendingContent content={message.content} label="Building quiz…" isStreaming={isStreaming} />
        ) : (
          <MarkdownText content={message.content} isStreaming={isStreaming} />
        )}
        {isStreaming && <StreamingCursor />}
        {showMessageActions && (
          <MessageActions
            content={message.content}
            canRegenerate={isLastAssistant && !!onRegenerate}
            onRegenerate={onRegenerate ?? (() => {})}
            keyTerms={keyTerms}
          />
        )}
        {showMessageActions && keyTerms.length > 0 ? <KeyTermsRow terms={keyTerms} /> : null}
        {!isStreaming && showTutorFollowUps && isLastAssistant && onTutorFollowUp && Platform.OS !== 'web' ? (
          <TutorFollowUps
            hideCards={!!parsedFlashcards || !!message.flashcards}
            hideQuiz={!!parsedQuiz || !!message.quiz}
            hideSolve={!!parsedSolve || !!message.tutorSolve}
            hidePlan={!!parsedPlan || !!message.tutorPlan}
            onSelect={onTutorFollowUp}
          />
        ) : null}
        {!isStreaming && message.sources && message.sources.length > 0 && (
          <CitationCard sources={message.sources} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    alignItems: 'flex-end',
    marginBottom: Spacing.four,
    paddingLeft: Spacing.five,
    ...Platform.select({
      web: {
        marginBottom: 20,
        paddingLeft: 96,
      },
    }),
  },
  userBubble: {
    maxWidth: '88%',
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  userBubbleWeb: {
    maxWidth: '72%',
    borderRadius: 18,
    borderBottomRightRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  equationPlate: {
    maxWidth: '92%',
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 18,
  },
  equationRail: {
    width: 4,
  },
  equationInner: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  equationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  equationDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  equationKicker: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.6,
    fontWeight: '800',
  },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    marginBottom: Spacing.four,
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  assistantRowWeb: {
    marginBottom: 22,
    gap: 0,
  },
  assistantContent: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.two,
    paddingTop: 2,
  },
  assistantLabel: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  cursorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  cursorGlow: {
    width: 18,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cursor: {
    width: 2.5,
    height: 16,
    borderRadius: 2,
  },
  pending: {
    marginTop: Spacing.one,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  fallbackNote: {
    marginTop: Spacing.one,
    marginBottom: Spacing.one,
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
  },
});
