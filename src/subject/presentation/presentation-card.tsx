import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ParsedPresentation } from './presentation-parser';
import { PresentationFullscreenModal } from './presentation-fullscreen-modal';
import { PresentationSlideView } from './presentation-slide-view';
import { resolveTheme } from './presentation-theme';
import { exportPresentation } from './presentation-export';

type PresentationCardProps = {
  deck: ParsedPresentation;
};

export function PresentationCard({ deck }: PresentationCardProps) {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const compact = windowWidth < 520;
  const [index, setIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const slideTokens = resolveTheme(deck.theme);
  const ACCENT = slideTokens.colorAccent;
  const NAVY = slideTokens.colorPrimary;

  const total = deck.slides.length;
  const safeIndex = Math.min(index, Math.max(total - 1, 0));
  const slide = deck.slides[safeIndex];

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [total]);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportPresentation(deck);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed. Please try again.';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Export failed', msg);
      }
    } finally {
      setExporting(false);
    }
  }, [deck, exporting]);

  if (!slide) return null;

  return (
    <View style={[styles.wrap, { borderColor: theme.composerBorder, backgroundColor: theme.backgroundElement }]}>
      <View style={[styles.topBar, { backgroundColor: NAVY }]}>
        <ThemedText style={styles.deckTitle} numberOfLines={1}>
          {deck.title}
        </ThemedText>
        {compact ? null : (
          <View style={[styles.themeChip, { backgroundColor: ACCENT }]}>
            <ThemedText style={styles.themeChipLabel}>{slideTokens.label}</ThemedText>
          </View>
        )}
        <Pressable
          onPress={() => setPreviewOpen(true)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Open slide preview"
          style={({ pressed }) => [styles.previewChip, pressed && styles.pressed]}>
          <SymbolView
            name={{ ios: 'arrow.up.left.and.arrow.down.right', android: 'open_in_full', web: 'open_in_full' }}
            size={12}
            tintColor="#FFFFFF"
            weight="medium"
          />
          {compact ? null : <ThemedText style={styles.previewChipLabel}>Preview</ThemedText>}
        </Pressable>
        <ThemedText style={styles.counter}>
          {safeIndex + 1} / {total}
        </ThemedText>
      </View>

      {/* Tap the slide stage to open fullscreen preview */}
      <Pressable
        onPress={() => setPreviewOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Open fullscreen slide preview">
        <PresentationSlideView
          slide={slide}
          pageNum={safeIndex + 1}
          total={total}
          variant="card"
          tokens={slideTokens}
        />
      </Pressable>

      <View style={[styles.nav, { borderTopColor: theme.composerBorder }]}>
        <Pressable
          onPress={prev}
          disabled={safeIndex === 0}
          style={({ pressed }) => [styles.navBtn, pressed && styles.pressed, safeIndex === 0 && styles.disabled]}
          accessibilityLabel="Previous slide"
          accessibilityRole="button">
          <SymbolView
            name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
            size={18}
            tintColor={safeIndex === 0 ? '#9CA3AF' : NAVY}
            weight="medium"
          />
        </Pressable>

        <Pressable
          onPress={() => setShowNotes((v) => !v)}
          disabled={!slide.notes}
          style={({ pressed }) => [
            styles.notesBtn,
            pressed && styles.pressed,
            { borderColor: showNotes ? ACCENT : theme.composerBorder },
          ]}
          accessibilityLabel={showNotes ? 'Hide speaker notes' : 'Show speaker notes'}
          accessibilityRole="button">
          <SymbolView
            name={{ ios: 'note.text', android: 'sticky_note_2', web: 'sticky_note_2' }}
            size={14}
            tintColor={showNotes ? ACCENT : theme.textSecondary ?? '#6B6B76'}
            weight="medium"
          />
          {compact ? null : (
            <ThemedText
              style={[styles.notesBtnLabel, { color: showNotes ? ACCENT : theme.textSecondary ?? '#6B6B76' }]}>
              Notes
            </ThemedText>
          )}
        </Pressable>

        <Pressable
          onPress={() => setPreviewOpen(true)}
          style={({ pressed }) => [styles.previewBtn, pressed && styles.pressed, { borderColor: NAVY }]}
          accessibilityLabel="Open slide preview"
          accessibilityRole="button">
          <SymbolView
            name={{ ios: 'play.rectangle.fill', android: 'slideshow', web: 'slideshow' }}
            size={14}
            tintColor={NAVY}
            weight="medium"
          />
          {compact ? null : <ThemedText style={[styles.previewBtnLabel, { color: NAVY }]}>Present</ThemedText>}
        </Pressable>

        <Pressable
          onPress={handleExport}
          disabled={exporting}
          style={({ pressed }) => [
            styles.exportBtn,
            pressed && styles.pressed,
            { backgroundColor: exporting ? '#9CA3AF' : ACCENT },
          ]}
          accessibilityLabel="Download PowerPoint"
          accessibilityRole="button">
          <SymbolView
            name={{ ios: 'arrow.down.doc.fill', android: 'download', web: 'download' }}
            size={16}
            tintColor="#FFFFFF"
            weight="medium"
          />
          <ThemedText style={styles.exportBtnLabel}>
            {exporting ? '…' : compact ? 'PPTX' : '.pptx'}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={next}
          disabled={safeIndex === total - 1}
          style={({ pressed }) => [
            styles.navBtn,
            pressed && styles.pressed,
            safeIndex === total - 1 && styles.disabled,
          ]}
          accessibilityLabel="Next slide"
          accessibilityRole="button">
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={18}
            tintColor={safeIndex === total - 1 ? '#9CA3AF' : NAVY}
            weight="medium"
          />
        </Pressable>
      </View>

      {showNotes && slide.notes ? (
        <View
          style={[
            styles.notesPanel,
            { borderTopColor: theme.composerBorder, backgroundColor: theme.chatSurface ?? '#F7F7F8' },
          ]}>
          <ThemedText style={[styles.notesLabel, { color: ACCENT }]}>Speaker notes</ThemedText>
          <ThemedText style={[styles.notesText, { color: slideTokens.colorTextSecondary }]}>
            {slide.notes}
          </ThemedText>
        </View>
      ) : null}

      <PresentationFullscreenModal
        visible={previewOpen}
        deck={deck}
        initialIndex={safeIndex}
        onClose={() => setPreviewOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginVertical: Spacing.two,
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: '100%',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  deckTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  themeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  themeChipLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  previewChipLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  counter: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 5,
  },
  navBtn: {
    padding: 6,
    borderRadius: 8,
  },
  notesBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  notesBtnLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  previewBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  exportBtnLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
  notesPanel: {
    padding: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
