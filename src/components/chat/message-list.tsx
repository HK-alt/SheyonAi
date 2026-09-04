import { useCallback, useEffect, useRef } from 'react';
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  StyleSheet,
  View,
} from 'react-native';

import { MessageBubble } from '@/components/chat/message-bubble';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { Spacing } from '@/constants/theme';
import type { MindElixirData } from '@/subject/mind-map-types';
import type { ParsedAnatomy } from '@/subject/biology-lab/anatomy-parser';
import type { ParsedField } from '@/subject/physics-lab/field-parser';
import type { ParsedMolecule } from '@/subject/chemistry-lab/molecule-parser';
import type { ParsedWebsitePreview } from '@/subject/website-preview-parser';
import type { Message, TutorMode, TypingStage } from '@/types/chat';

/** Continuous scroll distance required before hiding / showing chrome. */
const ACCUMULATE_HIDE_PX = 56;
const ACCUMULATE_SHOW_PX = 72;
/** Ignore scroll-driven toggles while header/layout is settling. */
const TOGGLE_COOLDOWN_MS = Platform.OS === 'web' ? 420 : 280;
const TOP_SHOW_OFFSET = 40;
/** Stay hidden while pinned near the composer — layout jitter looks like scroll-up. */
const BOTTOM_LOCK_PX = 100;

type MessageListProps = {
  messages: Message[];
  isTyping: boolean;
  typingStage?: TypingStage;
  streamingMessageId?: string | null;
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
  /** Hide on scroll down, show on scroll up (user-driven only). */
  onHeaderVisibilityChange?: (visible: boolean) => void;
};

