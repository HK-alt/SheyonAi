import type { MathMode } from '@/types/chat';

/**
 * Math workspace Solve prompt — keep in sync with MATH_MODE_PROMPTS in
 * supabase/functions/deepseek-chat/index.ts
 */
export const MATH_SOLVE_PROMPT = `The user selected Solve mode. Continue from the last problem in this thread when one exists.
Write as a calm exam tutor with a mark-scheme voice: precise, numbered, no slang.
Structure your reply with these exact heading types: ## Problem, then ## Step 1 (n marks), ## Step 2 (n marks), … (3–6 steps), then ## Recap, then ## Try this.
Under Problem restate the question in one or two lines. Do not solve it there.
Each Step heading must keep that exact pattern, including the mark in parentheses when it helps (e.g. ## Step 1 (1 mark)). Under each Step give only that line of working, with just enough reason to follow it. Use LaTeX for equations ($...$ inline, $$...$$ display).
Under Recap give 2–3 lines on the method — not a second full solution.
Under Try this give one similar follow-up problem with no answer.`;

export const MATH_MODE_PROMPTS: Record<MathMode, string> = {
  solve: MATH_SOLVE_PROMPT,
};

export const MATH_MODE_PLACEHOLDERS = {
  equation: 'Write the expression, then tap notation to refine it…',
  solve: 'Enter an equation to solve…',
} as const;

export const MATH_EMPTY_STATE_HINTS = {
  equation: 'Build the expression on the pad, then send it as typeset math.',
  solve: 'Enter an equation — you will get a marked step-by-step solution.',
} as const;

export function mathPadPalette(scheme: 'light' | 'dark') {
  return scheme === 'dark'
    ? {
        surface: '#201E1B',
        key: '#2E2B27',
        ink: '#F4F0E6',
        muted: '#B8B1A5',
        line: '#454139',
        glow: 'rgba(59, 130, 246, 0.18)',
      }
    : {
        surface: '#F7F3EB',
        key: '#FFFFFF',
        ink: '#1A1714',
        muted: '#7A7368',
        line: '#E6DFD2',
        glow: 'rgba(37, 99, 235, 0.10)',
      };
}

export type MathKeyCategory =
  | 'popular'
  | 'ops'
  | 'fractions'
  | 'scripts'
  | 'roots'
  | 'greek'
  | 'trig'
  | 'calc'
  | 'matrices';

export type MathKey = {
  id: string;
  label: string;
  latex: string;
  category: MathKeyCategory;
  /** KaTeX shown on the key. Empty slots use `\\square`. */
  preview?: string;
};

export type MathTemplate = {
  id: string;
  label: string;
  latex: string;
};

export const MATH_KEY_CATEGORIES: { id: MathKeyCategory; label: string }[] = [
  { id: 'popular', label: 'Core' },
  { id: 'trig', label: 'Trig' },
  { id: 'calc', label: 'Calc' },
  { id: 'ops', label: 'Ops' },
  { id: 'fractions', label: 'Frac' },
  { id: 'scripts', label: 'Index' },
  { id: 'roots', label: 'Roots' },
  { id: 'greek', label: 'Greek' },
  { id: 'matrices', label: 'Array' },
];

/** Core pad order — compact toolkit, not a consumer-keyboard clone. */
export const MATH_POPULAR_IDS = [
  'frac',
  'sup',
  'sub',
  'sqrt',
  'nthroot',
  'logb',
  'defint',
  'sum',
  'pi',
  'infty',
  'plus',
  'minus',
  'times',
  'div',
  'fact',
  'log',
  'ln',
  'sq',
  'inv',
  'binom',
  'vec',
  'e',
  'exp',
  'imag',
  'paren',
] as const;

