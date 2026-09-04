/**
 * Web chart wrappers using react-chartjs-2.
 * Registers all necessary Chart.js components once and exposes
 * AdminLineChart, AdminBarChart, AdminDoughnutChart, AdminHBarChart.
 */
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  ArcElement,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

import { useTheme } from '@/hooks/use-theme';
import { buildChartTheme, CHART_COLORS } from './admin-chart-theme';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
);

// ── Shared types ────────────────────────────────────────────────────────────

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
  yUnit?: string; // appended in tooltip, e.g. "K tokens"
}

// ── Line chart ───────────────────────────────────────────────────────────────

export function AdminLineChart({
  labels,
  datasets,
  height = 240,
  showLegend = false,
}: BaseChartProps) {
  const theme = useTheme();
  const { scales, plugins, fontFamily } = buildChartTheme(theme as any);

  const data = useMemo(
    () => ({
      labels,
      datasets: datasets.map((ds, i) => {
        const color = ds.color ?? CHART_COLORS[i % CHART_COLORS.length]!;
        return {
          label: ds.label,
          data: ds.data,
          borderColor: color,
          backgroundColor: color + '1A',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
        };
      }),
    }),
    [labels, datasets],
  );

  return (
    <View style={[chartStyles.container, { height }]}>
      <Line
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            ...plugins,
            legend: showLegend ? plugins.legend : { display: false },
          },
          scales,
          interaction: { mode: 'index', intersect: false },
        }}
      />
    </View>
  );
}

// ── Bar chart ────────────────────────────────────────────────────────────────

export function AdminBarChart({
  labels,
  datasets,
  height = 240,
  showLegend = false,
  yUnit,
}: BaseChartProps) {
  const theme = useTheme();
  const { scales, plugins, fontFamily } = buildChartTheme(theme as any);

  const data = useMemo(
    () => ({
      labels,
      datasets: datasets.map((ds, i) => {
        const color = ds.color ?? CHART_COLORS[i % CHART_COLORS.length]!;
        return {
          label: ds.label,
          data: ds.data,
          backgroundColor: color + 'CC',
          hoverBackgroundColor: color,
          borderRadius: 4,
          borderSkipped: false,
        };
      }),
    }),
    [labels, datasets],
  );

  const tooltipPlugin = yUnit
    ? {
        ...plugins,
        tooltip: {
          ...plugins.tooltip,
          callbacks: {
            label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} ${yUnit}`,
          },
        },
      }
    : plugins;

  return (
    <View style={[chartStyles.container, { height }]}>
      <Bar
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            ...tooltipPlugin,
            legend: showLegend ? plugins.legend : { display: false },
          },
          scales,
        }}
      />
    </View>
  );
}

// ── Horizontal bar chart ─────────────────────────────────────────────────────

export function AdminHBarChart({
  labels,
  datasets,
  height = 240,
  showLegend = false,
  yUnit,
}: BaseChartProps) {
  const theme = useTheme();
  const { plugins } = buildChartTheme(theme as any);
  const fontFamily =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const labelColor = theme.textSecondary;
  const gridColor = theme.headerBorder;

  const data = useMemo(
    () => ({
      labels,
      datasets: datasets.map((ds, i) => {
        const color = ds.color ?? CHART_COLORS[i % CHART_COLORS.length]!;
        return {
          label: ds.label,
          data: ds.data,
          backgroundColor: color + 'CC',
          hoverBackgroundColor: color,
          borderRadius: 4,
        };
      }),
    }),
    [labels, datasets],
  );

  const scales = {
    x: {
      grid: { color: gridColor, drawBorder: false },
      ticks: { color: labelColor, font: { size: 11, family: fontFamily } },
      border: { display: false },
    },
    y: {
      grid: { color: 'transparent', drawBorder: false },
      ticks: {
        color: labelColor,
        font: { size: 11, family: fontFamily },
        callback: (val: any, idx: number) => {
          const label = labels[idx] ?? '';
          return label.length > 20 ? label.slice(0, 18) + '…' : label;
        },
      },
      border: { display: false },
    },
  };

  const tooltipPlugin = yUnit
    ? {
        ...plugins,
        tooltip: {
          ...plugins.tooltip,
          callbacks: {
            label: (ctx: any) =>
              `${ctx.dataset.label}: ${ctx.parsed.x.toLocaleString()} ${yUnit}`,
          },
        },
      }
    : plugins;

  return (
    <View style={[chartStyles.container, { height }]}>
      <Bar
        data={data}
        options={{
          indexAxis: 'y' as const,
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            ...tooltipPlugin,
            legend: showLegend ? plugins.legend : { display: false },
          },
          scales,
        }}
      />
    </View>
  );
}

// ── Doughnut chart ───────────────────────────────────────────────────────────

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

export function AdminDoughnutChart({
  segments,
  height = 240,
  showLegend = true,
  centerLabel,
}: DoughnutChartProps) {
  const theme = useTheme();
  const { plugins } = buildChartTheme(theme as any);

  const data = useMemo(
    () => ({
      labels: segments.map((s) => s.label),
      datasets: [
        {
          data: segments.map((s) => s.value),
          backgroundColor: segments.map((s) => s.color + 'CC'),
          hoverBackgroundColor: segments.map((s) => s.color),
          borderColor: theme.composerBackground,
          borderWidth: 3,
          hoverBorderWidth: 3,
        },
      ],
    }),
    [segments, theme.composerBackground],
  );

  const centerTextPlugin = centerLabel
    ? {
        id: 'centerText',
        afterDraw(chart: any) {
          const { ctx, chartArea } = chart;
          if (!chartArea) return;
          const cx = (chartArea.left + chartArea.right) / 2;
          const cy = (chartArea.top + chartArea.bottom) / 2;
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = `700 18px ${'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'}`;
          ctx.fillStyle = theme.text;
          ctx.fillText(centerLabel, cx, cy - 8);
          ctx.font = `500 11px ${'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'}`;
          ctx.fillStyle = theme.textSecondary;
          ctx.fillText('total', cx, cy + 10);
          ctx.restore();
        },
      }
    : null;

  return (
    <View style={[chartStyles.container, { height }]}>
      <Doughnut
        data={data}
        plugins={centerTextPlugin ? [centerTextPlugin] : []}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            ...plugins,
            legend: showLegend
              ? { ...plugins.legend, position: 'bottom' as const }
              : { display: false },
          },
        }}
      />
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
});
