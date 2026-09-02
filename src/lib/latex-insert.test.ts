import assert from 'node:assert/strict';

import {
  composerVisualLatex,
  groupContaining,
  insertLatex,
  leafLatexGroups,
  listLatexGroups,
  looksLikeComposerLatex,
  nextEmptyGroup,
  previewLatex,
  replaceGroupInner,
  toMathLiveInsert,
  wrapComposerMath,
  extractStandaloneEquation,
} from './latex-insert.ts';

{
  assert.equal(toMathLiveInsert('\\frac{|}{}'), '\\frac{#0}{}');
  assert.equal(toMathLiveInsert('\\sqrt[|]{}'), '\\sqrt[#0]{}');
  assert.equal(toMathLiveInsert('\\left||\\right|'), '\\left|#0\\right|');
  assert.equal(toMathLiveInsert('\\times'), '\\times');
  assert.equal(toMathLiveInsert('(|)'), '(#0)');
}

{
  const result = insertLatex('ab', { start: 1, end: 1 }, 'x');
  assert.equal(result.text, 'axb');
  assert.equal(result.cursor, 2);
}

{
  const result = insertLatex('', { start: 0, end: 0 }, '\\frac{|}{}');
  assert.equal(result.text, '\\frac{}{}');
  assert.equal(result.cursor, 6);
}

{
  const result = insertLatex('hello', { start: 0, end: 5 }, '\\pi');
  assert.equal(result.text, '\\pi');
  assert.equal(result.cursor, 3);
}

{
  const result = insertLatex('x', { start: 99, end: 99 }, '^{2}');
  assert.equal(result.text, 'x^{2}');
  assert.equal(result.cursor, 5);
}

{
  const found = nextEmptyGroup('\\frac{}{}', 0);
  assert.deepEqual(found, { start: 6, end: 6 });
  const second = nextEmptyGroup('\\frac{}{}', 6);
  assert.deepEqual(second, { start: 8, end: 8 });
  const wrap = nextEmptyGroup('\\frac{}{}', 8);
  assert.deepEqual(wrap, { start: 6, end: 6 });
}

{
  assert.equal(nextEmptyGroup('no groups', 0), null);
  assert.equal(nextEmptyGroup('\\frac{1}{2}', 0), null);
  assert.equal(nextEmptyGroup('\\frac{}{2}', 6), null);
  assert.deepEqual(nextEmptyGroup('a\\placeholder{}b', 0), { start: 14, end: 14 });
}

{
  assert.equal(previewLatex(''), '');
  assert.equal(previewLatex('\\frac{1}{2}'), '\\frac{1}{2}');
  assert.equal(previewLatex('$$x^2$$'), 'x^2');
  assert.equal(previewLatex('$a$ and $b$'), 'a \\quad b');
  assert.equal(composerVisualLatex(''), '');
  assert.equal(composerVisualLatex('\\frac{}{}'), '\\frac{\\square}{\\square}');
  assert.equal(composerVisualLatex('$$x^2$$'), 'x^2');
  assert.match(
    composerVisualLatex('\\frac{}{}', 6),
    /\\frac\{\\boxed\{.*rule.*\}\}\{\\square\}/,
  );
}

{
  const groups = listLatexGroups('\\frac{1}{2}');
  assert.equal(groups.length, 2);
  assert.equal('\\frac{1}{2}'.slice(groups[0].innerStart, groups[0].innerEnd), '1');
  assert.equal('\\frac{1}{2}'.slice(groups[1].innerStart, groups[1].innerEnd), '2');
  const focused = groupContaining('\\frac{1}{2}', 6);
  assert.equal(focused && '\\frac{1}{2}'.slice(focused.innerStart, focused.innerEnd), '1');
  const leaves = leafLatexGroups('\\sqrt{\\frac{1}{2}}');
  assert.equal(leaves.length, 2);
  const env = listLatexGroups('\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}');
  assert.equal(env.length, 0);
  const replaced = replaceGroupInner('\\frac{1}{2}', groups[0], 'x');
  assert.equal(replaced.text, '\\frac{x}{2}');
  assert.equal(replaced.cursor, 7);
}

{
  assert.equal(looksLikeComposerLatex('x^2 + 5x + 6 = 0'), true);
  assert.equal(looksLikeComposerLatex('\\frac{1}{2} + \\sqrt{3}'), true);
  assert.equal(looksLikeComposerLatex('Please explain derivatives in simple terms'), false);
  assert.equal(looksLikeComposerLatex('hello there'), false);
}

{
  assert.equal(wrapComposerMath('x^2 + 1 = 0', true), '$$\nx^2 + 1 = 0\n$$');
  assert.equal(wrapComposerMath('\\frac{1}{2}', false), '$\\frac{1}{2}$');
  assert.equal(wrapComposerMath('$already$'), '$already$');
  assert.equal(
    wrapComposerMath('a^{2} + b^{2} = c^{2}', true, { force: true }),
    '$$\na^{2} + b^{2} = c^{2}\n$$',
  );
  assert.deepEqual(extractStandaloneEquation('$$\na^{2} + b^{2} = c^{2}\n$$'), {
    latex: 'a^{2} + b^{2} = c^{2}',
    displayMode: true,
  });
  assert.deepEqual(extractStandaloneEquation('a^{2} + b^{2} = c^{2}'), {
    latex: 'a^{2} + b^{2} = c^{2}',
    displayMode: true,
  });
  assert.equal(extractStandaloneEquation('Please solve x^2 + 1 = 0 for me later'), null);
}

console.log('latex-insert tests passed');