export const MATH_KEYS: MathKey[] = [
  { id: 'plus', label: '+', latex: '+', category: 'ops' },
  { id: 'minus', label: '−', latex: '-', category: 'ops' },
  { id: 'times', label: '×', latex: '\\times', category: 'ops', preview: '\\times' },
  { id: 'div', label: '÷', latex: '\\div', category: 'ops', preview: '\\div' },
  { id: 'eq', label: '=', latex: '=', category: 'ops' },
  { id: 'neq', label: '≠', latex: '\\neq', category: 'ops', preview: '\\neq' },
  { id: 'leq', label: '≤', latex: '\\leq', category: 'ops', preview: '\\leq' },
  { id: 'geq', label: '≥', latex: '\\geq', category: 'ops', preview: '\\geq' },
  { id: 'pm', label: '±', latex: '\\pm', category: 'ops', preview: '\\pm' },
  { id: 'cdot', label: '·', latex: '\\cdot', category: 'ops', preview: '\\cdot' },
  { id: 'approx', label: '≈', latex: '\\approx', category: 'ops', preview: '\\approx' },
  { id: 'infty', label: '∞', latex: '\\infty', category: 'ops', preview: '\\infty' },
  { id: 'to', label: '→', latex: '\\to', category: 'ops', preview: '\\to' },
  { id: 'implies', label: '⇒', latex: '\\Rightarrow', category: 'ops', preview: '\\Rightarrow' },
  { id: 'in', label: '∈', latex: '\\in', category: 'ops', preview: '\\in' },
  { id: 'paren', label: '( )', latex: '(|)', category: 'ops', preview: '({\\square})' },
  { id: 'fact', label: '!', latex: '!', category: 'ops' },

  { id: 'frac', label: 'a/b', latex: '\\frac{|}{}', category: 'fractions', preview: '\\dfrac{\\square}{\\square}' },
  { id: 'dfrac', label: 'A/B', latex: '\\dfrac{|}{}', category: 'fractions', preview: '\\dfrac{\\square}{\\square}' },
  { id: 'tfrac', label: 'a/b', latex: '\\tfrac{|}{}', category: 'fractions', preview: '\\tfrac{\\square}{\\square}' },
  { id: 'percent', label: '%', latex: '\\%', category: 'fractions' },
  { id: 'binom', label: 'nCk', latex: '\\binom{|}{}', category: 'fractions', preview: '\\binom{n}{k}' },

  { id: 'sup', label: 'xⁿ', latex: '^{|}', category: 'scripts', preview: 'x^{\\square}' },
  { id: 'sub', label: 'xₙ', latex: '_{|}', category: 'scripts', preview: 'x_{\\square}' },
  { id: 'supsub', label: 'xⁿₙ', latex: '_{|}^{}', category: 'scripts', preview: 'x_{\\square}^{\\square}' },
  { id: 'sq', label: 'x²', latex: '^{2}', category: 'scripts', preview: 'x^{2}' },
  { id: 'cube', label: 'x³', latex: '^{3}', category: 'scripts', preview: 'x^{3}' },
  { id: 'inv', label: 'x⁻¹', latex: '^{-1}', category: 'scripts', preview: 'x^{-1}' },
  { id: 'vec', label: 'vec', latex: '\\vec{|}', category: 'scripts', preview: '\\vec{\\square}' },

  { id: 'sqrt', label: '√', latex: '\\sqrt{|}', category: 'roots', preview: '\\sqrt{\\square}' },
  { id: 'nthroot', label: 'ⁿ√', latex: '\\sqrt[|]{}', category: 'roots', preview: '\\sqrt[\\square]{\\square}' },
  { id: 'cbrt', label: '∛', latex: '\\sqrt[3]{|}', category: 'roots', preview: '\\sqrt[3]{\\square}' },
  { id: 'abs', label: '|x|', latex: '\\left||\\right|', category: 'roots', preview: '\\lvert\\square\\rvert' },

  { id: 'alpha', label: 'α', latex: '\\alpha', category: 'greek', preview: '\\alpha' },
  { id: 'beta', label: 'β', latex: '\\beta', category: 'greek', preview: '\\beta' },
  { id: 'gamma', label: 'γ', latex: '\\gamma', category: 'greek', preview: '\\gamma' },
  { id: 'delta', label: 'δ', latex: '\\delta', category: 'greek', preview: '\\delta' },
  { id: 'theta', label: 'θ', latex: '\\theta', category: 'greek', preview: '\\theta' },
  { id: 'lambda', label: 'λ', latex: '\\lambda', category: 'greek', preview: '\\lambda' },
  { id: 'mu', label: 'μ', latex: '\\mu', category: 'greek', preview: '\\mu' },
  { id: 'pi', label: 'π', latex: '\\pi', category: 'greek', preview: '\\pi' },
  { id: 'sigma', label: 'σ', latex: '\\sigma', category: 'greek', preview: '\\sigma' },
  { id: 'phi', label: 'φ', latex: '\\phi', category: 'greek', preview: '\\phi' },
  { id: 'omega', label: 'ω', latex: '\\omega', category: 'greek', preview: '\\omega' },
  { id: 'Delta', label: 'Δ', latex: '\\Delta', category: 'greek', preview: '\\Delta' },
  { id: 'Sigma', label: 'Σ', latex: '\\Sigma', category: 'greek', preview: '\\Sigma' },
  { id: 'Omega', label: 'Ω', latex: '\\Omega', category: 'greek', preview: '\\Omega' },

  { id: 'sin', label: 'sin', latex: '\\sin', category: 'trig', preview: '\\sin' },
  { id: 'cos', label: 'cos', latex: '\\cos', category: 'trig', preview: '\\cos' },
  { id: 'tan', label: 'tan', latex: '\\tan', category: 'trig', preview: '\\tan' },
  { id: 'csc', label: 'csc', latex: '\\csc', category: 'trig', preview: '\\csc' },
  { id: 'sec', label: 'sec', latex: '\\sec', category: 'trig', preview: '\\sec' },
  { id: 'cot', label: 'cot', latex: '\\cot', category: 'trig', preview: '\\cot' },
  { id: 'arcsin', label: 'sin⁻¹', latex: '\\arcsin', category: 'trig', preview: '\\arcsin' },
  { id: 'arccos', label: 'cos⁻¹', latex: '\\arccos', category: 'trig', preview: '\\arccos' },
  { id: 'arctan', label: 'tan⁻¹', latex: '\\arctan', category: 'trig', preview: '\\arctan' },
  { id: 'ln', label: 'ln', latex: '\\ln', category: 'trig', preview: '\\ln' },
  { id: 'log', label: 'log', latex: '\\log', category: 'trig', preview: '\\log' },
  { id: 'logb', label: 'logₙ', latex: '\\log_{|}{}', category: 'trig', preview: '\\log_{\\square}' },
  { id: 'e', label: 'e', latex: 'e', category: 'trig' },
  { id: 'exp', label: 'eˣ', latex: 'e^{|}', category: 'trig', preview: 'e^{x}' },
  { id: 'imag', label: 'i', latex: 'i', category: 'trig' },

  { id: 'int', label: '∫', latex: '\\int | \\, dx', category: 'calc', preview: '\\int' },
  { id: 'defint', label: '∫ₐᵇ', latex: '\\int_{|}^{}  \\, dx', category: 'calc', preview: '\\int_{\\square}^{\\square}' },
  { id: 'sum', label: '∑', latex: '\\sum_{|}^{}', category: 'calc', preview: '\\sum_{\\square}^{\\square}' },
  { id: 'prod', label: '∏', latex: '\\prod_{|}^{}', category: 'calc', preview: '\\prod_{\\square}^{\\square}' },
  { id: 'lim', label: 'lim', latex: '\\lim_{|}', category: 'calc', preview: '\\lim_{\\square}' },
  { id: 'deriv', label: 'd/dx', latex: '\\frac{d}{dx}|', category: 'calc', preview: '\\dfrac{d}{dx}' },
  { id: 'partial', label: '∂', latex: '\\partial', category: 'calc', preview: '\\partial' },

  { id: 'pmat2', label: '2×2', latex: '\\begin{pmatrix} | & \\\\ & \\end{pmatrix}', category: 'matrices', preview: '\\begin{pmatrix} \\square & \\square \\\\ \\square & \\square \\end{pmatrix}' },
  { id: 'bmat2', label: '[ ]', latex: '\\begin{bmatrix} | & \\\\ & \\end{bmatrix}', category: 'matrices' },
  { id: 'pmat3', label: '3×3', latex: '\\begin{pmatrix} | & & \\\\ & & \\\\ & & \\end{pmatrix}', category: 'matrices' },
  { id: 'cases', label: '{ }', latex: '\\begin{cases} | \\\\ \\end{cases}', category: 'matrices' },
  { id: 'aligned', label: 'align', latex: '\\begin{aligned} | \\\\ \\end{aligned}', category: 'matrices' },
];

