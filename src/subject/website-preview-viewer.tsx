import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type WebsitePreviewVariant = 'inline' | 'fullscreen' | 'immersive';

type WebsitePreviewViewerProps = {
  htmlDocument: string;
  variant?: WebsitePreviewVariant;
  /** Opens device-immersive modal (fullscreen panel only). */
  onEnterImmersive?: () => void;
};

const INLINE_HEIGHT = Platform.OS === 'web' ? 420 : 380;

/** Keep wide/tall generated pages scrollable inside the preview frame. */
function ensurePreviewScrollableHtml(html: string): string {
  const inject = `<style data-sheyonai-preview-fit>
html { height: 100%; }
body {
  margin: 0;
  min-height: 100%;
  overflow: auto !important;
  -webkit-overflow-scrolling: touch;
}
svg:not(.leaflet-zoom-animated):not(.leaflet-marker-icon),
canvas:not(.leaflet-zoom-animated),
img:not(.leaflet-marker-icon):not(.leaflet-tile),
video {
  max-width: 100%;
  height: auto;
}
.stage, .diagram, .figure, main, .wrap, .container {
  max-width: 100%;
  overflow-x: auto;
}
#map, .leaflet-container {
  width: 100% !important;
  min-height: 520px;
  height: 70vh;
  max-width: none !important;
  z-index: 1;
}
.leaflet-tile-pane img.leaflet-tile {
  max-width: none !important;
  height: auto !important;
}
</style>`;
  if (/data-sheyonai-preview-fit/.test(html)) return html;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${inject}</head>`);
  if (/<html[\s>]/i.test(html)) {
    return html.replace(/<html([^>]*)>/i, `<html$1><head>${inject}</head>`);
  }
  return `<!DOCTYPE html><html><head>${inject}</head><body>${html}</body></html>`;
}

function previewNeedsHttpsBase(html: string): boolean {
  return /leaflet|unpkg\.com|openstreetmap|nominatim|arcgisonline|tile\.|cdnjs\.cloudflare|jsdelivr/i.test(
    html,
  );
}

function previewHttpsBaseUrl(html: string): string {
  if (/cdn\.jsdelivr\.net/i.test(html)) return 'https://cdn.jsdelivr.net/';
  if (/cdnjs\.cloudflare/i.test(html)) return 'https://cdnjs.cloudflare.com/';
  return 'https://unpkg.com/';
}

type PreviewSurfaceProps = {
  html: string;
  style?: StyleProp<ViewStyle>;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
};

/** Sandboxed iframe: react-native-webview is a stub on Expo web. */
function WebIframePreview({ html, style, onLoadStart, onLoadEnd }: PreviewSurfaceProps) {
  const hostRef = useRef<View>(null);
  const onLoadStartRef = useRef(onLoadStart);
  const onLoadEndRef = useRef(onLoadEnd);
  onLoadStartRef.current = onLoadStart;
  onLoadEndRef.current = onLoadEnd;

  useEffect(() => {
    const host = hostRef.current as unknown as HTMLElement | null;
    if (!host || typeof document === 'undefined') return;

    onLoadStartRef.current?.();

    const iframe = document.createElement('iframe');
    iframe.title = 'Coding preview';
    iframe.setAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-downloads',
    );
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    iframe.style.border = 'none';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.display = 'block';
    iframe.style.background = '#fff';
    iframe.setAttribute('scrolling', 'yes');

    // CDN scripts (D3, Leaflet, etc.) often fail inside blob: iframes on web.
    // Prefer srcdoc so Tools tree viz / science graphs load the same as on native.
    let objectUrl: string | null = null;
    if (previewNeedsHttpsBase(html) || /<script[\s>]/i.test(html)) {
      iframe.srcdoc = html;
    } else {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      objectUrl = URL.createObjectURL(blob);
      iframe.src = objectUrl;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      onLoadEndRef.current?.();
    };

    iframe.addEventListener('load', finish);
    iframe.addEventListener('error', finish);
    const timeout = window.setTimeout(finish, 8000);

    host.replaceChildren(iframe);

    return () => {
      window.clearTimeout(timeout);
      iframe.removeEventListener('load', finish);
      iframe.removeEventListener('error', finish);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (iframe.parentNode === host) {
        host.removeChild(iframe);
      }
    };
  }, [html]);

  return <View ref={hostRef} style={[styles.webview, style]} />;
}

function NativeWebViewPreview({ html, style, onLoadStart, onLoadEnd }: PreviewSurfaceProps) {
  const handleShouldStartLoad = useCallback((request: WebViewNavigation) => {
    const url = request.url ?? '';
    if (url === 'about:blank' || url.startsWith('data:') || url.startsWith('blob:')) return true;
    // Allow script/CDN/tile loads used by generated previews; block top-level navigation.
    if (request.navigationType === 'other' && /^https:\/\//i.test(url)) return true;
    return false;
  }, []);

  const baseUrl = previewNeedsHttpsBase(html) ? previewHttpsBaseUrl(html) : 'about:blank';

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html, baseUrl }}
      javaScriptEnabled
      domStorageEnabled
      mixedContentMode="always"
      allowsInlineMediaPlayback
      setSupportMultipleWindows={false}
      allowsBackForwardNavigationGestures={false}
      overScrollMode="never"
      nestedScrollEnabled
      showsHorizontalScrollIndicator
      showsVerticalScrollIndicator
      onLoadStart={onLoadStart}
      onLoadEnd={onLoadEnd}
      onShouldStartLoadWithRequest={handleShouldStartLoad}
      style={[styles.webview, style]}
    />
  );
}

function PreviewSurface(props: PreviewSurfaceProps) {
  if (Platform.OS === 'web') {
    return <WebIframePreview {...props} />;
  }
  return <NativeWebViewPreview {...props} />;
}

function ToolbarButton({
  label,
  active,
  onPress,
  accent,
  muted,
  border,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  accent: string;
  muted: string;
  border: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={[
        styles.toolbarBtn,
        {
          backgroundColor: active ? `${accent}22` : 'transparent',
          borderColor: active ? accent : border,
          borderWidth: StyleSheet.hairlineWidth,
        },
      ]}>
      <ThemedText
        type="small"
        style={{ color: active ? accent : muted, fontWeight: active ? '700' : '600' }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function WebsitePreviewViewer({
  htmlDocument,
  variant = 'inline',
  onEnterImmersive,
}: WebsitePreviewViewerProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const isInline = variant === 'inline';
  const displayHtml = ensurePreviewScrollableHtml(htmlDocument);

  useEffect(() => {
    setReloadKey((k) => k + 1);
    setLoading(true);
  }, [htmlDocument]);

  const containerStyle = isInline
    ? [
        styles.containerInline,
        {
          height: INLINE_HEIGHT,
          backgroundColor: theme.background,
          borderColor: theme.composerBorder,
        },
      ]
    : [styles.containerFullscreen, { backgroundColor: theme.background }];

  return (
    <View style={containerStyle}>
      {onEnterImmersive ? (
        <View
          style={[
            styles.toolbar,
            { backgroundColor: theme.backgroundElement, borderBottomColor: theme.composerBorder },
          ]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.toolbarActions}>
            <ToolbarButton
              label="Fullscreen"
              onPress={onEnterImmersive}
              accent={theme.accent}
              muted={theme.textSecondary}
              border={theme.composerBorder}
            />
          </ScrollView>
        </View>
      ) : null}

      <View style={[styles.previewFrame, { backgroundColor: theme.chatSurface }]}>
        <View style={styles.previewStage}>
          <View style={styles.previewViewport}>
            {loading && (
              <View style={styles.overlay}>
                <ThemedText type="small" themeColor="textSecondary">
                  Loading preview…
                </ThemedText>
              </View>
            )}
            <PreviewSurface
              key={`${reloadKey}-${displayHtml.length}`}
              html={displayHtml}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              style={styles.webview}
            />
          </View>
        </View>
      </View>
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
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    paddingLeft: Spacing.three,
    paddingVertical: Spacing.one + Spacing.half,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingRight: Spacing.two,
    marginLeft: 'auto',
  },
  toolbarBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  previewFrame: {
    flex: 1,
    padding: Spacing.two,
  },
  previewStage: {
    flex: 1,
    width: '100%',
  },
  previewViewport: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fff',
    minHeight: 280,
    overflow: 'auto',
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
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});
