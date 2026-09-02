import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { createElement, useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  HOMEWORK_INTENT_META,
  type HomeworkIntent,
} from '@/lib/homework-intent';
import type { PendingAttachment } from '@/types/chat';

export type CameraCapture = Omit<PendingAttachment, 'id'>;
export type { HomeworkIntent };

type CameraScreenProps = {
  onUsePhoto: (capture: CameraCapture, intent: HomeworkIntent) => void;
};

function assetToCapture(asset: ImagePicker.ImagePickerAsset): CameraCapture {
  return {
    localUri: asset.uri,
    mimeType: asset.mimeType ?? 'image/jpeg',
    name: asset.fileName ?? `camera-${Date.now()}.jpg`,
    size: asset.fileSize,
  };
}

type WebcamVideoNode = {
  srcObject: MediaStream | null;
  play: () => Promise<void>;
  videoWidth: number;
  videoHeight: number;
};

function canUseWebcam() {
  return (
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function WebcamFeed({
  stream,
  videoRef,
}: {
  stream: MediaStream;
  videoRef: MutableRefObject<WebcamVideoNode | null>;
}) {
  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;
    node.srcObject = stream;
    void node.play().catch(() => {});
    return () => {
      node.srcObject = null;
    };
  }, [stream, videoRef]);

  return createElement('video', {
    ref: videoRef,
    autoPlay: true,
    playsInline: true,
    muted: true,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      backgroundColor: '#111',
    },
  });
}

