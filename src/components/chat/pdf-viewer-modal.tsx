import { createElement, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PdfViewerModalProps = {
  visible: boolean;
  uri: string | null;
  filename: string;
  onClose: () => void;
};

function googlePdfViewerUrl(uri: string): string {
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(uri)}`;
}

function mozillaPdfViewerUrl(uri: string): string {
  return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(uri)}`;
}

function pdfDisplayUrl(uri: string, mode: 'direct' | 'google' | 'pdfjs'): string {
  if (mode === 'google') return googlePdfViewerUrl(uri);
  if (mode === 'pdfjs') return mozillaPdfViewerUrl(uri);
  return uri;
}

function WebPdfFrame({ src, title, onLoad, onError }: { src: string; title: string; onLoad: () => void; onError: () => void }) {
  return createElement('iframe', {
    src,
    title,
    onLoad,
    onError,
    allow: 'fullscreen',
    style: {
      width: '100%',
      height: '100%',
      border: 'none',
      flex: 1,
      background: 'transparent',
    },
  });
}

async function openExternal(url: string) {
  try {
    await openBrowserAsync(url, {
      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
    });
  } catch {
    await Linking.openURL(url);
  }
}

export function PdfViewerModal({ visible, uri, filename, onClose }: PdfViewerModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mode, setMode] = useState<'direct' | 'google' | 'pdfjs'>(
    Platform.OS === 'android' ? 'google' : 'direct',
  );

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setError(false);
    setMode(Platform.OS === 'android' ? 'google' : 'direct');
  }, [visible, uri]);

  const src = uri ? pdfDisplayUrl(uri, mode) : null;

  const handleError = () => {
    if (!uri) {
      setLoading(false);
      setError(true);
      return;
    }
    if (mode === 'direct') {
      setMode(Platform.OS === 'web' ? 'pdfjs' : 'google');
      setLoading(true);
      setError(false);
      return;
    }
    if (mode === 'pdfjs') {
      setMode('google');
      setLoading(true);
      setError(false);
      return;
    }
    setLoading(false);
    setError(true);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: theme.headerBorder }]}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
            {filename}
          </ThemedText>
          {uri ? (
            <Pressable
              onPress={() => void openExternal(uri)}
              hitSlop={8}
              accessibilityLabel="Open PDF in browser"
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Browser
              </ThemedText>
            </Pressable>
          ) : null}
          <Pressable onPress={onClose} hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Close
            </ThemedText>
          </Pressable>
        </View>

        {!uri ? (
          <View style={styles.centered}>
            <ThemedText themeColor="textSecondary">Loading PDF…</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <ThemedText themeColor="textSecondary" style={styles.errorCopy}>
              Could not display this PDF in the app. Open it in the browser instead.
            </ThemedText>
            <Pressable
              onPress={() => void openExternal(uri)}
              style={({ pressed }) => [
                styles.fallbackButton,
                { backgroundColor: theme.sendButton },
                pressed && styles.pressed,
              ]}>
              <ThemedText style={[styles.fallbackLabel, { color: theme.sendButtonIcon }]}>
                Open in browser
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.webviewWrap}>
            {loading ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color={theme.sendButton} />
              </View>
            ) : null}
            {Platform.OS === 'web' && src ? (
              <WebPdfFrame
                src={src}
                title={filename}
                onLoad={() => setLoading(false)}
                onError={handleError}
              />
            ) : src ? (
              <WebView
                key={`${mode}-${src}`}
                source={{ uri: src }}
                style={styles.webview}
                onLoadStart={() => {
                  setLoading(true);
                }}
                onLoadEnd={() => setLoading(false)}
                onError={handleError}
                onHttpError={handleError}
                originWhitelist={['*']}
                allowFileAccess
                allowFileAccessFromFileURLs={Platform.OS === 'ios'}
                allowingReadAccessToURL={Platform.OS === 'ios' ? uri : undefined}
              />
            ) : null}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    flex: 1,
  },
  webviewWrap: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  errorCopy: {
    textAlign: 'center',
    maxWidth: 360,
  },
  fallbackButton: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  fallbackLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
