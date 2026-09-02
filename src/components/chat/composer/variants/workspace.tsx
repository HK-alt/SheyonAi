import { Platform, StyleSheet, View } from 'react-native';

import { AttachmentPreview } from '@/components/chat/composer/attachment-preview';
import {
  AttachButton,
  ComposerHint,
  ComposerTextInput,
  SendStopButton,
} from '@/components/chat/composer/composer-controls';
import { MathComposerInput } from '@/components/chat/composer/math-composer-input';
import type { ComposerVariantProps } from '@/components/chat/composer/types';
import { VoiceInputButton } from '@/components/chat/composer/voice-input-button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type WorkspaceComposerProps = ComposerVariantProps & {
  accentColor: string;
};

export function WorkspaceComposer({ accentColor, ...props }: WorkspaceComposerProps) {
  const theme = useTheme();

  return (
    <>
      {props.hint && <ComposerHint message={props.hint} />}
      <AttachmentPreview attachments={props.attachments} onRemove={props.onRemoveAttachment} />
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: Platform.OS === 'web' ? 'transparent' : theme.chatSurface,
            alignItems: props.equationVisual ? 'center' : 'flex-end',
          },
          Platform.OS === 'web' && styles.inputRowWeb,
        ]}>
        <AttachButton onPress={props.onOpenAttachmentSheet} compact soft />
        {props.equationVisual ? (
          <MathComposerInput
            ref={props.equationInputRef}
            value={props.text}
            onChangeText={props.setText}
            placeholder={props.inputPlaceholder}
            displayMode={props.equationDisplayMode ?? true}
            onEnterSubmit={props.onPrimaryPress}
          />
        ) : (
          <ComposerTextInput
            value={props.text}
            onChangeText={props.setText}
            placeholder={props.inputPlaceholder}
            compact
            onEnterSubmit={props.onPrimaryPress}
          />
        )}
        <VoiceInputButton
          disabled={props.isGenerating || props.isSending}
          onTranscript={props.onAppendTranscript}
          onListeningChange={(listening) => {
            if (listening) props.setHint('Listening…');
          }}
          onUnavailable={() =>
            props.setHint('Voice input requires a development build (not available in Expo Go)')
          }
          compact
          soft
          accentColor={accentColor}
        />
        <SendStopButton
          canSend={props.canSend}
          isGenerating={props.isGenerating}
          onPress={props.onPrimaryPress}
          compact
          accentColor={accentColor}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 16,
    paddingLeft: 4,
    paddingRight: 4,
    paddingVertical: 4,
    gap: Spacing.one,
    minHeight: 48,
  },
  inputRowWeb: {
    minHeight: 44,
    paddingVertical: 2,
    paddingLeft: 2,
    paddingRight: 2,
    gap: 6,
  },
});