export function CameraScreen({ onUsePhoto }: CameraScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const [preview, setPreview] = useState<CameraCapture | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const videoRef = useRef<WebcamVideoNode | null>(null);

  useEffect(() => {
    return () => stopStream(webcamStream);
  }, [webcamStream]);

  const closeWebcam = useCallback(() => {
    setWebcamStream((current) => {
      stopStream(current);
      return null;
    });
  }, []);

  const runPicker = useCallback(async (mode: 'camera' | 'library') => {
    setError(null);
    setBusy(true);
    closeWebcam();
    try {
      if (mode === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError('Camera permission is required to snap homework or diagrams.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          exif: false,
        });
        if (!result.canceled && result.assets[0]) {
          setPreview(assetToCapture(result.assets[0]));
        }
      } else {
        if (Platform.OS !== 'web') {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            setError('Photo library permission is required.');
            return;
          }
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsMultipleSelection: false,
          exif: false,
        });
        if (!result.canceled && result.assets[0]) {
          setPreview(assetToCapture(result.assets[0]));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the camera.');
    } finally {
      setBusy(false);
    }
  }, [closeWebcam]);

  const startWebcam = useCallback(async () => {
    if (!canUseWebcam()) {
      setError('Webcam is not available in this browser.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      setWebcamStream((current) => {
        stopStream(current);
        return stream;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the webcam.');
    } finally {
      setBusy(false);
    }
  }, []);

  const captureWebcam = useCallback(() => {
    const video = videoRef.current;
    if (!video || typeof document === 'undefined') {
      setError('Webcam is not ready yet.');
      return;
    }
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Could not capture this frame.');
      return;
    }
    ctx.drawImage(video as unknown as CanvasImageSource, 0, 0, width, height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('Could not capture this frame.');
          return;
        }
        const localUri = URL.createObjectURL(blob);
        closeWebcam();
        setPreview({
          localUri,
          mimeType: 'image/jpeg',
          name: `vision-${Date.now()}.jpg`,
          size: blob.size,
        });
      },
      'image/jpeg',
      0.85,
    );
  }, [closeWebcam]);

  const handleDroppedFiles = useCallback((files: FileList | File[] | null | undefined) => {
    const file = files && files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Drop a photo of the worksheet, diagram, or notes.');
      return;
    }
    setError(null);
    closeWebcam();
    setPreview({
      localUri: URL.createObjectURL(file),
      mimeType: file.type || 'image/jpeg',
      name: file.name || `vision-${Date.now()}.jpg`,
      size: file.size,
    });
  }, [closeWebcam]);

  const accent = theme.accent;

  if (preview) {
    return (
      <View
        style={[
          styles.flex,
          isWeb && styles.flexWeb,
          { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three },
        ]}>
        <View style={styles.reviewHeader}>
          <ThemedText type="smallBold" style={styles.reviewEyebrow}>
            Review
          </ThemedText>
          <ThemedText style={[styles.reviewTitle, { color: theme.text }]}>
            How should we help?
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.reviewSubtitle}>
            Vision tutoring starts from this photo — pick Solve, Explain, or Check.
          </ThemedText>
        </View>

        <View style={[styles.previewFrame, { borderColor: theme.composerBorder, backgroundColor: theme.chatSurface }]}>
          <Image source={{ uri: preview.localUri }} style={styles.previewImage} contentFit="contain" />
        </View>

        <View style={styles.intentRow}>
          <IntentButton
            intent="solve"
            theme={theme}
            accent
            onPress={() => onUsePhoto(preview, 'solve')}
          />
          <IntentButton
            intent="explain"
            theme={theme}
            onPress={() => onUsePhoto(preview, 'explain')}
          />
          <IntentButton
            intent="check"
            theme={theme}
            onPress={() => onUsePhoto(preview, 'check')}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => setPreview(null)}
          style={({ pressed }) => [
            styles.retakeButton,
            { borderColor: theme.composerBorder, backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          <SymbolView
            name={{ ios: 'arrow.counterclockwise', android: 'refresh', web: 'refresh' }}
            size={16}
            tintColor={theme.text}
            weight="semibold"
          />
          <ThemedText type="smallBold">{isWeb ? 'Choose another' : 'Retake'}</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.flex,
        isWeb && styles.flexWeb,
        { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three },
      ]}>
      <View style={styles.hero}>
        <View
          style={[
            styles.viewfinder,
            isWeb && styles.viewfinderWeb,
            {
              borderColor: dragOver ? accent : theme.composerBorder,
              backgroundColor: theme.chatSurface,
              paddingHorizontal: webcamStream ? 0 : Spacing.four,
              paddingVertical: webcamStream ? 0 : Spacing.five,
            },
          ]}
          {...(isWeb
            ? {
                onDragEnter: (event: { preventDefault?: () => void }) => {
                  event.preventDefault?.();
                  setDragOver(true);
                },
                onDragOver: (event: { preventDefault?: () => void }) => {
                  event.preventDefault?.();
                  setDragOver(true);
                },
                onDragLeave: () => setDragOver(false),
                onDrop: (event: {
                  preventDefault?: () => void;
                  nativeEvent?: { dataTransfer?: { files?: FileList } };
                  dataTransfer?: { files?: FileList };
                }) => {
                  event.preventDefault?.();
                  setDragOver(false);
                  const files = event.dataTransfer?.files ?? event.nativeEvent?.dataTransfer?.files;
                  handleDroppedFiles(files);
                },
              }
            : null)}
        >
          {webcamStream && isWeb ? (
            <>
              <WebcamFeed stream={webcamStream} videoRef={videoRef} />
              <View style={styles.webcamScrim} pointerEvents="none" />
            </>
          ) : (
            <>
              <View style={[styles.corner, styles.cornerTL, { borderColor: accent }]} />
              <View style={[styles.corner, styles.cornerTR, { borderColor: accent }]} />
              <View style={[styles.corner, styles.cornerBL, { borderColor: accent }]} />
              <View style={[styles.corner, styles.cornerBR, { borderColor: accent }]} />

              <View style={styles.iconStack}>
                <View style={[styles.iconHalo, { backgroundColor: `${accent}18` }]} />
                <View
                  style={[
                    styles.iconBadge,
                    {
                      backgroundColor: theme.accentMuted,
                      borderColor: `${accent}40`,
                    },
                  ]}>
                  <SymbolView
                    name={{
                      ios: 'camera.aperture',
                      android: 'camera',
                      web: 'visibility',
                    }}
                    size={30}
                    tintColor={accent}
                    weight="semibold"
                  />
                </View>
                <View style={[styles.iconSpark, { backgroundColor: theme.background }]}>
                  <SymbolView
                    name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
                    size={12}
                    tintColor={accent}
                    weight="bold"
                  />
                </View>
              </View>
              <ThemedText style={[styles.heroTitle, { color: theme.text }]}>
                {isWeb ? 'Vision' : 'Camera'}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.heroBody}>
                {isWeb
                  ? dragOver
                    ? 'Drop the photo to start Vision tutoring.'
                    : 'Upload a worksheet, diagram, or notes — or use your webcam. Then choose Solve, Explain, or Check.'
                  : 'Snap a worksheet, diagram, or handwritten notes. Then choose Solve, Explain, or Check.'}
              </ThemedText>
            </>
          )}
        </View>
      </View>

      {error ? (
        <ThemedText style={[styles.error, { color: theme.destructive }]}>{error}</ThemedText>
      ) : null}

      <View style={styles.actions}>
        {webcamStream && isWeb ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Capture photo"
              disabled={busy}
              onPress={captureWebcam}
              style={({ pressed }) => [
                styles.captureButton,
                { backgroundColor: theme.sendButton },
                (pressed || busy) && styles.pressed,
              ]}>
              <SymbolView
                name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
                size={20}
                tintColor={theme.sendButtonIcon}
                weight="semibold"
              />
              <ThemedText type="smallBold" style={{ color: theme.sendButtonIcon }}>
                Capture
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel webcam"
              onPress={closeWebcam}
              style={({ pressed }) => [
                styles.libraryButton,
                { borderColor: theme.composerBorder, backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">Cancel</ThemedText>
            </Pressable>
          </>
        ) : (
          <>
            {isWeb ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Upload image"
                disabled={busy}
                onPress={() => void runPicker('library')}
                style={({ pressed }) => [
                  styles.captureButton,
                  { backgroundColor: theme.sendButton },
                  (pressed || busy) && styles.pressed,
                ]}>
                {busy ? (
                  <ActivityIndicator color={theme.sendButtonIcon} />
                ) : (
                  <>
                    <SymbolView
                      name={{ ios: 'photo.fill.on.rectangle.fill', android: 'upload', web: 'upload' }}
                      size={20}
                      tintColor={theme.sendButtonIcon}
                      weight="semibold"
                    />
                    <ThemedText type="smallBold" style={{ color: theme.sendButtonIcon }}>
                      Upload image
                    </ThemedText>
                  </>
                )}
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Take photo"
                disabled={busy}
                onPress={() => void runPicker('camera')}
                style={({ pressed }) => [
                  styles.captureButton,
                  { backgroundColor: theme.sendButton },
                  (pressed || busy) && styles.pressed,
                ]}>
                {busy ? (
                  <ActivityIndicator color={theme.sendButtonIcon} />
                ) : (
                  <>
                    <SymbolView
                      name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
                      size={20}
                      tintColor={theme.sendButtonIcon}
                      weight="semibold"
                    />
                    <ThemedText type="smallBold" style={{ color: theme.sendButtonIcon }}>
                      Take photo
                    </ThemedText>
                  </>
                )}
              </Pressable>
            )}

            {isWeb && canUseWebcam() ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Use webcam"
                disabled={busy}
                onPress={() => void startWebcam()}
                style={({ pressed }) => [
                  styles.libraryButton,
                  { borderColor: theme.composerBorder, backgroundColor: theme.backgroundElement },
                  (pressed || busy) && styles.pressed,
                ]}>
                <SymbolView
                  name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
                  size={18}
                  tintColor={theme.text}
                  weight="medium"
                />
                <ThemedText type="smallBold">Use webcam</ThemedText>
              </Pressable>
            ) : !isWeb ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose from library"
                disabled={busy}
                onPress={() => void runPicker('library')}
                style={({ pressed }) => [
                  styles.libraryButton,
                  { borderColor: theme.composerBorder, backgroundColor: theme.backgroundElement },
                  (pressed || busy) && styles.pressed,
                ]}>
                <SymbolView
                  name={{ ios: 'photo.fill.on.rectangle.fill', android: 'collections', web: 'collections' }}
                  size={18}
                  tintColor={theme.text}
                  weight="medium"
                />
                <ThemedText type="smallBold">Photo library</ThemedText>
              </Pressable>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.tips}>
          <TipRow theme={theme} text={isWeb ? 'Drop a photo or use the webcam for a live capture' : 'Fill the frame with the problem or diagram'} />
          <TipRow theme={theme} text={isWeb ? 'A single clear page works better than a crowded screenshot' : 'Good light, avoid glare and heavy shadow'} />
          <TipRow theme={theme} text={isWeb ? 'Then pick Solve, Explain, or Check to start Vision tutoring' : 'One clear page works better than a crowded shot'} />
      </View>
    </View>
  );
}

