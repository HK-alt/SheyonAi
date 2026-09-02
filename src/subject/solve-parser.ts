export type TutorSolveStep = {
  number: number;
  marks: string;
  title: string;
  body: string;
};

export type ParsedTutorSolve = {
  leftover: string;
  problem: string;
  steps: TutorSolveStep[];
  recap: string;
  tryThis: string;
};

const BLOCK_RE = /^##\s+(Problem|Recap|Try this|Step\s+\d+(?:\s*\([^)]+\))?)\s*$/gim;
const STEP_RE = /^step\s+(\d+)(?:\s*\(([^)]+)\))?$/i;

function asStepHeading(label: string): { number: number; marks: string } | null {
  const match = STEP_RE.exec(label.trim());
  if (!match) return null;
  return {
    number: Number(match[1]),
    marks: (match[2] ?? '').trim(),
  };
}

export function tryParseTutorSolve(content: string): ParsedTutorSolve | null {
  const text = content.trim();
  if (!/(^|\n)##\s+Step\s+\d+\b/i.test(text)) return null;

  const matches = [...text.matchAll(BLOCK_RE)];
  if (matches.length === 0) return null;

  let problem = '';
  let recap = '';
  let tryThis = '';
  const steps: TutorSolveStep[] = [];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const label = (match[1] ?? '').trim();
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? (matches[index + 1]?.index ?? text.length) : text.length;
    const body = text.slice(start, end).trim();
    const step = asStepHeading(label);
    if (step) {
      steps.push({
        number: step.number,
        marks: step.marks,
        title: step.marks ? `Step ${step.number} · ${step.marks}` : `Step ${step.number}`,
        body,
      });
      continue;
    }
    const key = label.toLowerCase();
    if (key === 'problem') problem = body;
    else if (key === 'recap') recap = body;
    else if (key === 'try this') tryThis = body;
  }

  if (steps.length === 0) return null;
  steps.sort((a, b) => a.number - b.number);
  return {
    leftover: text.slice(0, matches[0]?.index ?? 0).trim(),
    problem,
    steps,
    recap,
    tryThis,
  };
}
