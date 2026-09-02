export const COLLAPSE_THRESHOLD = 15;

export type DiffLineKind = 'added' | 'removed' | 'hunk' | 'none';

export function detectDiffLine(line: string): DiffLineKind {
  if (/^@@/.test(line)) return 'hunk';
  if (/^\+(?!\+\+)/.test(line)) return 'added';
  if (/^-(?!--)/.test(line)) return 'removed';
  return 'none';
}

export function hasDiffLines(lines: string[]): boolean {
  return lines.some((line) => detectDiffLine(line) !== 'none');
}
