import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuthContext } from '@/context/auth-context';
import { useChat } from '@/context/chat-context';
import { useTheme } from '@/hooks/use-theme';
import { pickAnyFile, pickDocumentFile, waitForModalDismiss } from '@/lib/document-upload';
import { isOcrAvailable } from '@/lib/ocr-availability';
import { nextRagScopeAfterUpload, ragUploadSuccessHint } from '@/lib/rag-scope';
import { useDocumentStore } from '@/store/document-store';
import type { PendingAttachment } from '@/types/chat';

type AttachmentSheetProps = {
  visible: boolean;
  onClose: () => void;
  onAdd: (attachment: Omit<PendingAttachment, 'id'>) => void;
  onError: (message: string) => void;
  onHint?: (message: string) => void;
  /** Opens the OCR scanner (native dev build). */
  onScanText?: () => void;
  /** When true, only show document upload (Documents mode). */
  documentsOnly?: boolean;
};

type OptionRowProps = {
  label: string;
  subtitle: string;
  icon: { ios: string; android: string; web: string };
  iconColor: string;
  onPress: () => void;
  featured?: boolean;
};

const isWeb = Platform.OS === 'web';

function OptionRow({ label, subtitle, icon, iconColor, onPress, featured = false }: OptionRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.option,
        featured && styles.optionFeatured,
        {
          borderColor: featured
            ? `${iconColor}55`
            : hovered || pressed
              ? theme.accent
              : theme.composerBorder,
          backgroundColor: featured
            ? `${iconColor}12`
            : hovered
              ? theme.backgroundSelected
              : theme.composerBackground,
        },
        pressed && styles.pressed,
        isWeb && styles.optionWeb,
      ]}>
      <View
        style={[
          styles.iconWell,
          featured && styles.iconWellFeatured,
          { backgroundColor: `${iconColor}${featured ? '28' : '1A'}` },
        ]}>
        <SymbolView
          name={icon as never}
          size={featured ? 22 : 18}
          tintColor={iconColor}
          weight="medium"
        />
      </View>
      <View style={styles.optionText}>
        <ThemedText style={[styles.optionLabel, featured && styles.optionLabelFeatured]} numberOfLines={1}>
          {label}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {subtitle}
        </ThemedText>
      </View>
      <ThemedText style={[styles.chevron, { color: theme.textSecondary }]}>›</ThemedText>
    </Pressable>
  );
}

function assetToAttachment(
  asset: ImagePicker.ImagePickerAsset,
): Omit<PendingAttachment, 'id'> {
  return {
    localUri: asset.uri,
    mimeType: asset.mimeType ?? 'image/jpeg',
    name: asset.fileName ?? `photo-${Date.now()}.jpg`,
    size: asset.fileSize,
  };
}

