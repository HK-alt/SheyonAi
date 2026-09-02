import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ParsedMolecule } from './molecule-parser';
import { buildMoleculeViewerHtml } from './molecule-scene-html';
import { loadMoleculeVendorScripts } from './molecule-vendor';

export type MoleculeViewerVariant = 'inline' | 'fullscreen' | 'immersive';

type MoleculeViewerProps = {
  molecule: ParsedMolecule;
  variant?: MoleculeViewerVariant;
  onEnterImmersive?: () => void;
};

type PreviewSurfaceProps = {
  html: string;
  style?: StyleProp<ViewStyle>;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
};

const INLINE_HEIGHT = Platform.OS === 'web' ? 460 : 400;

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
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.title = 'Chemistry Molecule 3D';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    iframe.style.border = 'none';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.display = 'block';
    iframe.style.background = '#0c1016';

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      onLoadEndRef.current?.();
    };
    iframe.addEventListener('load', finish);
    iframe.addEventListener('error', finish);
    const timeout = window.setTimeout(finish, 12000);
    host.replaceChildren(iframe);

    return () => {
      window.clearTimeout(timeout);
      iframe.removeEventListener('load', finish);
      iframe.removeEventListener('error', finish);
      URL.revokeObjectURL(url);
      if (iframe.parentNode === host) host.removeChild(iframe);
    };
  }, [html]);

  return <View ref={hostRef} style={[styles.webview, style]} />;
}

function NativeWebViewPreview({ html, style, onLoadStart, onLoadEnd }: PreviewSurfaceProps) {
  const handleShouldStartLoad = useCallback((request: WebViewNavigation) => {
    const url = request.url ?? '';
    if (url === 'about:blank' || url.startsWith('data:') || url.startsWith('blob:')) return true;
    if (request.navigationType === 'other' && /^https:\/\//i.test(url)) return true;
    return false;
  }, []);

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html, baseUrl: 'about:blank' }}
      javaScriptEnabled
      domStorageEnabled
      mixedContentMode="always"
      allowsInlineMediaPlayback
      setSupportMultipleWindows={false}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      onLoadStart={onLoadStart}
      onLoadEnd={onLoadEnd}
      onShouldStartLoadWithRequest={handleShouldStartLoad}
      style={[styles.webview, style]}
    />
  );
}

function PreviewSurface(props: PreviewSurfaceProps) {
  if (Platform.OS === 'web') return <WebIframePreview {...props} />;
  return <NativeWebViewPreview {...props} />;
}

export function MoleculeViewer({
  molecule,
  variant = 'inline',
  onEnterImmersive,
}: MoleculeViewerProps) {
  const theme = useTheme();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const isInline = variant === 'inline';
  const sceneKey = `${molecule.moleculeId}:${molecule.title}:${molecule.focus}:${molecule.labels.length}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setHtml(null);
    loadMoleculeVendorScripts()
      .then((vendor) => {
        if (cancelled) return;
        setHtml(buildMoleculeViewerHtml(molecule, vendor));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load the 3D viewer.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [molecule, sceneKey]);

  const containerStyle = isInline
    ? [
        styles.containerInline,
        {
          height: INLINE_HEIGHT,
          backgroundColor: '#0c1016',
          borderColor: theme.composerBorder,
        },
      ]
    : [styles.containerFullscreen, { backgroundColor: '#0c1016' }];

  return (
    <View style={containerStyle}>
      {variant !== 'immersive' ? (
        <View style={[styles.toolbar, { borderBottomColor: 'rgba(255,255,255,0.08)' }]}>
          <ThemedText type="small" style={styles.toolbarLabel}>
            3D molecule
          </ThemedText>
          <Pressable
            onPress={() => {
              setLoading(true);
              setReloadKey((k) => k + 1);
            }}
            hitSlop={6}
            style={styles.toolbarBtn}>
            <ThemedText type="small" style={styles.toolbarAction}>
              Reload
            </ThemedText>
          </Pressable>
          {onEnterImmersive ? (
            <Pressable onPress={onEnterImmersive} hitSlop={6} style={styles.toolbarBtn}>
              <ThemedText type="small" style={styles.toolbarAction}>
                Fullscreen
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.stage}>
        {error ? (
          <View style={styles.overlay}>
            <ThemedText type="small" style={{ color: '#f2c9c9' }}>
              {error}
            </ThemedText>
          </View>
        ) : null}
        {(!html || loading) && !error ? (
          <View style={[styles.overlay, { pointerEvents: 'none' }]}>
            <ThemedText type="small" style={{ color: '#c5d0de' }}>
              Loading 3D molecule…
            </ThemedText>
          </View>
        ) : null}
        {html ? (
          <PreviewSurface
            key={`${reloadKey}-${sceneKey}-${html.length}`}
            html={html}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            style={styles.webview}
          />
        ) : null}
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
    gap: Spacing.two,
    paddingLeft: Spacing.three,
    paddingVertical: Spacing.one + Spacing.half,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarLabel: {
    flex: 1,
    color: '#c5d0de',
    fontWeight: '600',
  },
  toolbarBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  toolbarAction: {
    color: '#fbbf24',
    fontWeight: '600',
  },
  stage: {
    flex: 1,
    minHeight: 200,
    backgroundColor: '#0c1016',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0c1016',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    backgroundColor: 'rgba(12,16,22,0.55)',
  },
});
