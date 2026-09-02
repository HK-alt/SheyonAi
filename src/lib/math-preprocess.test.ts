import assert from 'node:assert/strict';

import { createMarkdownItWithMath } from './markdown-math.ts';
import {
  autoWrapBareMath,
  closeOpenMathDelimiters,
  formatSimpleInlineLatex,
  isolateDisplayMathBlocks,
  isSimpleInlineLatex,
  preprocessMathInMarkdown,
  promoteComplexInlineMath,
  repairAdjacentMathDelimiters,
  repairBrokenMathDelimiters,
  repairMixedMathDelimiters,
  sanitizeLatex,
  splitTextWithInlineMath,
  stripOrphanClosingDollars,
  wrapLatexEnvironments,
} from './math-preprocess.ts';

function expectEqual(actual: string, expected: string, label: string) {
  assert.equal(actual, expected, `${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
}

function expectNoAdjacentInlineDollars(text: string, label: string) {
  assert.doesNotMatch(text, /\$[^$\n]+\$\$[^$\n]/, `${label} must not contain adjacent inline math ($...$$...)`);
}

function collectDollarText(tokens: { type: string; content?: string; children?: unknown[] | null }[]): string[] {
  const found: string[] = [];
  for (const token of tokens) {
    if (token.type === 'text' && token.content?.includes('$')) {
      found.push(token.content);
    }
    if (Array.isArray(token.children)) {
      found.push(
        ...collectDollarText(token.children as { type: string; content?: string; children?: unknown[] | null }[]),
      );
    }
  }
  return found;
}

// --- autoWrapBareMath ---

expectEqual(
  autoWrapBareMath(String.raw`\frac{a}{b}x^2`),
  String.raw`$\frac{a}{b}x^2$`,
  'merges frac and attached x^2 into one inline block',
);

expectEqual(
  autoWrapBareMath(String.raw`\frac{a}{b}\frac{c}{d}`),
  String.raw`$\frac{a}{b}\frac{c}{d}$`,
  'merges chained frac commands into one inline block',
);

expectEqual(
  autoWrapBareMath('$x^2$'),
  '$x^2$',
  'leaves already-delimited inline math unchanged',
);

expectEqual(
  autoWrapBareMath('It costs $5'),
  'It costs $5',
  'leaves currency unchanged',
);

expectEqual(
  autoWrapBareMath('x^2 + y^2'),
  '$x^2$ + $y^2$',
  'wraps standalone script tokens separately',
);

expectEqual(
  autoWrapBareMath(String.raw`\frac{a}{b} + x^2`),
  String.raw`$\frac{a}{b}$+ $x^2$`,
  'separates frac and spaced script token',
);

expectNoAdjacentInlineDollars(
  autoWrapBareMath(String.raw`\frac{a}{b}x^2`),
  'frac+x^2',
);

// --- repairBrokenMathDelimiters ---

expectEqual(
  repairBrokenMathDelimiters(
    String.raw`$$\frac{3x - 5}{2} + \frac{4 - x}{3} = \frac{5x + 1}{6} + 2$ $`,
  ),
  String.raw`$$\frac{3x - 5}{2} + \frac{4 - x}{3} = \frac{5x + 1}{6} + 2$$`,
  'fixes display math closed with spaced dollars',
);

expectEqual(
  repairBrokenMathDelimiters('simplifies to:$ $3(3x - 5)'),
  'simplifies to:$ $3(3x - 5)',
  'does not smash lone $ $ into $$',
);

expectEqual(
  repairBrokenMathDelimiters('$$eq1$$ $$eq2$$'),
  '$$eq1$$ $$eq2$$',
  'does not smash adjacent display blocks into $$$$',
);

expectEqual(
  repairBrokenMathDelimiters('= 0$$$$a = 1+i$$'),
  '= 0$$$$a = 1+i$$',
  'leaves $$$$ for isolateDisplayMathBlocks to split',
);

expectEqual(
  repairBrokenMathDelimiters('It costs $ 5 $'),
  'It costs $ 5 $',
  'does not merge dollars around currency amounts',
);

// --- isolateDisplayMathBlocks ---

expectEqual(
  isolateDisplayMathBlocks("Let's compute for$$(1+i)z^2=0$$"),
  "Let's compute for\n\n$$\n(1+i)z^2=0\n$$",
  'lifts mid-line display math onto its own block',
);

expectEqual(
  isolateDisplayMathBlocks('$$eq1$$ $$eq2$$'),
  '$$\neq1\n$$\n\n$$\neq2\n$$',
  'isolates adjacent display blocks',
);

expectEqual(
  isolateDisplayMathBlocks("Let's compute for$$(1+i)z^2=0$$$$a = 1+i$$$$"),
  "Let's compute for\n\n$$\n(1+i)z^2=0\n$$\n\n$$\na = 1+i\n$$",
  'splits screenshot-like $$$$ into two display blocks',
);

expectEqual(
  isolateDisplayMathBlocks('$x^2$ plus $y^2$'),
  '$x^2$ plus $y^2$',
  'leaves inline math unchanged',
);

expectEqual(
  promoteComplexInlineMath(String.raw`The value is $\frac{a}{b}$ today.`),
  'The value is\n\n$$\n\\frac{a}{b}\n$$\n\ntoday.',
  'promotes inline frac to a display block',
);

expectEqual(
  promoteComplexInlineMath('$x^2$ plus $y^2$'),
  '$x^2$ plus $y^2$',
  'leaves simple inline math inline',
);

// --- repairAdjacentMathDelimiters ---

expectEqual(
  repairAdjacentMathDelimiters('$\\frac{a}{b}$$x^2$'),
  '$\\frac{a}{b}$ $x^2$',
  'repairs legacy adjacent inline delimiter bug',
);

expectEqual(
  repairAdjacentMathDelimiters('$$x^2 + 1$$'),
  '$$x^2 + 1$$',
  'does not alter display math',
);

// --- sanitizeLatex ---

expectEqual(
  sanitizeLatex('eq1$$$$eq2'),
  'eq1eq2',
  'strips leftover $$$$ inside a latex body',
);

// --- preprocessMathInMarkdown ---

expectEqual(
  preprocessMathInMarkdown(String.raw`The roots of \frac{a}{b}x^2 are positive.`),
  'The roots of\n\n$$\n\\frac{a}{b}x^2\n$$\n\nare positive.',
  'full preprocess promotes frac+x^2 to a display block',
);

expectEqual(
  preprocessMathInMarkdown(String.raw`\(x^2\)`),
  '$x^2$',
  'converts \\( \\) delimiters',
);

expectEqual(
  preprocessMathInMarkdown('```code with $x$```'),
  '```code with $x$```',
  'skips fenced code blocks',
);

expectEqual(
  preprocessMathInMarkdown('It costs $5 today.'),
  'It costs $5 today.',
  'preserves currency in full preprocess',
);

expectEqual(
  preprocessMathInMarkdown("Let's compute for$$(1+i)z^2=0$$"),
  "Let's compute for\n\n$$\n(1+i)z^2=0\n$$",
  'full preprocess isolates mid-line display math',
);

expectEqual(
  preprocessMathInMarkdown('$$eq1$$ $$eq2$$'),
  '$$\neq1\n$$\n\n$$\neq2\n$$',
  'full preprocess splits adjacent display math',
);

expectNoAdjacentInlineDollars(
  preprocessMathInMarkdown(String.raw`\frac{a}{b}x^2 + \frac{c}{d}y^2`),
  'full preprocess on chained expressions',
);

// --- closeOpenMathDelimiters (streaming) ---

expectEqual(
  closeOpenMathDelimiters('$x^2'),
  '$x^2$',
  'closes trailing inline math while streaming',
);

expectEqual(
  closeOpenMathDelimiters('$x^2$'),
  '$x^2$',
  'does not append $ to already-closed inline math',
);

expectEqual(
  closeOpenMathDelimiters('$$\\frac{1}{2}'),
  '$$\\frac{1}{2}$$',
  'closes trailing display math while streaming',
);

expectEqual(
  closeOpenMathDelimiters('It costs $5'),
  'It costs $5',
  'preserves trailing currency while streaming',
);

expectEqual(
  closeOpenMathDelimiters('```code $x```'),
  '```code $x```',
  'skips fenced code when closing delimiters',
);

expectEqual(
  autoWrapBareMath(String.raw`\frac{a`),
  String.raw`\frac{a`,
  'does not wrap incomplete frac command',
);

expectEqual(
  preprocessMathInMarkdown('$x^2', { isStreaming: true }),
  '$x^2$',
  'preprocess with isStreaming closes open inline math',
);

// --- markdown-it produces math tokens (not raw $ text) ---

const md = createMarkdownItWithMath();

function assertHasMathInline(source: string, label: string) {
  const tokens = md.parse(source, {});
  const inlineToken = tokens.find((t) => t.type === 'inline');
  const mathTokens = inlineToken?.children?.filter((t) => t.type === 'math_inline') ?? [];
  assert.ok(mathTokens.length > 0, `${label}: expected math_inline tokens`);
  assert.deepEqual(collectDollarText(tokens), [], `${label}: text tokens must not contain literal $`);
}

function assertHasMathBlock(source: string, expectedBodies: string[], label: string) {
  const tokens = md.parse(source, {});
  const mathBlocks = tokens.filter((t) => t.type === 'math_block');
  assert.equal(
    mathBlocks.length,
    expectedBodies.length,
    `${label}: expected ${expectedBodies.length} math_block tokens, got ${mathBlocks.length}`,
  );
  assert.deepEqual(
    mathBlocks.map((t) => t.content),
    expectedBodies,
    `${label}: math_block content`,
  );
  assert.deepEqual(collectDollarText(tokens), [], `${label}: text tokens must not contain literal $`);
}

assertHasMathBlock(
  preprocessMathInMarkdown(String.raw`Solve \frac{a}{b}x^2 = 0.`),
  [String.raw`\frac{a}{b}x^2`],
  'preprocessed frac+x^2 becomes display math',
);

assertHasMathInline(
  preprocessMathInMarkdown('The value is $x^2$ plus $y^2$.'),
  'explicit inline pairs',
);

{
  const tokens = md.parse('Let $a$ , $b$ be constants.', {});
  const dumped = JSON.stringify(tokens);
  assert.doesNotMatch(
    dumped,
    /[\u2018\u2019\u201C\u201D]/,
    'typographer must not inject smart quotes around $a$ , $b$',
  );
}

assertHasMathBlock(
  preprocessMathInMarkdown("Let's compute for$$(1+i)z^2=0$$"),
  ['(1+i)z^2=0'],
  'mid-line display math becomes math_block',
);

assertHasMathBlock(
  preprocessMathInMarkdown('$$eq1$$ $$eq2$$'),
  ['eq1', 'eq2'],
  'adjacent display math becomes two math_blocks',
);

assertHasMathBlock(
  preprocessMathInMarkdown("Let's compute for$$(1+i)z^2=0$$$$a = 1+i,\\quad b = -2+3i$$$$"),
  ['(1+i)z^2=0', String.raw`a = 1+i,\quad b = -2+3i`],
  'screenshot-like $$$$ splits into two math_blocks',
);

// --- simple inline latex ---

assert.equal(isSimpleInlineLatex('x'), true, '$x$ is simple inline');
assert.equal(isSimpleInlineLatex('a = 2'), true, '$a = 2$ is simple inline');
assert.equal(isSimpleInlineLatex(String.raw`x + 3 = \pm 4`), true, '$x + 3 = \\pm 4$ is simple inline');
assert.equal(isSimpleInlineLatex(String.raw`\frac{a}{b}`), false, '\\frac is not simple inline');
assert.equal(formatSimpleInlineLatex(String.raw`x + 3 = \pm 4`), 'x + 3 = ± 4', 'formats \\pm to ±');
assert.equal(
  isSimpleInlineLatex(String.raw`e^{i\pi}`),
  false,
  'e^{i\pi} is not simple unicode (needs KaTeX)',
);

expectEqual(
  stripOrphanClosingDollars('x^2$ + 6x'),
  'x^2 + 6x',
  'strips leftover closer after x^2$',
);

expectEqual(
  stripOrphanClosingDollars('It costs $5'),
  'It costs $5',
  'leaves currency $5 unchanged',
);

expectEqual(
  stripOrphanClosingDollars('$x^2$ + y'),
  '$x^2$ + y',
  'keeps paired $x^2$',
);

expectEqual(
  preprocessMathInMarkdown('x^2$ + 6x'),
  '$x^2$ + 6x',
  'preprocess strips orphan closer then wraps x^2',
);

function collectMathTokens(
  tokens: { type: string; content?: string; children?: unknown[] | null }[],
): { type: string; content: string }[] {
  const found: { type: string; content: string }[] = [];
  for (const token of tokens) {
    if (token.type === 'math_inline' || token.type === 'math_block') {
      found.push({ type: token.type, content: token.content ?? '' });
    }
    if (Array.isArray(token.children)) {
      found.push(
        ...collectMathTokens(
          token.children as { type: string; content?: string; children?: unknown[] | null }[],
        ),
      );
    }
  }
  return found;
}

// --- screenshot / mixed delimiter cases ---

expectEqual(repairMixedMathDelimiters('$eq$$'), '$eq$', 'repairs $eq$$ to $eq$');

expectEqual(
  autoWrapBareMath('8^{1/3}'),
  '$8^{1/3}$',
  'wraps numeric standalone script 8^{1/3}',
);

expectEqual(
  autoWrapBareMath(String.raw`2e^{i\pi}`),
  String.raw`$2e^{i\pi}$`,
  'wraps 2e^{i\\pi} as one inline math span',
);

expectEqual(
  preprocessMathInMarkdown('$eq$$'),
  '$eq$',
  'full preprocess repairs mixed $eq$$',
);

expectEqual(
  preprocessMathInMarkdown('Since 8^{1/3} = 2;'),
  'Since $8^{1/3}$ = 2;',
  'wraps 8^{1/3} in a prose sentence',
);

{
  const processed = preprocessMathInMarkdown(
    String.raw`Rewrite -8 in polar form: -8 = 8 e^{i\pi} (since argument is \pi$).`,
  );
  assert.match(processed, /\$e\^\{i\\pi\}\$/, 'wraps e^{i\\pi} in polar-form sentence');
  assert.match(processed, /\$\\pi\$/, 'wraps leftover \\pi as inline math');
  assert.doesNotMatch(processed, /is \\pi\$\)/, 'does not leave unwrapped \\pi$). leftover');
  const tokens = md.parse(processed, {});
  const math = collectMathTokens(tokens);
  assert.ok(
    math.some((token) => token.content.includes(String.raw`e^{i\pi}`)),
    'polar-form sentence emits math_inline for e^{i\\pi}',
  );
  assert.deepEqual(collectDollarText(tokens), [], 'polar-form sentence has no leftover $ text');
}

{
  const processed = preprocessMathInMarkdown(
    String.raw`|z-2i| = \sqrt{x^2 + (y-2)^2}$$`,
  );
  assert.equal(
    processed,
    String.raw`$$
|z-2i| = \sqrt{x^2 + (y-2)^2}
$$`,
    'trailing $$ on an equation line becomes a display block',
  );
}

expectEqual(
  promoteComplexInlineMath(String.raw`- item $\frac{a}{b}$`),
  String.raw`- item $\frac{a}{b}$`,
  'does not promote frac inside a list item',
);

{
  const processed = preprocessMathInMarkdown(String.raw`- item $\frac{a}{b}$`);
  assert.equal(processed, String.raw`- item $\frac{a}{b}$`, 'list-item frac stays inline after preprocess');
  const tokens = md.parse(processed, {});
  const math = collectMathTokens(tokens);
  assert.ok(
    math.some((token) => token.type === 'math_inline' && token.content.includes('\\frac')),
    'list-item frac becomes math_inline',
  );
  assert.equal(
    math.filter((token) => token.type === 'math_block').length,
    0,
    'list-item frac is not promoted to math_block',
  );
  assert.deepEqual(collectDollarText(tokens), [], 'list-item frac has no leftover $ text');
}

{
  const processed = preprocessMathInMarkdown(
    String.raw`- **k = 0:** z = 2e^{i\pi/3} = 2(\cos 60^\circ + i\sin 60^\circ) = 2\left\frac{1}{2} + i\frac{\sqrt{3}}{2}\right) = 1 + i\sqrt{3}$!`,
  );
  const tokens = md.parse(processed, {});
  const math = collectMathTokens(tokens);
  assert.equal(math.length, 1, 'k=0 bullet becomes a single math token');
  assert.equal(math[0].type, 'math_inline', 'k=0 bullet stays inline in the list');
  assert.match(math[0].content, /\\left\\frac/, 'k=0 math keeps the original equation body');
  assert.deepEqual(collectDollarText(tokens), [], 'k=0 bullet has no leftover $ text');
  assert.equal(
    sanitizeLatex(math[0].content).includes(String.raw`\left(\frac`),
    true,
    'sanitizeLatex inserts ( after \\left before \\frac',
  );
}

{
  const processed = preprocessMathInMarkdown(String.raw`- k=2: $$z = 1 - i\sqrt{3}$$`);
  const tokens = md.parse(processed, {});
  const math = collectMathTokens(tokens);
  assert.ok(
    math.some((token) => token.content.includes(String.raw`1 - i\sqrt{3}`)),
    'list-item same-line $$...$$ becomes a math token',
  );
  assert.deepEqual(collectDollarText(tokens), [], 'list-item $$ math has no leftover $ text');
}

{
  const parts = splitTextWithInlineMath('foo $eq$$');
  assert.deepEqual(
    parts,
    [
      { kind: 'text', value: 'foo ' },
      { kind: 'math', value: 'eq', displayMode: false },
    ],
    'text-node fallback accepts mixed $eq$$',
  );
}

{
  const strayParts = splitTextWithInlineMath('stray $ then later $x^2$ works');
  assert.ok(
    strayParts.some((part) => part.kind === 'math' && part.value.includes('x^2')),
    'stray $ does not prevent later $x^2$ in text fallback',
  );
}

{
  const source = String.raw`$$
\begin{align}
a &= b \\

c &= d
\end{align}
$$`;
  const processed = preprocessMathInMarkdown(source);
  const tokens = md.parse(processed, {});
  const blocks = collectMathTokens(tokens).filter((token) => token.type === 'math_block');
  assert.equal(blocks.length, 1, 'blank lines inside align stay one math_block');
  assert.match(blocks[0].content, /\\begin\{align\}/);
  assert.match(blocks[0].content, /c &= d/);
  assert.deepEqual(collectDollarText(tokens), [], 'align with blank lines has no leftover $ text');
}

{
  const source = '$$\nincomplete latex frac\n\nThe next step is $x^2$ and done.';
  const processed = preprocessMathInMarkdown(source);
  const tokens = md.parse(processed, {});
  const math = collectMathTokens(tokens);
  assert.ok(
    math.some((token) => token.content.includes('x^2')),
    'unclosed $$ does not swallow later $x^2$',
  );
}

{
  const source = '$$\nno closer here\n\nThen we solve\n\n$$\neq2$$\n';
  const processed = preprocessMathInMarkdown(source);
  const tokens = md.parse(processed, {});
  const math = collectMathTokens(tokens);
  assert.ok(
    math.some((token) => token.content.includes('eq2')),
    'unclosed $$ at start does not eat later closed $$eq2$$',
  );
}

{
  const source = 'stray $ mid prose then later we have $x^2$ as the answer.';
  const processed = preprocessMathInMarkdown(source);
  const tokens = md.parse(processed, {});
  const math = collectMathTokens(tokens);
  assert.ok(
    math.some((token) => token.content.includes('x^2')),
    'stray mid-prose $ does not prevent later $x^2$ math_inline',
  );
}

{
  const wrapped = wrapLatexEnvironments(
    String.raw`The piecewise function is \begin{cases} 1 & x>0 \\ 0 & x\le 0 \end{cases} everywhere.`,
  );
  assert.match(wrapped, /\$\$/, 'wrapLatexEnvironments wraps bare cases in $$');
  const processed = preprocessMathInMarkdown(
    String.raw`The piecewise function is \begin{cases} 1 & x>0 \\ 0 & x\le 0 \end{cases} everywhere.`,
  );
  const tokens = md.parse(processed, {});
  const blocks = collectMathTokens(tokens).filter((token) => token.type === 'math_block');
  assert.ok(
    blocks.some((token) => token.content.includes('\\begin{cases}')),
    'bare cases environment becomes a math_block',
  );
}

{
  const source = String.raw`### Step 1

Solve $\frac{a}{b}x^2 = 0$.

$$
\begin{align}
x &= 1 \\

x &= -1
\end{align}
$$

The roots are $x^2$ and $y^2$.

\begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}
`;
  const processed = preprocessMathInMarkdown(source);
  const tokens = md.parse(processed, {});
  const math = collectMathTokens(tokens);
  assert.ok(math.length >= 3, 'long multi-equation sample emits several math tokens');
  assert.ok(
    math.some((token) => token.content.includes('\\begin{align}')),
    'long sample keeps align as math',
  );
  assert.ok(
    math.some((token) => token.content.includes('\\begin{pmatrix}')),
    'long sample wraps pmatrix as math',
  );
  assert.deepEqual(collectDollarText(tokens), [], 'long sample has no leftover $ in text tokens');
}

console.log('math-preprocess tests passed');
