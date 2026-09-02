import { performOcr } from '@bear-block/vision-camera-ocr';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  runAtTargetFps,
  useCameraDevice,
  useFrameProcessor,
  type Camera as CameraRef,
} from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { requestOcrPermission } from '@/lib/ocr-availability';
import { useTheme } from '@/hooks/use-theme';
import type { OcrScannerModalProps } from '@/components/chat/ocr-scanner-modal';

function toFileUri(path: string) {
  return path.startsWith('file://') ? path : `file://${path}`;
}

export function OcrScannerModal({
  visible,
  onClose,
  onAdd,
  onAppendTranscript,
  onError,
}: OcrScannerModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const device = useCameraDevice('back');
  const cameraRef = useRef<CameraRef>(null);

  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [detectedText, setDetectedText] = useState('');
  const [capturing, setCapturing] = useState(false);

  const lastTextUpdateRef = useRef(0);
  const detectedTextRef = useRef('');

  const updateDetectedText = useCallback((text: string) => {
    const now = Date.now();
    if (now - lastTextUpdateRef.current < 300) return;
    lastTextUpdateRef.current = now;
    detectedTextRef.current = text;
    setDetectedText(text);
  }, []);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      runAtTargetFps(3, () => {
        'worklet';
        try {
          const result = performOcr(frame, { recognitionLevel: 'accurate' });
          if (result?.text) {
            runOnJS(updateDetectedText)(result.text);
          }
        } catch {
          // Frame processor errors are non-fatal; user can retry or cancel.
        }
      });
    },
    [updateDetectedText],
  );

  useEffect(() => {
    if (!visible) return;

    setDetectedText('');
    detectedTextRef.current = '';
    lastTextUpdateRef.current = 0;
    setPermissionChecked(false);
    setPermissionGranted(false);

    void (async () => {
      const granted = await requestOcrPermission();
      setPermissionGranted(granted);
      setPermissionChecked(true);
      if (!granted) {
        onError('Camera permission is required to scan text.');
        onClose();
      }
    })();
  }, [visible, onClose, onError]);

  async function handleConfirm() {
    const text = detectedTextRef.current.trim();
    if (!text || capturing || !cameraRef.current) return;

    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
      const localUri = toFileUri(photo.path);

      onAdd({
        localUri,
        mimeType: 'image/jpeg',
        name: `scan-${Date.now()}.jpg`,
      });
      onAppendTranscript(text);
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not capture photo.');
    } finally {
      setCapturing(false);
    }
  }

  const canConfirm = detectedText.trim().length > 0 && !capturing;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {!permissionChecked || !device ? (
          <View style={[styles.centered, { paddingTop: insets.top }]}>
            <ActivityIndicator color={theme.sendButton} />
            <ThemedText themeColor="textSecondary" style={styles.statusText}>
              {!device && permissionChecked ? 'No camera available on this device.' : 'Preparing camera…'}
            </ThemedText>
            {!device && permissionChecked && (
              <Pressable onPress={onClose} style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="smallBold">Close</ThemedText>
              </Pressable>
            )}
          </View>
        ) : permissionGranted ? (
          <>
            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={visible}
              photo
              frameProcessor={frameProcessor}
            />

            <View style={[styles.topBar, { paddingTop: insets.top + Spacing.two }]}>
              <Pressable onPress={onClose} hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="smallBold" style={styles.onCameraText}>
                  Cancel
                </ThemedText>
              </Pressable>
            </View>

            <View
              style={[
                styles.bottomPanel,
                {
                  paddingBottom: Math.max(insets.bottom, Spacing.three),
                  backgroundColor: theme.backgroundElement,
                  borderTopColor: theme.headerBorder,
                },
              ]}>
              <ThemedText type="smallBold" style={styles.panelTitle}>
                Detected text
              </ThemedText>
              <ScrollView style={styles.textScroll} nestedScrollEnabled>
                <ThemedText type="small" themeColor={detectedText ? undefined : 'textSecondary'}>
                  {detectedText || 'Point the camera at text to scan…'}
                </ThemedText>
              </ScrollView>

              <Pressable
                onPress={() => void handleConfirm()}
                disabled={!canConfirm}
                style={({ pressed }) => [
                  styles.confirmButton,
                  {
                    backgroundColor: canConfirm ? theme.sendButton : theme.sendButtonDisabled,
                  },
                  pressed && canConfirm && styles.pressed,
                ]}>
                {capturing ? (
                  <ActivityIndicator color={theme.sendButtonIcon} />
                ) : (
                  <ThemedText style={{ color: theme.sendButtonIcon, fontWeight: '600' }}>
                    Use text + photo
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  statusText: {
    textAlign: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.three,
    zIndex: 2,
  },
  onCameraText: {
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.two,
    maxHeight: '45%',
  },
  panelTitle: {
    marginBottom: Spacing.one,
  },
  textScroll: {
    maxHeight: 140,
  },
  confirmButton: {
    borderRadius: 12,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  pressed: {
    opacity: 0.75,
  },
});
