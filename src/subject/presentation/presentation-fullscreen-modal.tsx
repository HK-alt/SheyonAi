import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ParsedPresentation } from './presentation-parser';
import { PresentationSlideView } from './presentation-slide-view';
import { resolveTheme } from './presentation-theme';
import { exportPresentation } from './presentation-export';

type PresentationFullscreenModalProps = {
  visible: boolean;
  deck: ParsedPresentation;
  initialIndex?: number;
  onClose: () => void;
};

const SLIDE_RATIO = 16 / 9;

export function PresentationFullscreenModal({
  visible,
  deck,
  initialIndex = 0,
  onClose,
}: PresentationFullscreenModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);
  const [showNotes, setShowNotes] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [stageBox, setStageBox] = useState({ w: 0, h: 0 });
  const slideTokens = resolveTheme(deck.theme);
  const ACCENT = slideTokens.colorAccent;
  const compact = windowWidth < 700;

  useEffect(() => {
    if (visible) {
      setIndex(Math.min(Math.max(initialIndex, 0), Math.max(deck.slides.length - 1, 0)));
      setShowNotes(false);
    }
  }, [visible, initialIndex, deck.slides.length]);

  const total = deck.slides.length;
  const safeIndex = Math.min(index, Math.max(total - 1, 0));
  const slide = deck.slides[safeIndex];

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [total]);

  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        next();
      } else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, prev, next, onClose]);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportPresentation(deck);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed. Please try again.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Export failed', msg);
    } finally {
      setExporting(false);
    }
  }, [deck, exporting]);

  if (!slide) return null;

  // Fit 16:9 inside the measured stage area (letterbox). Prefer layout
  // measurement; fall back to window so the first paint is already sized.
  const pad = 8;
  const availW = Math.max((stageBox.w > 0 ? stageBox.w : windowWidth) - pad * 2, 120);
  const availH = Math.max(stageBox.h > 0 ? stageBox.h : windowHeight * 0.5, 120);
  // Constrain by both axes so mobile portrait never crops the slide.
  const byWidth = { w: availW, h: availW / SLIDE_RATIO };
  const byHeight = { w: availH * SLIDE_RATIO, h: availH };
  const fit = byWidth.h <= availH ? byWidth : byHeight;
  const stageWidth = Math.max(1, fit.w);
  const stageHeight = Math.max(1, fit.h);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      {visible ? <StatusBar hidden animated /> : null}
      <View
        style={[
          styles.root,
          {
            backgroundColor: '#0B1220',
            paddingTop: Math.max(insets.top, compact ? 4 : 0),
            paddingBottom: Math.max(insets.bottom, compact ? 6 : Spacing.two),
          },
        ]}>
        <View style={[styles.header, compact && styles.headerCompact, { borderBottomColor: 'rgba(255,255,255,0.08)' }]}>
          <View style={styles.headerText}>
            <ThemedText style={[styles.deckTitle, compact && styles.deckTitleCompact]} numberOfLines={1}>
              {deck.title}
            </ThemedText>
            <ThemedText style={styles.counter}>
              {safeIndex + 1} / {total}
            </ThemedText>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close slide preview"
            style={({ pressed }) => [styles.doneBtn, pressed && styles.pressed]}>
            <ThemedText style={styles.doneLabel}>Done</ThemedText>
          </Pressable>
        </View>

        <View
          style={styles.stageWrap}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (Math.abs(width - stageBox.w) > 1 || Math.abs(height - stageBox.h) > 1) {
              setStageBox({ w: width, h: height });
            }
          }}>
          <View
            style={{
              width: stageWidth,
              height: stageHeight,
              maxWidth: '100%',
              maxHeight: '100%',
              overflow: 'hidden',
              borderRadius: compact ? 6 : 8,
            }}>
            <Pressable
              onPress={next}
              disabled={safeIndex >= total - 1}
              style={{ width: stageWidth, height: stageHeight }}
              accessibilityRole="button"
              accessibilityLabel="Next slide">
              <PresentationSlideView
                slide={slide}
                pageNum={safeIndex + 1}
                total={total}
                variant="immersive"
                tokens={slideTokens}
                stageWidth={stageWidth}
                stageHeight={stageHeight}
              />
            </Pressable>
          </View>
        </View>

        <View style={[styles.controls, compact && styles.controlsCompact]}>
          <Pressable
            onPress={prev}
            disabled={safeIndex === 0}
            style={({ pressed }) => [
              styles.navBtn,
              compact && styles.navBtnCompact,
              pressed && styles.pressed,
              safeIndex === 0 && styles.disabled,
            ]}
            accessibilityLabel="Previous slide"
            accessibilityRole="button">
            <SymbolView
              name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
              size={compact ? 20 : 22}
              tintColor={safeIndex === 0 ? '#64748B' : '#FFFFFF'}
              weight="medium"
            />
          </Pressable>

          <Pressable
            onPress={() => setShowNotes((v) => !v)}
            disabled={!slide.notes}
            style={({ pressed }) => [
              compact ? styles.iconBtn : styles.notesBtn,
              pressed && styles.pressed,
              { borderColor: showNotes ? ACCENT : 'rgba(255,255,255,0.2)' },
            ]}
            accessibilityRole="button"
            accessibilityLabel={showNotes ? 'Hide speaker notes' : 'Show speaker notes'}>
            <SymbolView
              name={{ ios: 'note.text', android: 'sticky_note_2', web: 'sticky_note_2' }}
              size={14}
              tintColor={showNotes ? ACCENT : '#CBD5E1'}
              weight="medium"
            />
            {compact ? null : (
              <ThemedText style={[styles.notesBtnLabel, { color: showNotes ? ACCENT : '#CBD5E1' }]}>
                Notes
              </ThemedText>
            )}
          </Pressable>

          <Pressable
            onPress={handleExport}
            disabled={exporting}
            style={({ pressed }) => [
              compact ? styles.exportBtnCompact : styles.exportBtn,
              pressed && styles.pressed,
              { backgroundColor: exporting ? '#64748B' : ACCENT },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Download PowerPoint">
            <SymbolView
              name={{ ios: 'arrow.down.doc.fill', android: 'download', web: 'download' }}
              size={16}
              tintColor="#FFFFFF"
              weight="medium"
            />
            <ThemedText style={styles.exportBtnLabel}>
              {exporting ? '…' : compact ? 'PPTX' : 'Download .pptx'}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={next}
            disabled={safeIndex === total - 1}
            style={({ pressed }) => [
              styles.navBtn,
              compact && styles.navBtnCompact,
              pressed && styles.pressed,
              safeIndex === total - 1 && styles.disabled,
            ]}
            accessibilityLabel="Next slide"
            accessibilityRole="button">
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              size={compact ? 20 : 22}
              tintColor={safeIndex === total - 1 ? '#64748B' : '#FFFFFF'}
              weight="medium"
            />
          </Pressable>
        </View>

        {showNotes && slide.notes ? (
          <View style={[styles.notesPanel, compact && styles.notesPanelCompact, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={[styles.notesLabel, { color: ACCENT }]}>Speaker notes</ThemedText>
            <ThemedText
              style={[styles.notesText, compact && styles.notesTextCompact, { color: theme.textSecondary }]}
              numberOfLines={compact ? 4 : 8}>
              {slide.notes}
            </ThemedText>
          </View>
        ) : compact ? null : (
          <ThemedText style={styles.hint}>
            {Platform.OS === 'web' ? '← → to navigate · Esc to close · click slide to advance' : 'Tap slide to advance'}
          </ThemedText>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
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
    flexShrink: 0,
  },
  headerCompact: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  deckTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  deckTitleCompact: {
    fontSize: 13,
  },
  counter: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginTop: 2,
  },
  doneBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  doneLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  stageWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 0,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    gap: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexShrink: 0,
  },
  controlsCompact: {
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  navBtn: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  navBtnCompact: {
    padding: 8,
  },
  notesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  exportBtnCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  notesBtnLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  exportBtnLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.35 },
  notesPanel: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    borderRadius: 12,
    padding: 14,
    flexShrink: 0,
  },
  notesPanelCompact: {
    marginHorizontal: 10,
    marginBottom: 6,
    padding: 10,
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  notesTextCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  hint: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    paddingBottom: Spacing.two,
    flexShrink: 0,
  },
});
