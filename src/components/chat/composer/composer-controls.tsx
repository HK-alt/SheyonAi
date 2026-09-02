import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type TextInputContentSizeChangeEventData,
  type TextInputKeyPressEventData,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAppSettings } from '@/context/app-settings-context';
import { useTheme } from '@/hooks/use-theme';

function composerInputBounds(compact: boolean) {
  if (compact) return { min: 34, max: 80 };
  if (Platform.OS === 'web') return { min: 42, max: 160 };
  return { min: 40, max: 120 };
}

/** Show expand once the field is near max height or the draft is long. */
function shouldOfferExpand(inputHeight: number, maxHeight: number, value: string) {
  return inputHeight >= maxHeight - 2 || value.length >= 220 || value.split('\n').length >= 5;
}

function draftStats(value: string) {
  const trimmed = value.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const lines = value.length === 0 ? 0 : value.split('\n').length;
  return { chars: value.length, words, lines };
}

function getWebInputNode(component: TextInput | null): HTMLElement | null {
  if (Platform.OS !== 'web' || !component) return null;
  const value = component as unknown as HTMLElement & {
    getNativeRef?: () => HTMLElement | null;
  };
  if (typeof value.addEventListener === 'function') return value;
  const native = value.getNativeRef?.() ?? null;
  return native && typeof native.addEventListener === 'function' ? native : null;
}

function isWebEnterSubmit(event: {
  key?: string;
  shiftKey?: boolean;
  isComposing?: boolean;
  keyCode?: number;
}) {
  return (
    event.key === 'Enter' &&
    !event.shiftKey &&
    !event.isComposing &&
    event.keyCode !== 229
  );
}

type ComposerHintProps = {
  message: string;
};

export function ComposerHint({ message }: ComposerHintProps) {
  const theme = useTheme();
  return (
    <View style={[styles.hint, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {message}
      </ThemedText>
    </View>
  );
}

type AttachButtonProps = {
  onPress: () => void;
  compact?: boolean;
  circle?: boolean;
  soft?: boolean;
};

export function AttachButton({
  onPress,
  compact = false,
  circle = false,
  soft = false,
}: AttachButtonProps) {
  const theme = useTheme();
  const size = compact ? 32 : 36;
  const isWeb = Platform.OS === 'web';
  const iconColor = isWeb ? theme.accent : soft ? theme.textSecondary : theme.actionIcon;
  const glyph = isWeb ? (
    <SymbolView
      name={{ ios: 'plus', android: 'add', web: 'add' }}
      size={compact ? 18 : 20}
      tintColor={iconColor}
    />
  ) : (
    <ThemedText style={[compact ? styles.iconTextCompact : styles.iconText, { color: iconColor }]}>
      +
    </ThemedText>
  );

  if (soft) {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={6}
        accessibilityLabel="Attach"
        style={({ pressed }) => [
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: isWeb ? theme.accentMuted : theme.backgroundElement,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
            ...Platform.select({ web: { cursor: 'pointer' } }),
          },
          pressed && styles.pressed,
        ]}>
        {glyph}
      </Pressable>
    );
  }

  if (circle) {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={6}
        accessibilityLabel="Attach"
        style={({ pressed }) => [
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1.5,
            borderColor: theme.actionIcon,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
            ...Platform.select({ web: { cursor: 'pointer' } }),
          },
          pressed && styles.pressed,
        ]}>
        {glyph}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityLabel="Attach"
      style={({ pressed }) => [
        compact ? styles.iconButtonCompact : styles.iconButton,
        pressed && styles.pressed,
      ]}>
      {glyph}
    </Pressable>
  );
}

type ExpandButtonProps = {
  expanded: boolean;
  onPress: () => void;
};

export function ExpandButton({ expanded, onPress }: ExpandButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <ThemedText style={[styles.iconText, { color: theme.actionIcon }]}>
        {expanded ? '‹' : '›'}
      </ThemedText>
    </Pressable>
  );
}

type ComposerTextInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  compact?: boolean;
  placeholder?: string;
  /** When set, the caret is forced to this range (used after LaTeX inserts). */
  selection?: { start: number; end: number };
  onSelectionChange?: (selection: { start: number; end: number }) => void;
  /** Web: Enter sends; Shift+Enter inserts a newline. */
  onEnterSubmit?: () => void;
};