export function getMathKeysForCategory(category: MathKeyCategory): MathKey[] {
  if (category !== 'popular') {
    return MATH_KEYS.filter((key) => key.category === category);
  }
  const byId = new Map(MATH_KEYS.map((key) => [key.id, key] as const));
  return MATH_POPULAR_IDS.map((id) => byId.get(id)).filter((key): key is MathKey => !!key);
}

export const MATH_TEMPLATES: MathTemplate[] = [
  {
    id: 'quadratic',
    label: 'Quadratic',
    latex: 'x = \\frac{-b \\pm \\sqrt{b^{2}-4ac}}{2a}',
  },
  {
    id: 'binomial',
    label: 'Binomial',
    latex: '(a+b)^{n} = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^{k}',
  },
  {
    id: 'pythagoras',
    label: 'Pythagoras',
    latex: 'a^{2} + b^{2} = c^{2}',
  },
  {
    id: 'derivative',
    label: 'Derivative',
    latex: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h}",
  },
  {
    id: 'integral',
    label: 'Integral',
    latex: '\\int_{a}^{b} | \\, dx',
  },
  {
    id: 'limit',
    label: 'Limit',
    latex: '\\lim_{x \\to |} f(x)',
  },
  {
    id: 'sum',
    label: 'Sum',
    latex: '\\sum_{n=1}^{\\infty} |',
  },
  {
    id: 'product',
    label: 'Product',
    latex: '\\prod_{k=1}^{n} |',
  },
  {
    id: 'matrix2',
    label: 'Matrix',
    latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
  },
  {
    id: 'system',
    label: 'System',
    latex: '\\begin{cases} a_{1}x + b_{1}y = c_{1} \\\\ a_{2}x + b_{2}y = c_{2} \\end{cases}',
  },
];
