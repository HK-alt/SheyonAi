import assert from 'node:assert/strict';

import { normalizeProseMarkdown, preprocessMarkdown } from './markdown-cleanup.ts';

function expectEqual(actual: string, expected: string, label: string) {
  assert.equal(actual, expected, `${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
}

expectEqual(
  normalizeProseMarkdown('--- **Step 2: Expand each term**'),
  '### Step 2: Expand each term',
  'step divider becomes heading',
);

expectEqual(
  normalizeProseMarkdown('$$10x-5=10x-16$$\n--- **Step 3: Subtract 10x from both sides**'),
  '$$10x-5=10x-16$$\n\n### Step 3: Subtract 10x from both sides',
  'step divider after math becomes heading',
);

expectEqual(
  normalizeProseMarkdown('--- **contradiction**'),
  '**contradiction**',
  'generic bold divider drops --- prefix',
);

expectEqual(
  normalizeProseMarkdown('Conclusion text\n###\n$$'),
  'Conclusion text\n\n$$',
  'strips trailing standalone heading but preserves $$ (handled downstream by math pipeline)',
);

expectEqual(
  normalizeProseMarkdown('$### Step 4: Solve using substitution'),
  '### Step 4: Solve using substitution',
  'strips stray $ before heading token',
);

expectEqual(
  normalizeProseMarkdown('$## Results'),
  '## Results',
  'strips stray $ before h2 heading token',
);

expectEqual(
  preprocessMarkdown('--- **Step 1: Start**'),
  '### Step 1: Start',
  'full preprocess applies prose cleanup',
);

expectEqual(
  preprocessMarkdown('$$10x-5=10x-16$$'),
  '$$\n10x-5=10x-16\n$$',
  'full preprocess isolates a display math block',
);

expectEqual(
  normalizeProseMarkdown('Tip: Isolate the variable first.'),
  '> **Tip:** Isolate the variable first.',
  'promotes Tip lines to callout blockquotes',
);

expectEqual(
  normalizeProseMarkdown('> **Warning:** already a quote'),
  '> **Warning:** already a quote',
  'leaves existing callout blockquotes unchanged',
);

console.log('markdown-cleanup tests passed');