export function ComposerTextInput({
  value,
  onChangeText,
  compact = false,
  placeholder = 'Message Sheyon Ai...',
  selection,
  onSelectionChange,
  onEnterSubmit,
}: ComposerTextInputProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const { sendOnEnter } = useAppSettings();
  const { min: minHeight, max: maxHeight } = composerInputBounds(compact);
  const [inputHeight, setInputHeight] = useState(minHeight);
  const [expanded, setExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [canUndoClear, setCanUndoClear] = useState(false);
  const clearedSnapshotRef = useRef<string | null>(null);
  const onEnterSubmitRef = useRef(onEnterSubmit);
  const sendOnEnterRef = useRef(sendOnEnter);
  const lastSubmitAtRef = useRef(0);
  const detachWebEnterRef = useRef<(() => void) | null>(null);
  onEnterSubmitRef.current = onEnterSubmit;
  sendOnEnterRef.current = sendOnEnter;

  const offerExpand = shouldOfferExpand(inputHeight, maxHeight, value);
  const stats = useMemo(() => draftStats(value), [value]);
  const remaining = Math.max(0, 4000 - stats.chars);
  const nearLimit = remaining <= 200;
  const expandedInputMinHeight = fullscreen
    ? Math.max(360, windowHeight - Math.max(insets.top, 12) - Math.max(insets.bottom, 12) - 168)
    : Math.min(Math.max(280, windowHeight * 0.45), windowHeight * 0.7);

  useEffect(() => {
    if (!value.trim()) setInputHeight(minHeight);
  }, [value, minHeight]);

  useEffect(() => {
    if (!expanded || Platform.OS !== 'web') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setExpanded(false);
        setFullscreen(false);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        if (onEnterSubmitRef.current) {
          setExpanded(false);
          setFullscreen(false);
          onEnterSubmitRef.current();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expanded]);

  useEffect(() => {
    if (!statusNote) return;
    const timer = setTimeout(() => setStatusNote(null), 1600);
    return () => clearTimeout(timer);
  }, [statusNote]);

  function handleContentSizeChange(event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) {
    const next = Math.ceil(event.nativeEvent.contentSize.height);
    setInputHeight(Math.min(maxHeight, Math.max(minHeight, next)));
  }

  function submitFromEnter(event: { preventDefault: () => void; stopPropagation?: () => void }) {
    if (!sendOnEnterRef.current) return;
    event.preventDefault();
    event.stopPropagation?.();
    const now = Date.now();
    if (now - lastSubmitAtRef.current < 80) return;
    lastSubmitAtRef.current = now;
    onEnterSubmitRef.current?.();
  }

  function closeExpanded() {
    setExpanded(false);
    setFullscreen(false);
  }

  function handleExpandedSubmit() {
    closeExpanded();
    onEnterSubmit?.();
  }

  async function handleCopyDraft() {
    if (!value) return;
    try {
      await Clipboard.setStringAsync(value);
      setCopied(true);
      setStatusNote('Copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setStatusNote('Clipboard copy blocked by the browser');
    }
  }

  async function handlePasteAppend() {
    try {
      const clip = (await Clipboard.getStringAsync()).trim();
      if (!clip) {
        setStatusNote('Clipboard empty — allow paste permission, or use Ctrl+V');
        return;
      }
      const next = value ? `${value.replace(/\s+$/, '')}\n\n${clip}` : clip;
      onChangeText(next.slice(0, 4000));
      setStatusNote(next.length > 4000 ? 'Pasted (trimmed to 4000)' : 'Pasted');
    } catch {
      setStatusNote('Clipboard paste blocked — use Ctrl+V in the editor');
    }
  }

  function clearDraft() {
    clearedSnapshotRef.current = value;
    setCanUndoClear(true);
    onChangeText('');
    setStatusNote('Cleared · Undo available');
  }

  function handleClearDraft() {
    if (!value.trim()) return;
    if (Platform.OS === 'web') {
      clearDraft();
      return;
    }
    Alert.alert('Clear draft?', 'You can undo once after clearing.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearDraft },
    ]);
  }

  function handleUndoClear() {
    const snapshot = clearedSnapshotRef.current;
    if (!snapshot) return;
    onChangeText(snapshot);
    clearedSnapshotRef.current = null;
    setCanUndoClear(false);
    setStatusNote('Restored');
  }

  const setInputRef = useCallback((component: TextInput | null) => {
    detachWebEnterRef.current?.();
    detachWebEnterRef.current = null;
    if (Platform.OS !== 'web') return;
    const node = getWebInputNode(component);
    if (!node) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!sendOnEnterRef.current) return;
      if (!isWebEnterSubmit(event)) return;
      event.preventDefault();
      event.stopPropagation();
      const now = Date.now();
      if (now - lastSubmitAtRef.current < 80) return;
      lastSubmitAtRef.current = now;
      onEnterSubmitRef.current?.();
    };

    node.addEventListener('keydown', onKeyDown, true);
    detachWebEnterRef.current = () => node.removeEventListener('keydown', onKeyDown, true);
  }, []);

  function handleWebKeyDown(event: {
    key?: string;
    shiftKey?: boolean;
    nativeEvent?: { isComposing?: boolean; keyCode?: number };
    preventDefault: () => void;
    stopPropagation: () => void;
  }) {
    if (
      !isWebEnterSubmit({
        key: event.key,
        shiftKey: event.shiftKey,
        isComposing: event.nativeEvent?.isComposing,
        keyCode: event.nativeEvent?.keyCode,
      })
    ) {
      return;
    }
    submitFromEnter(event);
  }

  function handleKeyPress(event: NativeSyntheticEvent<TextInputKeyPressEventData>) {
    if (Platform.OS !== 'web') return;
    const webEvent = event as NativeSyntheticEvent<TextInputKeyPressEventData> & {
      key?: string;
      shiftKey?: boolean;
      nativeEvent: TextInputKeyPressEventData & {
        shiftKey?: boolean;
        isComposing?: boolean;
        keyCode?: number;
      };
    };
    if (
      !isWebEnterSubmit({
        key: webEvent.key ?? event.nativeEvent.key,
        shiftKey: webEvent.shiftKey ?? webEvent.nativeEvent.shiftKey,
        isComposing: webEvent.nativeEvent.isComposing,
        keyCode: webEvent.nativeEvent.keyCode,
      })
    ) {
      return;
    }
    submitFromEnter(event);
  }

  return (
    <View
      style={styles.inputWrap}
      {...(Platform.OS === 'web' ? { onKeyDownCapture: handleWebKeyDown } : null)}>
      <TextInput
        ref={setInputRef}
        style={[
          compact ? styles.inputCompact : styles.input,
          Platform.OS === 'web' && styles.inputWeb,
          offerExpand && styles.inputWithExpand,
          {
            color: theme.text,
            height: inputHeight,
            maxHeight,
            minHeight,
            ...(Platform.OS === 'web' ? ({ overflow: 'auto' } as object) : null),
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        value={value}
        onChangeText={onChangeText}
        selection={selection}
        onSelectionChange={
          onSelectionChange
            ? (event) => onSelectionChange(event.nativeEvent.selection)
            : undefined
        }
        onContentSizeChange={handleContentSizeChange}
        onKeyPress={handleKeyPress}
        multiline
        scrollEnabled
        maxLength={4000}
        returnKeyType="send"
        enterKeyHint="send"
        blurOnSubmit={false}
      />

      {offerExpand ? (
        <Pressable
          onPress={() => setExpanded(true)}
          hitSlop={8}
          accessibilityLabel="Expand message editor"
          style={({ pressed }) => [
            styles.expandHit,
            {
              backgroundColor: theme.composerBackground,
              borderColor: theme.composerBorder,
            },
            pressed && styles.pressed,
          ]}>
          <SymbolView
            name={
              {
                ios: 'arrow.up.left.and.arrow.down.right',
                android: 'open_in_full',
                web: 'open_in_full',
              } as never
            }
            size={14}
            tintColor={theme.actionIcon}
            weight="medium"
          />
        </Pressable>
      ) : null}

      <Modal visible={expanded} transparent animationType="fade" onRequestClose={closeExpanded}>
        <Pressable
          style={[
            styles.expandBackdrop,
            {
              backgroundColor: Platform.OS === 'web' ? 'rgba(15, 23, 42, 0.45)' : 'rgba(0,0,0,0.45)',
              paddingTop: Math.max(insets.top, Spacing.three),
              paddingBottom: Math.max(insets.bottom, Spacing.three),
            },
          ]}
          onPress={closeExpanded}>
          <Pressable
            style={[
              styles.expandCard,
              Platform.OS === 'web' && styles.expandCardWeb,
              fullscreen && styles.expandCardFullscreen,
              {
                backgroundColor: theme.composerBackground,
                borderColor: theme.composerBorder,
                maxHeight:
                  windowHeight - Math.max(insets.top, 12) - Math.max(insets.bottom, 12) - (fullscreen ? 8 : 24),
                width: fullscreen ? Math.min(windowWidth - 16, 1100) : undefined,
              },
            ]}
            onPress={(event) => event.stopPropagation()}>
            <View style={styles.expandHeader}>
              <View style={styles.expandTitleBlock}>
                <ThemedText type="smallBold">Expanded editor</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {stats.words} words · {stats.lines} lines · {stats.chars}/4000
                  {nearLimit ? ` · ${remaining} left` : ''}
                </ThemedText>
              </View>
              <View style={styles.expandHeaderActions}>
                {onEnterSubmit ? (
                  <Pressable
                    onPress={handleExpandedSubmit}
                    disabled={!value.trim()}
                    accessibilityLabel="Send message"
                    style={({ pressed }) => [
                      styles.expandAction,
                      {
                        backgroundColor: value.trim() ? theme.sendButton : theme.sendButtonDisabled,
                      },
                      pressed && value.trim() && styles.pressed,
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={{
                        color: value.trim() ? theme.sendButtonIcon : theme.textSecondary,
                      }}>
                      Send
                    </ThemedText>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={closeExpanded}
                  accessibilityLabel="Collapse editor"
                  style={({ pressed }) => [
                    styles.expandAction,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.composerBorder,
                      borderWidth: StyleSheet.hairlineWidth,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold">Done</ThemedText>
                </Pressable>
              </View>
            </View>

            <View style={styles.expandToolbar}>
              <ExpandToolButton
                label={copied ? 'Copied' : 'Copy'}
                icon={{ ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' }}
                onPress={() => void handleCopyDraft()}
                disabled={!value}
              />
              <ExpandToolButton
                label="Paste"
                icon={{ ios: 'doc.on.clipboard', android: 'content_paste', web: 'content_paste' }}
                onPress={() => void handlePasteAppend()}
              />
              <ExpandToolButton
                label="Clear"
                icon={{ ios: 'trash', android: 'delete', web: 'delete' }}
                onPress={handleClearDraft}
                disabled={!value.trim()}
              />
              {canUndoClear ? (
                <ExpandToolButton
                  label="Undo"
                  icon={{ ios: 'arrow.uturn.backward', android: 'undo', web: 'undo' }}
                  onPress={handleUndoClear}
                />
              ) : null}
              <ExpandToolButton
                label={fullscreen ? 'Exit full' : 'Fullscreen'}
                icon={{
                  ios: fullscreen ? 'arrow.down.right.and.arrow.up.left' : 'arrow.up.left.and.arrow.down.right',
                  android: fullscreen ? 'fullscreen_exit' : 'fullscreen',
                  web: fullscreen ? 'fullscreen_exit' : 'fullscreen',
                }}
                onPress={() => setFullscreen((v) => !v)}
              />
            </View>

            <TextInput
              style={[
                styles.expandInput,
                Platform.OS === 'web' && styles.expandInputWeb,
                {
                  color: theme.text,
                  backgroundColor: theme.background,
                  borderColor: theme.composerBorder,
                  minHeight: expandedInputMinHeight,
                  flexGrow: fullscreen ? 1 : undefined,
                  ...(Platform.OS === 'web' ? ({ overflow: 'auto' } as object) : null),
                },
              ]}
              placeholder={placeholder}
              placeholderTextColor={theme.textSecondary}
              value={value}
              onChangeText={(text) => {
                clearedSnapshotRef.current = null;
                setCanUndoClear(false);
                onChangeText(text);
              }}
              selection={selection}
              onSelectionChange={
                onSelectionChange
                  ? (event) => onSelectionChange(event.nativeEvent.selection)
                  : undefined
              }
              onKeyPress={handleKeyPress}
              multiline
              scrollEnabled
              maxLength={4000}
              autoFocus
              textAlignVertical="top"
              blurOnSubmit={false}
            />

            <View style={styles.expandFooter}>
              <ThemedText type="small" themeColor="textSecondary">
                {Platform.OS === 'web'
                  ? 'Esc closes · ⌘/Ctrl+Enter sends · Shift+Enter newline'
                  : 'Shift+Enter for newline'}
              </ThemedText>
              <ThemedText
                type="small"
                themeColor={nearLimit ? 'text' : 'textSecondary'}
                style={nearLimit ? { color: theme.destructive } : undefined}>
                {statusNote ?? `${remaining} characters left`}
              </ThemedText>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

type ExpandToolButtonProps = {
  label: string;
  icon: { ios: string; android: string; web: string };
  onPress: () => void;
  disabled?: boolean;
};

function ExpandToolButton({ label, icon, onPress, disabled }: ExpandToolButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.expandTool,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.composerBorder,
          opacity: disabled ? 0.45 : 1,
        },
        pressed && !disabled && styles.pressed,
      ]}>
      <SymbolView name={icon as never} size={14} tintColor={theme.actionIcon} weight="medium" />
      <ThemedText type="small" style={styles.expandToolLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

type SendStopButtonProps = {
  canSend: boolean;
  isGenerating: boolean;
  onPress: () => void;
  compact?: boolean;
  whatsappStyle?: boolean;
  accentColor?: string;
};

export function SendStopButton({
  canSend,
  isGenerating,
  onPress,
  compact = false,
  whatsappStyle: _whatsappStyle = false,
  accentColor,
}: SendStopButtonProps) {
  const theme = useTheme();
  const active = canSend || isGenerating;
  const size = compact ? 32 : 36;
  const fill = active ? (accentColor ?? theme.sendButton) : theme.sendButtonDisabled;
  const glyph = active ? theme.sendButtonIcon : theme.textSecondary;
  const isWeb = Platform.OS === 'web';

  return (
    <Pressable
      onPress={onPress}
      disabled={!active}
      accessibilityLabel={isGenerating ? 'Stop generating' : 'Send message'}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          marginBottom: compact ? 0 : 2,
          backgroundColor: fill,
          ...Platform.select({ web: { cursor: 'pointer' as const } }),
        },
        pressed && active && styles.pressed,
      ]}>
      {isGenerating ? (
        <View style={[styles.stopSquare, { backgroundColor: glyph }]} />
      ) : isWeb ? (
        <SymbolView
          name={{ ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }}
          size={18}
          tintColor={glyph}
          weight="semibold"
        />
      ) : (
        <View
          style={[
            styles.sendArrow,
            {
              borderBottomColor: glyph,
            },
          ]}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hint: {
    alignSelf: 'center',
    borderRadius: 12,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  iconButton: {
    width: 32,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconButtonCompact: {
    width: 28,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  iconText: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '400',
  },
  iconTextCompact: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '400',
  },
  inputWrap: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
  },
  input: {
    width: '100%',
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: Spacing.two,
  },
  inputCompact: {
    width: '100%',
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  inputWeb: {
    fontSize: 15,
    lineHeight: 22,
    paddingVertical: 10,
    outlineStyle: 'none' as unknown as undefined,
  },
  inputWithExpand: {
    paddingRight: 28,
  },
  expandHit: {
    position: 'absolute',
    top: 4,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  expandBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  expandCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
    ...Platform.select({
      web: {
        boxShadow: '0 18px 48px rgba(15, 23, 42, 0.18)',
      },
      default: {
        elevation: 8,
      },
    }),
  },
  expandCardWeb: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  expandCardFullscreen: {
    maxWidth: 1100,
    flex: 1,
  },
  expandHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  expandTitleBlock: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  expandHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexShrink: 0,
  },
  expandAction: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  expandToolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  expandTool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  expandToolLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  expandInput: {
    width: '100%',
    fontSize: 16,
    lineHeight: 24,
    padding: Spacing.two,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  expandInputWeb: {
    fontSize: 15,
    lineHeight: 24,
    outlineStyle: 'none' as unknown as undefined,
  },
  expandFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  sendArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '90deg' }],
    marginLeft: 2,
  },
  stopSquare: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
