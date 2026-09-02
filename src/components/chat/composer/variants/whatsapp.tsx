import { StyleSheet, View } from 'react-native';

import { AttachmentPreview } from '@/components/chat/composer/attachment-preview';
import {
  AttachButton,
  ComposerHint,
  ComposerTextInput,
  SendStopButton,
} from '@/components/chat/composer/composer-controls';
import type { ComposerVariantProps } from '@/components/chat/composer/types';
import { VoiceInputButton } from '@/components/chat/composer/voice-input-button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function WhatsAppComposer(props: ComposerVariantProps) {
  const theme = useTheme();
  const showSend = props.text.trim().length > 0 || props.attachments.length > 0;

  return (
    <>
      {props.hint && <ComposerHint message={props.hint} />}
      <AttachmentPreview attachments={props.attachments} onRemove={props.onRemoveAttachment} />
      <View
        style={[
          styles.inputRow,
          { backgroundColor: theme.composerBackground, borderColor: theme.composerBorder },
        ]}>
        <AttachButton onPress={props.onOpenAttachmentSheet} />
        <ComposerTextInput
          value={props.text}
          onChangeText={props.setText}
          placeholder={props.inputPlaceholder}
          onEnterSubmit={props.onPrimaryPress}
        />
        {showSend || props.isGenerating ? (
          <SendStopButton
            canSend={props.canSend}
            isGenerating={props.isGenerating}
            onPress={props.onPrimaryPress}
            whatsappStyle
          />
        ) : (
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
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: Spacing.two,
    paddingRight: Spacing.one,
    paddingVertical: Spacing.one,
    gap: Spacing.one,
    minHeight: 48,
  },
});
