/**
 * Native fallback for admin charts.
 * Renders lightweight View-based bar charts / legend lists.
 * Shares the same props interface as AdminChart.web.tsx.
 */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { CHART_COLORS } from './admin-chart-theme';

export interface ChartDataset {
  label: string;
  data: number[];
  color?: string;
}

interface BaseChartProps {
  labels: string[];
  datasets: ChartDataset[];
  height?: number;
  showLegend?: boolean;
  yUnit?: string;
}

function NativeBarFallback({ labels, datasets, height = 180 }: BaseChartProps) {
  const theme = useTheme();
  const firstDataset = datasets[0];
  if (!firstDataset) return null;
  const max = Math.max(...firstDataset.data, 1);
  const color = firstDataset.color ?? CHART_COLORS[0]!;

  return (
    <View style={[fallbackStyles.wrap, { height }]}>
      <View style={fallbackStyles.bars}>
        {firstDataset.data.map((v, i) => (
          <View key={i} style={fallbackStyles.barCol}>
            <View
              style={[
                fallbackStyles.bar,
                {
                  height: Math.max(4, (v / max) * (height - 32)),
                  backgroundColor: color,
                  opacity: 0.4 + 0.6 * (v / max),
                },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={fallbackStyles.axis}>
        <ThemedText style={fallbackStyles.axisLabel}>{labels[0]}</ThemedText>
        <ThemedText style={fallbackStyles.axisLabel} themeColor="textSecondary">
          {firstDataset.label}
        </ThemedText>
        <ThemedText style={fallbackStyles.axisLabel}>{labels[labels.length - 1]}</ThemedText>
      </View>
    </View>
  );
}

const fallbackStyles = StyleSheet.create({
  wrap: { width: '100%' },
  bars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  barCol: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    borderRadius: 2,
    minHeight: 3,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  axisLabel: {
    fontSize: 10,
    color: '#888',
  },
});

// All four exports match the web surface so pages can import identically

export const AdminLineChart = NativeBarFallback;
export const AdminBarChart = NativeBarFallback;
export const AdminHBarChart = NativeBarFallback;

export interface DoughnutDataset {
  label: string;
  value: number;
  color: string;
}

interface DoughnutChartProps {
  segments: DoughnutDataset[];
  height?: number;
  showLegend?: boolean;
  centerLabel?: string;
}

export function AdminDoughnutChart({ segments, showLegend = true }: DoughnutChartProps) {
  const theme = useTheme();
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  return (
    <View style={doughnutStyles.wrap}>
      {segments.map((seg) => {
        const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
        return (
          <View key={seg.label} style={doughnutStyles.row}>
            <View style={doughnutStyles.legend}>
              <View style={[doughnutStyles.dot, { backgroundColor: seg.color }]} />
              <ThemedText style={doughnutStyles.label}>{seg.label}</ThemedText>
            </View>
            <View style={[doughnutStyles.track, { backgroundColor: theme.backgroundElement }]}>
              <View
                style={[
                  doughnutStyles.fill,
                  { width: `${pct}%` as any, backgroundColor: seg.color },
                ]}
              />
            </View>
            <ThemedText style={doughnutStyles.pct} themeColor="textSecondary">
              {pct}%
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const doughnutStyles = StyleSheet.create({
  wrap: { gap: 10, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 90 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { fontSize: 12, fontWeight: '500' },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  pct: { fontSize: 11, width: 36, textAlign: 'right' },
});
