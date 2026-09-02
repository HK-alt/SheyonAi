import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { previewLatex, toMathLiveInsert } from '@/lib/latex-insert';
import { buildMathLiveFieldHtml } from '@/lib/mathlive-field-html';
import type { MathComposerHandle } from '@/components/chat/composer/types';

type MathComposerInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  displayMode?: boolean;
  onEnterSubmit?: () => void;
};

type FieldMessage = {
  type?: string;
  value?: string;
  height?: number;
};

export const MathComposerInput = forwardRef<MathComposerHandle, MathComposerInputProps>(
  function MathComposerInput(
    {
      value,
      onChangeText,
      placeholder = 'Type or tap symbols to build an equation…',
      displayMode = true,
    },
    ref,
  ) {
    const theme = useTheme();
    const webRef = useRef<WebView>(null);
    const keyboardRef = useRef<TextInput>(null);
    const readyRef = useRef(false);
    const lastEmittedRef = useRef('');
    const queuedRef = useRef<string[]>([]);
    const skipSyncRef = useRef(false);
    const spaceSentRef = useRef(false);
    const [ready, setReady] = useState(false);
    const [height, setHeight] = useState(displayMode ? 72 : 56);
    const [keyBuffer, setKeyBuffer] = useState('');

    const html = useMemo(
      () =>
        buildMathLiveFieldHtml({
          placeholder,
          displayMode,
          theme: {
            text: theme.text,
            textSecondary: theme.textSecondary,
            accent: theme.accent,
            accentMuted: theme.accentMuted,
          },
        }),
      [placeholder, displayMode, theme.text, theme.textSecondary, theme.accent, theme.accentMuted],
    );

    const send = useCallback((command: Record<string, unknown>) => {
      const js = `window.__evoMathComposer && window.__evoMathComposer(${JSON.stringify(command)}); true;`;
      if (!readyRef.current || !webRef.current) {
        queuedRef.current.push(js);
        return;
      }
      webRef.current.injectJavaScript(js);
    }, []);

    const flushQueue = useCallback(() => {
      const web = webRef.current;
      if (!web) return;
      for (const js of queuedRef.current) web.injectJavaScript(js);
      queuedRef.current = [];
    }, []);

    const focusEditor = useCallback(() => {
      keyboardRef.current?.focus();
      send({ type: 'focus' });
    }, [send]);

    useImperativeHandle(
      ref,
      () => ({
        focus: focusEditor,
        insertLatex: (snippet: string) => {
          send({ type: 'insert', latex: toMathLiveInsert(snippet) });
        },
        jumpNextPlaceholder: () => {
          send({ type: 'next' });
        },
        deleteBackward: () => {
          send({ type: 'backspace' });
        },
      }),
      [focusEditor, send],
    );

    useEffect(() => {
      if (!ready) return;
      if (skipSyncRef.current) {
        skipSyncRef.current = false;
        return;
      }
      const next = previewLatex(value);
      if (next === lastEmittedRef.current) return;
      send({ type: 'setValue', value: next });
      lastEmittedRef.current = next;
    }, [value, ready, send]);

    const handleMessage = useCallback(
      (event: WebViewMessageEvent) => {
        try {
          const data = JSON.parse(event.nativeEvent.data) as FieldMessage;
          if (data.type === 'ready') {
            readyRef.current = true;
            setReady(true);
            const next = previewLatex(value);
            lastEmittedRef.current = next;
            send({ type: 'setValue', value: next });
            flushQueue();
            return;
          }
          if (data.type === 'input' && typeof data.value === 'string') {
            skipSyncRef.current = true;
            lastEmittedRef.current = data.value;
            onChangeText(data.value);
            return;
          }
          if (data.type === 'size' && typeof data.height === 'number' && Number.isFinite(data.height)) {
            const nextHeight = Math.min(180, Math.max(displayMode ? 72 : 56, data.height));
            setHeight((prev) => (Math.abs(prev - nextHeight) > 1 ? nextHeight : prev));
          }
        } catch {
          // Ignore non-JSON messages from the WebView shell.
        }
      },
      [displayMode, flushQueue, onChangeText, send, value],
    );

    return (
      <View
        style={[
          styles.card,
          {
            borderColor: theme.composerBorder,
            backgroundColor: theme.composerBackground,
            height,
          },
        ]}
        accessibilityLabel="Editable equation">
        <WebView
          ref={webRef}
          key={`${displayMode}-${theme.text}-${theme.accent}`}
          source={{ html, baseUrl: 'https://cdn.jsdelivr.net' }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          hideKeyboardAccessoryView={false}
          keyboardDisplayRequiresUserAction={false}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={false}
          automaticallyAdjustContentInsets={false}
          setBuiltInZoomControls={false}
          mixedContentMode="compatibility"
          onLoadStart={() => {
            readyRef.current = false;
            setReady(false);
          }}
          onTouchStart={focusEditor}
          onMessage={handleMessage}
          style={styles.webview}
        />
        <TextInput
          ref={keyboardRef}
          value={keyBuffer}
          onChangeText={(text) => {
            if (text.length < keyBuffer.length) {
              send({ type: 'backspace' });
            } else if (text.length > keyBuffer.length) {
              const added = text.slice(keyBuffer.length);
              if (added === ' ' && spaceSentRef.current) {
                spaceSentRef.current = false;
              } else {
                send({ type: 'typed', text: added });
              }
            }
            setKeyBuffer('');
          }}
          onKeyPress={(event) => {
            const key = event.nativeEvent.key;
            if (key === 'Backspace' && keyBuffer.length === 0) {
              send({ type: 'backspace' });
              return;
            }
            if (key === ' ' || key === 'Spacebar' || key === 'Space') {
              spaceSentRef.current = true;
              send({ type: 'typed', text: ' ' });
            }
          }}
          blurOnSubmit={false}
          caretHidden
          autoCorrect={false}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          importantForAutofill="no"
          showSoftInputOnFocus
          keyboardType="default"
          accessibilityLabel="Equation keyboard"
          style={styles.keyboardProbe}
        />
        {!ready ? (
          <View style={[styles.loading, styles.loadingPassthrough]}>
            <ThemedText type="small" themeColor="textSecondary">
              {placeholder}
            </ThemedText>
          </View>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardProbe: {
    position: 'absolute',
    opacity: 0.02,
    height: 40,
    left: 0,
    right: 0,
    bottom: 0,
    color: 'transparent',
    backgroundColor: 'transparent',
  },
  loading: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  loadingPassthrough: {
    pointerEvents: 'none',
  },
});
