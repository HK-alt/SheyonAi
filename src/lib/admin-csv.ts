/**
 * CSV export helpers for admin screens.
 * Web: triggers a browser download via a Blob URL.
 * Native: copies CSV text to clipboard (expo-clipboard) as a lightweight fallback.
 */

import { Platform } from 'react-native';

type CsvRow = Record<string, string | number | boolean | null | undefined>;

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Wrap in quotes if it contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(rows: CsvRow[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]!);
  const headerLine = headers.map(escapeCsvCell).join(',');
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCsvCell(row[h])).join(','),
  );
  return [headerLine, ...dataLines].join('\n');
}

/** Download CSV. On web, creates a Blob anchor click. On native, shares to clipboard. */
export async function downloadCsv(filename: string, rows: CsvRow[]): Promise<void> {
  const csv = buildCsv(rows);

  if (Platform.OS === 'web') {
    // Browser download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  // Native: copy to clipboard as a reasonable fallback
  try {
    const Clipboard = await import('expo-clipboard');
    await Clipboard.setStringAsync(csv);
    console.log('[admin-csv] CSV copied to clipboard');
  } catch {
    console.warn('[admin-csv] expo-clipboard not available; CSV export skipped on native');
  }
}
