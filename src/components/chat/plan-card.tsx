import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { MarkdownText } from '@/components/chat/markdown-text';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { nativeShadowColor } from '@/lib/native-shadow';
import type { ParsedTutorPlan, TutorPlanSection } from '@/subject/plan-parser';
import type { TutorMode } from '@/types/chat';

const PLAN_ACCENT = '#0F766E';

function tint(hex: string, alpha: number) {
  const raw = hex.replace('#', '');
  const n = parseInt(raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

type PlanCardProps = {
  plan: ParsedTutorPlan;
  leftover?: string;
  interactive?: boolean;
  onAction?: (mode: TutorMode, text: string) => void;
};

function CheckRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.checkRow,
        {
          backgroundColor: checked ? tint(PLAN_ACCENT, 0.1) : theme.background,
          borderColor: checked ? tint(PLAN_ACCENT, 0.35) : theme.composerBorder,
        },
        pressed && styles.pressed,
      ]}>
      <View
        style={[
          styles.box,
          {
            backgroundColor: checked ? PLAN_ACCENT : 'transparent',
            borderColor: checked ? PLAN_ACCENT : theme.composerBorder,
          },
        ]}>
        {checked ? (
          <SymbolView
            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
            size={12}
            weight="bold"
            tintColor="#FFFFFF"
          />
        ) : null}
      </View>
      <ThemedText style={[styles.checkLabel, { color: theme.text }]}>{label}</ThemedText>
    </Pressable>
  );
}