export function AttachmentSheet({
  visible,
  onClose,
  onAdd,
  onError,
  onHint,
  onScanText,
  documentsOnly = false,
}: AttachmentSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuthContext();
  const { activeRagDocumentIds, setRagDocumentScope } = useChat();
  const { uploadDocument } = useDocumentStore();

  async function pickFromLibrary() {
    onClose();
    await waitForModalDismiss();

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        onError('Photo library permission is required.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 4,
        exif: false,
      });
      if (!result.canceled) {
        result.assets.forEach((asset) => onAdd(assetToAttachment(asset)));
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not open photo library.');
    }
  }

  async function takePhoto() {
    onClose();
    await waitForModalDismiss();

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        onError('Camera permission is required.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        exif: false,
      });
      if (!result.canceled && result.assets[0]) {
        onAdd(assetToAttachment(result.assets[0]));
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not open camera.');
    }
  }

  async function attachFileToMessage() {
    onClose();
    await waitForModalDismiss();

    try {
      const picked = await pickAnyFile();
      if (!picked) return;

      onAdd({
        localUri: picked.uri,
        mimeType: picked.mimeType,
        name: picked.name,
        size: picked.size,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not attach file.');
    }
  }

  async function uploadDocumentFile() {
    if (!session?.user?.id) {
      onError('You must be signed in to upload documents.');
      onClose();
      return;
    }

    onClose();
    await waitForModalDismiss();

    try {
      const picked = await pickDocumentFile();
      if (!picked) return;

      onHint?.('Uploading document…');
      const doc = await uploadDocument(picked, session.user.id);

      const nextScope = nextRagScopeAfterUpload(activeRagDocumentIds, doc.id);
      if (nextScope) {
        await setRagDocumentScope(nextScope).catch(() => {});
      }

      onHint?.(ragUploadSuccessHint(doc.chunksCreated));
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Upload failed.');
    }
  }

  async function handleScanText() {
    onClose();
    await waitForModalDismiss();

    const available = await isOcrAvailable();
    if (!available) {
      onError('Scan text requires a development build (not available in Expo Go).');
      return;
    }

    onScanText?.();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[
          styles.backdrop,
          isWeb && styles.backdropWeb,
          { paddingBottom: Math.max(insets.bottom, Spacing.three) },
        ]}
        onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            isWeb && styles.sheetWeb,
            {
              backgroundColor: isWeb ? theme.composerBackground : theme.backgroundElement,
              borderColor: theme.composerBorder,
            },
          ]}
          onPress={(event) => event.stopPropagation()}>
          {isWeb ? null : (
            <View style={[styles.handle, { backgroundColor: theme.composerBorder }]} />
          )}

          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: `${theme.accent}18` }]}>
              <SymbolView
                name={
                  {
                    ios: 'paperclip',
                    android: 'attach_file',
                    web: 'attach_file',
                  } as never
                }
                size={20}
                tintColor={theme.accent}
                weight="medium"
              />
            </View>
            <View style={styles.headerText}>
              <ThemedText type="smallBold" style={styles.title}>
                {documentsOnly ? 'Upload document' : 'Add attachment'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {documentsOnly
                  ? 'Add a file to your document library'
                  : 'Photos, documents, and other files'}
              </ThemedText>
            </View>
          </View>

          <View style={styles.options}>
            {documentsOnly ? (
              <OptionRow
                featured
                label="Upload document"
                subtitle="PDF, Word, text, or LaTeX"
                icon={{ ios: 'doc.text.fill', android: 'description', web: 'description' }}
                iconColor="#5B7CFA"
                onPress={() => void uploadDocumentFile()}
              />
            ) : (
              <>
                <OptionRow
                  featured
                  label="Attach file"
                  subtitle="PDFs, Word, text, and images"
                  icon={{ ios: 'paperclip', android: 'attach_file', web: 'attach_file' }}
                  iconColor="#5B7CFA"
                  onPress={() => void attachFileToMessage()}
                />
                <OptionRow
                  label="Photo library"
                  subtitle="Choose up to 4 images"
                  icon={{ ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' }}
                  iconColor="#0D9488"
                  onPress={() => void pickFromLibrary()}
                />
                {Platform.OS !== 'web' && (
                  <OptionRow
                    label="Take photo"
                    subtitle="Capture with the camera"
                    icon={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
                    iconColor="#B45309"
                    onPress={() => void takePhoto()}
                  />
                )}
                {Platform.OS !== 'web' && (
                  <OptionRow
                    label="Scan text into chat"
                    subtitle="OCR from a photo (dev build)"
                    icon={{ ios: 'text.viewfinder', android: 'document_scanner', web: 'document_scanner' }}
                    iconColor="#64748B"
                    onPress={() => void handleScanText()}
                  />
                )}
              </>
            )}
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.cancel,
              hovered && { backgroundColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <ThemedText themeColor="textSecondary" style={styles.cancelLabel}>
              Cancel
            </ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  backdropWeb: {
    ...Platform.select({
      web: {
        position: 'fixed' as unknown as 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: Spacing.three,
        backgroundColor: 'rgba(15, 23, 42, 0.52)',
      },
    }),
  },
  sheet: {
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
  },
  sheetWeb: {
    maxWidth: 440,
    alignSelf: 'center',
    borderRadius: 22,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
    ...Platform.select({
      web: {
        boxShadow: '0 24px 64px rgba(15, 23, 42, 0.22)',
      },
    }),
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.one,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 17,
    letterSpacing: -0.2,
  },
  options: {
    gap: Spacing.two,
  },
  option: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: Spacing.two + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  optionFeatured: {
    paddingVertical: Spacing.three,
  },
  optionWeb: {
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transitionProperty: 'background-color, border-color, transform',
        transitionDuration: '140ms',
      } as object,
    }),
  },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconWellFeatured: {
    width: 46,
    height: 46,
    borderRadius: 14,
  },
  optionText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  optionLabelFeatured: {
    fontSize: 16,
  },
  chevron: {
    fontSize: 22,
    fontWeight: '300',
    lineHeight: 24,
    marginRight: 2,
  },
  cancel: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two + 2,
    borderRadius: 12,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  cancelLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.82,
  },
});
