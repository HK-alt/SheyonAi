import { Platform, StyleSheet, View } from 'react-native';

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
import { nativeShadowColor } from '@/lib/native-shadow';

export function CompactComposer(props: ComposerVariantProps) {
  const theme = useTheme();
  const showSend = props.canSend || props.isGenerating;

  return (
    <>
      {props.hint && <ComposerHint message={props.hint} />}
      <AttachmentPreview attachments={props.attachments} onRemove={props.onRemoveAttachment} />
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: theme.composerBackground,
            borderColor: theme.composerBorder,
            ...nativeShadowColor(theme.composerShadow),
          },
        ]}>
        <AttachButton onPress={props.onOpenAttachmentSheet} compact circle />
        <ComposerTextInput
          value={props.text}
          onChangeText={props.setText}
          placeholder={props.inputPlaceholder}
          compact
          onEnterSubmit={props.onPrimaryPress}
        />
        {showSend ? (
          <SendStopButton
            canSend={props.canSend}
            isGenerating={props.isGenerating}
            onPress={props.onPrimaryPress}
            compact
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
            compact
            circle
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    paddingLeft: 6,
    paddingRight: 6,
    paddingVertical: 6,
    gap: Spacing.two,
    minHeight: 52,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      default: {
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      },
    }),
  },
});
