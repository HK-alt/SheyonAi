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

export function FloatingComposer(props: ComposerVariantProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.floatingCard,
        {
          backgroundColor: theme.composerFloatingBackground,
          borderColor: theme.composerBorder,
          ...nativeShadowColor(theme.composerShadow),
        },
      ]}>
      {props.hint && <ComposerHint message={props.hint} />}
      <AttachmentPreview attachments={props.attachments} onRemove={props.onRemoveAttachment} />
      <View style={styles.inputRow}>
        <AttachButton onPress={props.onOpenAttachmentSheet} />
        <ComposerTextInput
          value={props.text}
          onChangeText={props.setText}
          placeholder={props.inputPlaceholder}
          onEnterSubmit={props.onPrimaryPress}
        />
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
        <SendStopButton
          canSend={props.canSend}
          isGenerating={props.isGenerating}
          onPress={props.onPrimaryPress}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
    marginHorizontal: Spacing.two,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
      default: {
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      },
    }),
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.one,
    minHeight: 44,
  },
});
