import { useEffect, useRef } from 'react';
import { FlatList, Platform, StyleSheet, View } from 'react-native';

import { MessageBubble } from '@/components/chat/message-bubble';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { Spacing } from '@/constants/theme';
import type { MindElixirData } from '@/subject/mind-map-types';
import type { ParsedAnatomy } from '@/subject/biology-lab/anatomy-parser';
import type { ParsedField } from '@/subject/physics-lab/field-parser';
import type { ParsedMolecule } from '@/subject/chemistry-lab/molecule-parser';
import type { ParsedWebsitePreview } from '@/subject/website-preview-parser';
import type { Message, TutorMode, TypingStage } from '@/types/chat';

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
}: MessageListProps) {
  const listRef = useRef<FlatList<Message>>(null);

  const lastMessage = messages[messages.length - 1];
  const lastAssistantId =
    lastMessage && lastMessage.role === 'assistant' ? lastMessage.id : null;
  const scrollRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (messages.length === 0 && !isTyping) return;

    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
    }
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      listRef.current?.scrollToEnd({ animated: !streamingMessageId });
    });

    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [messages.length, isTyping, streamingMessageId]);

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