export function MessageList({
  messages,
  isTyping,
  typingStage,
  streamingMessageId,
  onRegenerate,
  onMindMapNodeSelect,
  onMindMapExpand,
  onWebsitePreviewExpand,
  onAnatomyExpand,
  onFieldExpand,
  onMoleculeExpand,
  showTutorFollowUps,
  onTutorFollowUp,
  onQuizReview,
  onCoachReply,
  onHeaderVisibilityChange,
}: MessageListProps) {
  const listRef = useRef<FlatList<Message>>(null);

  const lastMessage = messages[messages.length - 1];
  const lastAssistantId =
    lastMessage && lastMessage.role === 'assistant' ? lastMessage.id : null;
  const scrollRafRef = useRef<number | null>(null);
  const lastOffsetYRef = useRef(0);
  const lastContentHeightRef = useRef(0);
  const lastLayoutHeightRef = useRef(0);
  const accumulatedDyRef = useRef(0);
  const headerVisibleRef = useRef(true);
  const cooldownUntilRef = useRef(0);
  const userScrollingRef = useRef(false);
  const programmaticScrollRef = useRef(false);
  const programmaticClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setHeaderVisible = useCallback(
    (visible: boolean) => {
      if (headerVisibleRef.current === visible) return;
      headerVisibleRef.current = visible;
      accumulatedDyRef.current = 0;
      cooldownUntilRef.current = Date.now() + TOGGLE_COOLDOWN_MS;
      onHeaderVisibilityChange?.(visible);
    },
    [onHeaderVisibilityChange],
  );

  useEffect(() => {
    if (messages.length === 0 && !isTyping) return;

    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
    }
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      programmaticScrollRef.current = true;
      if (programmaticClearTimerRef.current) {
        clearTimeout(programmaticClearTimerRef.current);
      }
      programmaticClearTimerRef.current = setTimeout(() => {
        programmaticScrollRef.current = false;
        programmaticClearTimerRef.current = null;
      }, 320);
      listRef.current?.scrollToEnd({ animated: !streamingMessageId });
    });

    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [messages.length, isTyping, streamingMessageId]);

  useEffect(() => {
    return () => {
      if (programmaticClearTimerRef.current) {
        clearTimeout(programmaticClearTimerRef.current);
      }
    };
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const y = contentOffset.y;
      const contentHeight = contentSize.height;
      const layoutHeight = layoutMeasurement.height;

      // Header collapse / URL-bar resize / streaming growth shift list geometry.
      // Resync the baseline and skip direction logic so we don't oscillate.
      const contentDelta = contentHeight - lastContentHeightRef.current;
      const layoutDelta = layoutHeight - lastLayoutHeightRef.current;
      lastContentHeightRef.current = contentHeight;
      lastLayoutHeightRef.current = layoutHeight;

      const dy = y - lastOffsetYRef.current;
      lastOffsetYRef.current = y;

      if (Math.abs(contentDelta) > 2 || Math.abs(layoutDelta) > 2) {
        accumulatedDyRef.current = 0;
        return;
      }

      if (programmaticScrollRef.current) return;
      if (Platform.OS !== 'web' && !userScrollingRef.current) return;
      if (Date.now() < cooldownUntilRef.current) return;

      if (y <= TOP_SHOW_OFFSET) {
        accumulatedDyRef.current = 0;
        setHeaderVisible(true);
        return;
      }

      const distanceFromBottom = contentHeight - layoutHeight - y;
      const nearBottom = distanceFromBottom <= BOTTOM_LOCK_PX;

      // Near the composer: keep chrome hidden; ignore bounce that looks like scroll-up.
      if (nearBottom) {
        accumulatedDyRef.current = 0;
        if (!headerVisibleRef.current) return;
        if (dy > 4) setHeaderVisible(false);
        return;
      }

      if (dy === 0) return;

      // Accumulate only while moving in one direction; reset on reversal.
      if (dy > 0) {
        if (accumulatedDyRef.current < 0) accumulatedDyRef.current = 0;
        accumulatedDyRef.current += dy;
      } else {
        if (accumulatedDyRef.current > 0) accumulatedDyRef.current = 0;
        accumulatedDyRef.current += dy;
      }

      if (accumulatedDyRef.current >= ACCUMULATE_HIDE_PX) {
        setHeaderVisible(false);
      } else if (accumulatedDyRef.current <= -ACCUMULATE_SHOW_PX) {
        setHeaderVisible(true);
      }
    },
    [setHeaderVisible],
  );

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <MessageBubble
          message={item}
          isStreaming={item.id === streamingMessageId}
          isLastAssistant={item.id === lastAssistantId}
          onRegenerate={onRegenerate}
          onMindMapNodeSelect={onMindMapNodeSelect}
          onMindMapExpand={onMindMapExpand}
          onWebsitePreviewExpand={onWebsitePreviewExpand}
          onAnatomyExpand={onAnatomyExpand}
          onFieldExpand={onFieldExpand}
          onMoleculeExpand={onMoleculeExpand}
          showTutorFollowUps={showTutorFollowUps && !isTyping && !streamingMessageId}
          onTutorFollowUp={onTutorFollowUp}
          onQuizReview={onQuizReview}
          onCoachReply={onCoachReply}
        />
      )}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      onScrollBeginDrag={() => {
        userScrollingRef.current = true;
      }}
      onScrollEndDrag={(event) => {
        const velocityY = event.nativeEvent.velocity?.y ?? 0;
        if (Math.abs(velocityY) < 0.05) {
          userScrollingRef.current = false;
        }
      }}
      onMomentumScrollBegin={() => {
        userScrollingRef.current = true;
      }}
      onMomentumScrollEnd={() => {
        userScrollingRef.current = false;
        accumulatedDyRef.current = 0;
      }}
      ListFooterComponent={
        isTyping ? (
          <View style={styles.typingRow}>
            <TypingIndicator stage={typingStage} />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    flexGrow: 1,
    ...Platform.select({
      web: {
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.five,
        paddingBottom: Spacing.four,
      },
    }),
  },
  typingRow: {
    alignItems: 'flex-start',
    marginBottom: Spacing.three,
    paddingLeft: Spacing.one,
    ...Platform.select({
      web: { paddingLeft: 0 },
    }),
  },
});
