/**
 * Shared Chart.js theme helpers for the admin dashboard.
 * Call `buildChartTheme(theme)` inside a component to get typed options/colors.
 */

export type AppTheme = {
  text: string;
  textSecondary: string;
  headerBorder: string;
  composerBackground: string;
  background: string;
  accent: string;
};

/** Palette used for multi-series charts. */
export const CHART_COLORS = [
  '#2563EB', // blue
  '#16A34A', // green
  '#D97706', // amber
  '#B91C1C', // red
  '#7C3AED', // purple
  '#0891B2', // cyan
  '#EA580C', // orange
  '#4B5563', // gray
];

/** Role-specific colors for doughnuts / pie. */
export const ROLE_COLORS = {
  admin: '#B91C1C',
  teacher: '#D97706',
  student: '#2563EB',
};

/** Build Chart.js-compatible default options driven by the current theme. */
export function buildChartTheme(theme: AppTheme) {
  const gridColor = theme.headerBorder;
  const labelColor = theme.textSecondary;
  const fontFamily =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const scales = {
    x: {
      grid: { color: 'transparent', drawBorder: false },
      ticks: {
        color: labelColor,
        font: { size: 11, family: fontFamily },
        maxRotation: 0,
      },
      border: { display: false },
    },
    y: {
      grid: { color: gridColor, drawBorder: false },
      ticks: {
        color: labelColor,
        font: { size: 11, family: fontFamily },
        maxTicksLimit: 5,
      },
      border: { display: false },
    },
  };

  const plugins = {
    legend: {
      labels: {
        color: theme.text,
        font: { size: 12, family: fontFamily },
        boxWidth: 12,
        boxHeight: 12,
        padding: 16,
        usePointStyle: true,
        pointStyle: 'circle',
      },
    },
    tooltip: {
      backgroundColor: theme.composerBackground,
      titleColor: theme.text,
      bodyColor: theme.textSecondary,
      borderColor: theme.headerBorder,
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
      titleFont: { size: 12, weight: '600' as const, family: fontFamily },
      bodyFont: { size: 12, family: fontFamily },
    },
  };

  return { scales, plugins, fontFamily };
}
