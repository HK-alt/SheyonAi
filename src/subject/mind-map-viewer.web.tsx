import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useThemePreference } from '@/context/theme-preference-context';
import { useTheme } from '@/hooks/use-theme';
import { MIND_MAP_HTML } from '@/subject/mind-map-html';
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

const INLINE_HEIGHT = 420;

type MindMapFrameWindow = Window & {
  __initMindMap?: (raw: string, scheme: string) => void;
  __mindMapCommand?: (cmd: string) => void;
  __mindMapApplyTheme?: (scheme: string) => void;
};

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
  const containerRef = useRef<View>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);
  const [libReady, setLibReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFullscreen = variant === 'fullscreen';
  const showToolbarFinal = showToolbar ?? !isFullscreen;

  const serializedData = useMemo(() => JSON.stringify(data), [data]);

  const getFrameWindow = useCallback((): MindMapFrameWindow | null => {
    return iframeRef.current?.contentWindow as MindMapFrameWindow | null;
  }, []);

  const postToFrame = useCallback(
    (payload: string) => {
      getFrameWindow()?.postMessage(payload, '*');
    },
    [getFrameWindow],
  );

  const injectCommand = useCallback(
    (cmd: 'zoomIn' | 'zoomOut' | 'reset') => {
      postToFrame(JSON.stringify({ type: 'command', command: cmd }));
      getFrameWindow()?.__mindMapCommand?.(cmd);
    },
    [getFrameWindow, postToFrame],
  );

  if (viewerRef) {
    viewerRef.current = { sendCommand: injectCommand };
  }

  const pushData = useCallback(() => {
    if (!readyRef.current) return;
    postToFrame(
      JSON.stringify({ type: 'init', data: JSON.parse(serializedData), theme: resolvedScheme }),
    );
    getFrameWindow()?.__initMindMap?.(serializedData, resolvedScheme);
  }, [getFrameWindow, postToFrame, resolvedScheme, serializedData]);

  useEffect(() => {
    pushData();
  }, [pushData]);

  useEffect(() => {
    if (!readyRef.current) return;
    postToFrame(JSON.stringify({ type: 'setTheme', theme: resolvedScheme }));
    getFrameWindow()?.__mindMapApplyTheme?.(resolvedScheme);
  }, [getFrameWindow, postToFrame, resolvedScheme]);

  const handleWindowMessage = useCallback(
    (event: MessageEvent) => {
      if (event.source !== getFrameWindow()) return;

      try {
        const payload = JSON.parse(String(event.data)) as {
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
        // Ignore non-JSON messages from the iframe shell.
      }
    },
    [getFrameWindow, onNodeSelect, pushData],
  );

  useEffect(() => {
    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [handleWindowMessage]);

  useEffect(() => {
    const host = containerRef.current as unknown as HTMLElement | null;
    if (!host) return;

    readyRef.current = false;
    setLibReady(false);

    const iframe = document.createElement('iframe');
    iframe.srcdoc = MIND_MAP_HTML;
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    iframe.setAttribute('title', 'Mind map');
    iframe.style.border = 'none';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.background = 'transparent';

    iframeRef.current = iframe;
    host.appendChild(iframe);

    return () => {
      iframeRef.current = null;
      host.removeChild(iframe);
    };
  }, []);

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
        <View
          style={[
            styles.toolbar,
            { backgroundColor: theme.backgroundElement, borderBottomColor: theme.composerBorder },
          ]}>
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
      <View ref={containerRef} style={styles.webview} />
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
