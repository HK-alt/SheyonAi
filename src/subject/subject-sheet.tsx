import { useRouter } from 'expo-router';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getSubjectAccentColor, getSubjectChipIcon, getSubjectConfig } from '@/subject/config';
import { SUBJECTS } from '@/subject/subjects';
import type { SubjectChipsMode } from '@/subject/types';
import type { Subject } from '@/subject/subjects';

type SubjectSheetProps = {
  visible: boolean;
  mode: SubjectChipsMode;
  activeSubject?: Subject | null;
  onClose: () => void;
};

function tint(hex: string, alpha: number) {
  const raw = hex.replace('#', '');
  const n = parseInt(raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw, 16);
  if (Number.isNaN(n)) return hex;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function SubjectSheet({ visible, mode, activeSubject, onClose }: SubjectSheetProps) {
  const theme = useTheme();
  const router = useRouter();

  const handleSelect = (subjectId: Subject) => {
    const href = { pathname: '/subject/[id]', params: { id: subjectId } } as const;
    onClose();
    if (mode === 'launcher') {
      router.push(href);
      return;
    }
    if (subjectId !== activeSubject) {
      router.replace(href);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, Platform.OS === 'web' && styles.backdropWeb]}
        onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            Platform.OS === 'web' && styles.sheetWeb,
            { backgroundColor: theme.background },
          ]}
          onPress={(event) => event.stopPropagation()}>
          {Platform.OS === 'web' ? null : <View style={styles.handle} />}
          <ThemedText type="smallBold" style={styles.title}>
            Choose a subject
          </ThemedText>
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.grid}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {SUBJECTS.map((subject) => {
              const isActive = mode === 'workspace' && activeSubject === subject.id;
              const hint = getSubjectConfig(subject.id)?.modeHint;
              const accent = getSubjectAccentColor(subject.id) ?? theme.accent;
              const icon = getSubjectChipIcon(subject.id);
              return (
                <Pressable
                  key={subject.id}
                  onPress={() => handleSelect(subject.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.card,
                    Platform.OS === 'web' && styles.cardWeb,
                    {
                      backgroundColor: isActive ? tint(accent, 0.12) : theme.backgroundElement,
                      borderColor: isActive ? accent : hovered && Platform.OS === 'web' ? theme.textSecondary : theme.composerBorder,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <View style={[styles.iconWell, { backgroundColor: tint(accent, 0.16) }]}>
                    <SymbolView name={icon} size={20} tintColor={accent} weight="medium" />
                  </View>
                  <ThemedText
                    style={[styles.cardLabel, { color: isActive ? accent : theme.text }]}
                    numberOfLines={1}>
                    {subject.label}
                  </ThemedText>
                  {hint ? (
                    <ThemedText
                      type="small"
                      numberOfLines={2}
                      style={[styles.cardHint, { color: theme.textSecondary }]}>
                      {hint}
                    </ThemedText>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
            <ThemedText themeColor="textSecondary">Cancel</ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    padding: Spacing.three,
  },
  backdropWeb: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 25, 21, 0.35)',
    padding: Spacing.four,
  },
  sheet: {
    borderRadius: 22,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
    maxHeight: '80%',
  },
  sheetWeb: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '78%',
    borderRadius: 18,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    ...Platform.select({
      web: {
        boxShadow: '0 24px 64px rgba(26, 25, 21, 0.18)',
      },
    }),
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(120,120,128,0.28)',
    marginBottom: 4,
  },
  title: {
    marginBottom: Spacing.one,
    letterSpacing: 0.2,
  },
  list: {
    flexGrow: 0,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingBottom: Spacing.one,
  },
  card: {
    width: '47%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 8,
  },
  cardWeb: {
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  cardHint: {
    fontSize: 11,
    lineHeight: 15,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.72,
  },
});
