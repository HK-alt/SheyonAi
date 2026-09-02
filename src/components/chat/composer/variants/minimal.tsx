import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AttachmentPreview } from '@/components/chat/composer/attachment-preview';
import {
  AttachButton,
  ComposerHint,
  ComposerTextInput,
  ExpandButton,
  SendStopButton,
} from '@/components/chat/composer/composer-controls';
import type { ComposerVariantProps } from '@/components/chat/composer/types';
import { VoiceInputButton } from '@/components/chat/composer/voice-input-button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function MinimalComposer(props: ComposerVariantProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {props.hint && <ComposerHint message={props.hint} />}
      <AttachmentPreview attachments={props.attachments} onRemove={props.onRemoveAttachment} />
      <View
        style={[
          styles.inputRow,
          { backgroundColor: theme.composerBackground, borderColor: theme.composerBorder },
        ]}>
        <ExpandButton expanded={expanded} onPress={() => setExpanded((value) => !value)} />
        {expanded && <AttachButton onPress={props.onOpenAttachmentSheet} />}
        <ComposerTextInput
          value={props.text}
          onChangeText={props.setText}
          placeholder={props.inputPlaceholder}
          onEnterSubmit={props.onPrimaryPress}
        />
        {expanded && (
          <VoiceInputButton
            disabled={props.isGenerating || props.isSending}
            onTranscript={props.onAppendTranscript}
            onListeningChange={(listening) => {
              if (listening) props.setHint('Listening…');
            }}
            onUnavailable={() =>
              props.setHint('Voice input requires a development build (not available in Expo Go)')
            }
          />
        )}
        <SendStopButton
          canSend={props.canSend}
          isGenerating={props.isGenerating}
          onPress={props.onPrimaryPress}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 20,
    borderWidth: 1,
    paddingLeft: Spacing.one,
    paddingRight: Spacing.one,
    paddingVertical: Spacing.one,
    gap: Spacing.one,
    minHeight: 44,
  },
});