const INTENT_ICONS = {
  solve: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  explain: { ios: 'book.fill', android: 'menu_book', web: 'menu_book' },
  check: { ios: 'shield.fill', android: 'shield', web: 'shield' },
} as const;

function IntentButton({
  intent,
  theme,
  accent,
  onPress,
}: {
  intent: HomeworkIntent;
  theme: ReturnType<typeof useTheme>;
  accent?: boolean;
  onPress: () => void;
}) {
  const meta = HOMEWORK_INTENT_META[intent];
  const icon = INTENT_ICONS[intent];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${meta.label} this homework photo`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.intentButton,
        accent
          ? { backgroundColor: theme.sendButton }
          : {
              borderColor: theme.composerBorder,
              backgroundColor: theme.backgroundElement,
              borderWidth: 1,
            },
        pressed && styles.pressed,
      ]}>
      <SymbolView
        name={icon}
        size={17}
        tintColor={accent ? theme.sendButtonIcon : theme.text}
        weight="semibold"
      />
      <ThemedText
        type="smallBold"
        style={accent ? { color: theme.sendButtonIcon } : undefined}>
        {meta.label}
      </ThemedText>
    </Pressable>
  );
}

function TipRow({
  theme,
  text,
}: {
  theme: ReturnType<typeof useTheme>;
  text: string;
}) {
  return (
    <View style={styles.tipRow}>
      <View style={[styles.tipDot, { backgroundColor: theme.accent }]} />
      <ThemedText themeColor="textSecondary" style={styles.tipText}>
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    overflow: 'hidden',
  },
  flexWeb: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: Spacing.three,
    minHeight: 0,
  },
  viewfinder: {
    borderWidth: 1,
    borderRadius: 20,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    overflow: 'hidden',
  },
  viewfinderWeb: {
    minHeight: 240,
    flex: 1,
    maxHeight: 420,
    borderRadius: 24,
    ...Platform.select({
      web: { cursor: 'copy' as const },
    }),
  },
  webcamScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderWidth: 2.5,
  },
  cornerTL: { top: 14, left: 14, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: 14, right: 14, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: 14, left: 14, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 14, right: 14, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  iconStack: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  iconHalo: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 28,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSpark: {
    position: 'absolute',
    right: 4,
    top: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
      },
      android: { elevation: 2 },
      default: {
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      },
    }),
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: Spacing.one,
  },
  heroBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 300,
  },
  error: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  actions: {
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  captureButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  libraryButton: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tips: {
    gap: 10,
    paddingHorizontal: Spacing.one,
    marginBottom: Spacing.two,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  reviewHeader: {
    paddingTop: Spacing.three,
    marginBottom: Spacing.three,
  },
  reviewEyebrow: {
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    opacity: 0.65,
    marginBottom: 4,
  },
  reviewTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  reviewSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  previewFrame: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.three,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  intentRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  intentButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.two,
  },
  retakeButton: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  pressed: {
    opacity: 0.82,
  },
});
