import { memo, useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

type KatexWebViewProps = {
  source: string;
  minHeight: number;
  displayMode?: boolean;
};

const MAX_HEIGHT = 800;
const MIN_INLINE_WIDTH = 32;
const HEIGHT_PADDING = 16;
const WIDTH_PADDING = 8;
const VIEWPORT_SLOP = 8;

const SIZE_SCRIPT = `
  (function() {
    const post = (width, height) => {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'size',
          width: width,
          height: height
        }));
      }
    };

    const measure = () => {
      const el = document.getElementById('container') || document.querySelector('.katex');
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const height = Math.ceil(Math.max(el.scrollHeight || 0, rect.height) + ${HEIGHT_PADDING});
      const width = Math.ceil(Math.max(el.scrollWidth || 0, rect.width) + ${WIDTH_PADDING});
      const viewport = window.innerHeight || 0;
      if (viewport > 0 && Math.abs(height - viewport) <= ${VIEWPORT_SLOP}) return;
      post(width, height);
    };

    const run = () => {
      measure();
      setTimeout(measure, 50);
      setTimeout(measure, 200);
    };

    if (document.readyState === 'complete') run();
    else document.addEventListener('DOMContentLoaded', run);
    window.addEventListener('load', run);
  })();
  true;
`;

export const KatexWebView = memo(function KatexWebView({
  source,
  minHeight,
  displayMode = false,
}: KatexWebViewProps) {
  const [height, setHeight] = useState(minHeight);
  const [inlineWidth, setInlineWidth] = useState(MIN_INLINE_WIDTH);

  useEffect(() => {
    setHeight(minHeight);
    setInlineWidth(MIN_INLINE_WIDTH);
  }, [source, minHeight]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data) as {
          type?: string;
          width?: number;
          height?: number;
        };
        if (data.type !== 'size') return;
        if (typeof data.height === 'number' && Number.isFinite(data.height)) {
          const nextHeight = Math.min(MAX_HEIGHT, Math.max(minHeight, data.height));
          setHeight((prev) => (Math.abs(prev - nextHeight) > 1 ? nextHeight : prev));
        }
        if (!displayMode && typeof data.width === 'number' && Number.isFinite(data.width)) {
          const nextWidth = Math.max(MIN_INLINE_WIDTH, data.width);
          setInlineWidth((prev) => (Math.abs(prev - nextWidth) > 1 ? nextWidth : prev));
        }
      } catch {
        // Ignore non-JSON messages from the WebView shell.
      }
    },
    [minHeight, displayMode],
  );

  return (
    <View
      style={[
        displayMode ? styles.containerDisplay : styles.containerInline,
        { height },
        displayMode ? styles.fullWidth : { width: inlineWidth, maxWidth: '100%' },
      ]}>
      <WebView
        source={{ html: source }}
        originWhitelist={['*']}
        javaScriptEnabled
        scrollEnabled={displayMode}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={displayMode}
        nestedScrollEnabled={displayMode}
        injectedJavaScript={SIZE_SCRIPT}
        onMessage={handleMessage}
        androidLayerType={Platform.OS === 'android' ? 'software' : undefined}
        style={[
          displayMode ? styles.webviewBlock : styles.webviewInline,
          Platform.OS === 'android' && styles.androidTransparent,
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  containerDisplay: {
    overflow: 'visible',
    backgroundColor: 'transparent',
  },
  containerInline: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  fullWidth: {
    width: '100%',
  },
  webviewBlock: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  webviewInline: {
    backgroundColor: 'transparent',
    width: '100%',
    height: '100%',
  },
  androidTransparent: {
    backgroundColor: 'transparent',
    opacity: 0.99,
  },
});