function WeekTable({ rows }: { rows: ParsedTutorPlan['week'] }) {
  const theme = useTheme();
  return (
    <View style={styles.week}>
      {rows.map((row, index) => (
        <View
          key={`${row.day}-${index}`}
          style={[
            styles.weekRow,
            {
              backgroundColor: theme.background,
              borderColor: theme.composerBorder,
            },
          ]}>
          <View style={styles.weekLead}>
            <ThemedText style={[styles.weekDay, { color: PLAN_ACCENT }]}>{row.day}</ThemedText>
            {row.duration ? (
              <ThemedText themeColor="textSecondary" style={styles.weekDuration}>
                {row.duration}
              </ThemedText>
            ) : null}
          </View>
          {row.focus ? (
            <ThemedText style={[styles.weekFocus, { color: theme.text }]}>{row.focus}</ThemedText>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function SectionBody({
  section,
  plan,
  checks,
  onToggle,
}: {
  section: TutorPlanSection;
  plan: ParsedTutorPlan;
  checks: boolean[];
  onToggle: (index: number) => void;
}) {
  if (section.id === 'weekly' && plan.week.length > 0) {
    return <WeekTable rows={plan.week} />;
  }
  if (section.id === 'checkpoints' && plan.checkpoints.length > 0) {
    return (
      <View style={styles.checks}>
        {plan.checkpoints.map((item, index) => (
          <CheckRow
            key={item}
            label={item}
            checked={!!checks[index]}
            onToggle={() => onToggle(index)}
          />
        ))}
      </View>
    );
  }
  return <MarkdownText content={section.body} />;
}

export function PlanCard({ plan, leftover, interactive = false, onAction }: PlanCardProps) {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const [checks, setChecks] = useState<boolean[]>(() => plan.checkpoints.map(() => false));
  const total = plan.sections.length;
  const safeIndex = Math.min(index, Math.max(total - 1, 0));
  const section = plan.sections[safeIndex];
  const done = useMemo(() => checks.filter(Boolean).length, [checks]);
  const checkTotal = plan.checkpoints.length;

  if (!section) return null;

  const atStart = safeIndex <= 0;
  const atEnd = safeIndex >= total - 1;
  const progress =
    checkTotal > 0 ? done / checkTotal : total > 0 ? (safeIndex + 1) / total : 0;

  const toggle = (itemIndex: number) => {
    setChecks((prev) => {
      const next = [...prev];
      next[itemIndex] = !next[itemIndex];
      return next;
    });
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.composerBackground,
          borderColor: Platform.OS === 'web' ? theme.composerBorder : tint(PLAN_ACCENT, 0.32),
          ...nativeShadowColor(theme.composerShadow),
        },
      ]}>
      <View style={styles.header}>
        <View style={[styles.mark, { backgroundColor: tint(PLAN_ACCENT, 0.14) }]}>
          <SymbolView
            name={{ ios: 'calendar', android: 'event', web: 'event' }}
            size={15}
            tintColor={PLAN_ACCENT}
          />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="smallBold" style={[styles.title, { color: theme.text }]}>
            Study plan
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.kicker}>
            {checkTotal > 0 ? `${done} of ${checkTotal} checkpoints` : 'Deep revision plan'}
          </ThemedText>
        </View>
        <View style={[styles.counter, { backgroundColor: tint(PLAN_ACCENT, 0.12) }]}>
          <ThemedText style={[styles.counterText, { color: PLAN_ACCENT }]}>
            {safeIndex + 1} / {total}
          </ThemedText>
        </View>
      </View>

      {leftover ? <MarkdownText content={leftover} /> : null}

      <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
        <View
          style={[
            styles.trackFill,
            { width: `${Math.round(progress * 100)}%`, backgroundColor: PLAN_ACCENT },
          ]}
        />
      </View>

      <View style={styles.pills}>
        {plan.sections.map((item, i) => {
          const active = i === safeIndex;
          return (
            <Pressable
              key={item.id}
              onPress={() => setIndex(i)}
              style={({ pressed }) => [
                styles.pill,
                {
                  backgroundColor: active ? tint(PLAN_ACCENT, 0.16) : theme.backgroundElement,
                  borderColor: active ? PLAN_ACCENT : theme.composerBorder,
                },
                pressed && styles.pressed,
              ]}>
              <ThemedText
                style={[styles.pillLabel, { color: active ? PLAN_ACCENT : theme.textSecondary }]}
                numberOfLines={1}>
                {item.title}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View
        style={[
          styles.body,
          {
            backgroundColor: section.id === 'first' ? tint(PLAN_ACCENT, 0.08) : theme.background,
            borderColor: section.id === 'first' ? tint(PLAN_ACCENT, 0.3) : theme.composerBorder,
          },
        ]}>
        <ThemedText style={[styles.sectionKicker, { color: PLAN_ACCENT }]}>
          {section.title}
        </ThemedText>
        <SectionBody section={section} plan={plan} checks={checks} onToggle={toggle} />
      </View>

      <View style={styles.nav}>
        <Pressable
          disabled={atStart}
          onPress={() => setIndex(safeIndex - 1)}
          accessibilityLabel="Previous section"
          style={({ pressed }) => [
            styles.navButton,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.composerBorder,
            },
            atStart && styles.disabled,
            pressed && !atStart && styles.pressed,
          ]}>
          <ThemedText style={[styles.navLabel, { color: atStart ? theme.textSecondary : theme.text }]}>
            Previous
          </ThemedText>
        </Pressable>
        <Pressable
          disabled={atEnd}
          onPress={() => setIndex(safeIndex + 1)}
          accessibilityLabel="Next section"
          style={({ pressed }) => [
            styles.navButton,
            { backgroundColor: atEnd ? theme.backgroundElement : PLAN_ACCENT },
            atEnd && styles.disabled,
            pressed && !atEnd && styles.pressed,
          ]}>
          <ThemedText style={[styles.navLabel, { color: atEnd ? theme.textSecondary : '#FFFFFF' }]}>
            {atEnd ? 'End' : 'Next'}
          </ThemedText>
        </Pressable>
      </View>

      {interactive && onAction ? (
        <View style={styles.actions}>
          <Pressable
            onPress={() =>
              onAction(
                'plan',
                'I fell behind this week. Rebuild a shorter recovery plan from the current Goal and Diagnosis. Keep the same headings.',
              )
            }
            style={({ pressed }) => [
              styles.action,
              { borderColor: tint(PLAN_ACCENT, 0.35), backgroundColor: tint(PLAN_ACCENT, 0.08) },
              pressed && styles.pressed,
            ]}>
            <ThemedText style={[styles.actionLabel, { color: PLAN_ACCENT }]}>I fell behind</ThemedText>
          </Pressable>
          <Pressable
            onPress={() =>
              onAction(
                'plan',
                'Tighten this plan: fewer hours, keep the highest-leverage topics, and keep the same headings.',
              )
            }
            style={({ pressed }) => [
              styles.action,
              { borderColor: theme.composerBorder, backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <ThemedText style={[styles.actionLabel, { color: theme.text }]}>Fewer hours</ThemedText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  mark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
  },
  kicker: {
    fontSize: 12,
    lineHeight: 16,
  },
  counter: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  counterText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  track: {
    height: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 999,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pillLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  body: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 8,
  },
  sectionKicker: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  week: {
    gap: 8,
  },
  weekRow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.two,
    gap: 4,
  },
  weekLead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  weekDay: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  weekDuration: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  weekFocus: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  checks: {
    gap: 8,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.two,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  nav: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  navButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  action: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.55,
  },
});
