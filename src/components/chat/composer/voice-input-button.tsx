import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { startSpeechRecognition } from '@/lib/speech-recognition';

type VoiceInputButtonProps = {
  disabled?: boolean;
  onTranscript: (text: string) => void;
  onListeningChange?: (listening: boolean) => void;
  onUnavailable?: () => void;
  compact?: boolean;
  circle?: boolean;
  soft?: boolean;
  accentColor?: string;
};

export function VoiceInputButton({
  disabled = false,
  onTranscript,
  onListeningChange,
  onUnavailable,
  compact = false,
  circle = false,
  soft = false,
  accentColor,
}: VoiceInputButtonProps) {
  const theme = useTheme();
  const [listening, setListening] = useState(false);
  const sessionRef = useRef<{ stop: () => void } | null>(null);

  const setListeningState = useCallback(
    (next: boolean) => {
      setListening(next);
      onListeningChange?.(next);
      if (!next) sessionRef.current = null;
    },
    [onListeningChange],
  );

  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
      sessionRef.current = null;
    };
  }, []);

  async function toggleListening() {
    if (disabled) return;

    if (listening) {
      sessionRef.current?.stop();
      setListeningState(false);
      return;
    }

    const session = await startSpeechRecognition({
      onListeningChange: setListeningState,
      onTranscript,
    });

    if (!session) {
      onUnavailable?.();
      return;
    }

    sessionRef.current = session;
  }

  const size = compact ? 32 : 36;
  const iconColor = listening ? (accentColor ?? theme.sendButton) : theme.actionIcon;

  return (
    <Pressable
      onPress={() => void toggleListening()}
      disabled={disabled}
      hitSlop={6}
      accessibilityLabel={listening ? 'Stop listening' : 'Voice input'}
      style={({ pressed }) => [
        soft
          ? {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: listening ? theme.backgroundSelected : theme.backgroundElement,
              alignItems: 'center' as const,
              justifyContent: 'center' as const,
            }
          : circle
            ? {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: 1.5,
                borderColor: iconColor,
                alignItems: 'center' as const,
                justifyContent: 'center' as const,
              }
            : compact
              ? styles.iconButtonCompact
              : styles.iconButton,
        !circle && !soft && listening && { backgroundColor: theme.backgroundSelected },
        pressed && !disabled && styles.pressed,
      ]}>
      <View style={[styles.micBody, { borderColor: iconColor }]} />
      <View style={[styles.micStand, { backgroundColor: iconColor }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 32,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    borderRadius: 8,
  },
  iconButtonCompact: {
    width: 28,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
    borderRadius: 6,
  },
  micBody: {
    width: 10,
    height: 16,
    borderRadius: 5,
    borderWidth: 2,
  },
  micStand: {
    width: 8,
    height: 2,
    borderRadius: 1,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
