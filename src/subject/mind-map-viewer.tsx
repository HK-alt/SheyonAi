import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useThemePreference } from '@/context/theme-preference-context';
import { useTheme } from '@/hooks/use-theme';
import { MIND_MAP_BASE_URL, MIND_MAP_HTML } from '@/subject/mind-map-html';
import type { MindElixirData } from '@/subject/mind-map-types';

export type MindMapVariant = 'inline' | 'fullscreen';

export type MindMapViewerHandle = {
  sendCommand: (cmd: 'zoomIn' | 'zoomOut' | 'reset') => void;
};

export type MindMapViewerProps = {
  data: MindElixirData;
  variant?: MindMapVariant;
  onNodeSelect?: (topic: string) => void;
  /** Opens fullscreen modal; shown in toolbar next to zoom controls (inline only). */
  onExpand?: () => void;
  /** Render toolbar inside the viewer; default true for inline, false for fullscreen */
  showToolbar?: boolean;
  viewerRef?: React.MutableRefObject<MindMapViewerHandle | null>;
};

const INLINE_HEIGHT = Platform.OS === 'web' ? 420 : 380;

export function MindMapViewer({
  data,
  variant = 'inline',
  onNodeSelect,
  onExpand,
  showToolbar,
  viewerRef,
}: MindMapViewerProps) {
  const theme = useTheme();
  const { resolvedScheme } = useThemePreference();
  const webViewRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const [libReady, setLibReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFullscreen = variant === 'fullscreen';
  const showToolbarFinal = showToolbar ?? !isFullscreen;

  const serializedData = useMemo(() => JSON.stringify(data), [data]);

  const injectCommand = useCallback((cmd: 'zoomIn' | 'zoomOut' | 'reset') => {
    webViewRef.current?.postMessage(JSON.stringify({ type: 'command', command: cmd }));
    webViewRef.current?.injectJavaScript(
      `window.__mindMapCommand && window.__mindMapCommand(${JSON.stringify(cmd)}); true;`,
    );
  }, []);

  if (viewerRef) {
    viewerRef.current = { sendCommand: injectCommand };
  }

  const pushData = useCallback(() => {
    if (!readyRef.current) return;
    const msg = JSON.stringify({ type: 'init', data: JSON.parse(serializedData), theme: resolvedScheme });
    webViewRef.current?.postMessage(msg);
    webViewRef.current?.injectJavaScript(
      `window.__initMindMap && window.__initMindMap(${JSON.stringify(serializedData)}, ${JSON.stringify(resolvedScheme)}); true;`,
    );
  }, [serializedData, resolvedScheme]);

  useEffect(() => {
    pushData();
  }, [pushData]);

  // Push theme changes independently when scheme changes but data has not.
  useEffect(() => {
    if (!readyRef.current) return;
    webViewRef.current?.postMessage(JSON.stringify({ type: 'setTheme', theme: resolvedScheme }));
    webViewRef.current?.injectJavaScript(
      `window.__mindMapCommand && true; if(window.__mindMapApplyTheme) window.__mindMapApplyTheme(${JSON.stringify(resolvedScheme)}); true;`,
    );
  }, [resolvedScheme]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const payload = JSON.parse(event.nativeEvent.data) as {
          type?: string;
          message?: string;
          topic?: string;
        };
        if (payload.type === 'ready') {
          readyRef.current = true;
          setLibReady(true);
          setError(null);
          pushData();
        } else if (payload.type === 'error') {
          setError(payload.message ?? 'Could not render the mind map.');
        } else if (payload.type === 'nodeSelected' && payload.topic) {
          onNodeSelect?.(payload.topic);
        }
      } catch {
        // Ignore non-JSON messages from the WebView shell.
      }
    },
    [pushData, onNodeSelect],
  );

  const containerStyle = isFullscreen
    ? [styles.containerFullscreen, { backgroundColor: theme.background }]
    : [
        styles.containerInline,
        {
          height: INLINE_HEIGHT,
          backgroundColor: theme.background,
          borderColor: theme.composerBorder,
        },
      ];

  return (
    <View style={containerStyle}>
      {showToolbarFinal && libReady && !error && (
        <View style={[styles.toolbar, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.composerBorder }]}>
          {(['zoomOut', 'reset', 'zoomIn'] as const).map((cmd) => (
            <ThemedText
              key={cmd}
              type="small"
              onPress={() => injectCommand(cmd)}
              style={[styles.toolbarBtn, { color: theme.actionIcon }]}>
              {cmd === 'zoomIn' ? '+' : cmd === 'zoomOut' ? '−' : '⌖'}
            </ThemedText>
          ))}
          {!isFullscreen && onExpand && (
            <ThemedText
              type="small"
              onPress={onExpand}
              style={[styles.toolbarBtn, { color: theme.actionIcon }]}>
              ⤢
            </ThemedText>
          )}
        </View>
      )}
      {!libReady && !error && (
        <View style={styles.overlay}>
          <ThemedText type="small" themeColor="textSecondary">
            Loading mind map…
          </ThemedText>
        </View>
      )}
      {error && (
        <View style={styles.overlay}>
          <ThemedText type="small" themeColor="textSecondary">
            {error}
          </ThemedText>
        </View>
      )}
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: MIND_MAP_HTML, baseUrl: MIND_MAP_BASE_URL }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        mixedContentMode="always"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onMessage={handleMessage}
        onLoadEnd={pushData}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  containerInline: {
    width: '100%',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginTop: Spacing.two,
  },
  containerFullscreen: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarBtn: {
    fontSize: 18,
    lineHeight: 26,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    paddingHorizontal: Spacing.three,
  },
});
