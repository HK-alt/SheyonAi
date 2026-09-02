import type { CodingMode } from '@/types/chat';

const BUILD_MODE_PROMPT = `The user selected Build mode. Structure your reply with these exact ## headings: ## Requirements, ## Design system, ## Structure, ## Steps.
Under Requirements clarify stack: HTML/CSS (default) or React (when the user asks for React).
Under Design system describe CSS variables for colors, spacing scale (4/8/16/24/32), font stack, border-radius, and shadows. Use these professional defaults when not specified:
:root { --color-bg: #0f1419; --color-surface: #1a2332; --color-text: #e7ecf3; --color-accent: #3b82f6; --space-1: 4px; --space-2: 8px; --space-4: 16px; --space-6: 24px; --radius: 12px; --font: system-ui, sans-serif; }
Under Structure describe semantic HTML landmarks or a React component tree.
Under Steps use numbered items with brief explanations.
Output rules after Steps:
- HTML/CSS (default): include exactly one \`\`\`html fenced block with a complete self-contained document (<!DOCTYPE html>, inline <style> and <script>). Prefer inline CSS/JS over CDN links so the page works offline.
- React (when requested): include exactly one \`\`\`jsx fenced block with a self-contained component using React 18 hooks; the component must render via ReactDOM.createRoot without external imports beyond React/ReactDOM (loaded via CDN in preview).
Require mobile-first layout, visible focus states, sufficient color contrast, alt text on images, and keyboard-friendly controls.
Keep all prose outside code fences.`;

/**
 * Mode-specific append prompts — keep in sync with CODING_MODE_PROMPTS in
 * supabase/functions/deepseek-chat/index.ts
 */
export const CODING_MODE_PROMPTS: Record<CodingMode, string> = {
  debug: `The user selected Debug mode. Structure your reply with these exact ## headings in order: ## Problem, ## Root cause, ## Fix, ## Prevention. Include a minimal fix in a fenced code block with a language tag. Use a small diff when showing before/after changes.`,
  review: `The user selected Review mode. Structure your reply with these exact ## headings: ## Critical, ## Suggestions, ## Nits. Under Critical list must-fix issues; under Suggestions list improvements; under Nits list optional polish. Preserve the author's style unless clarity or correctness requires a change.`,
  explain: `The user selected Explain mode. Structure your reply with these exact ## headings: ## Intuition, ## Example, ## Pitfalls. Include a small runnable code example in a fenced block. For algorithms, add a markdown table or bullet list with time and space complexity.`,
  build: BUILD_MODE_PROMPT,
  learn: `The user selected Learn mode. Structure your reply with these exact ## headings: ## Concept, ## Walkthrough, ## Try it, ## Challenge.
Under Concept explain the intuition in plain language.
Under Walkthrough use numbered steps with small fenced code blocks.
Under Try it give a short exercise with hints first — do not provide the full solution unless the learner asks.
Under Challenge give an optional stretch task.
When a runnable demo helps, include at most one \`\`\`html or \`\`\`jsx fence after Challenge. Keep all prose outside code fences.`,
};

export const CODING_MODE_PLACEHOLDERS: Record<CodingMode, string> = {
  debug: 'Paste an error or stack trace…',
  review: 'Paste code for review…',
  explain: 'Ask about a concept or algorithm…',
  build: 'Describe the page or React component you want to build…',
  learn: 'What HTML, CSS, or React topic should we walk through?',
};

export const CODING_EMPTY_STATE_HINTS: Record<CodingMode, string> = {
  debug: "Paste an error or stack trace — we'll trace the root cause.",
  review: 'Paste your HTML, CSS, or React code for structured feedback.',
  explain: 'Ask about flexbox, hooks, or any concept — with a runnable demo.',
  build: 'Describe your page — a live HTML or React preview appears here.',
  learn: "Pick a topic — you'll get a step-by-step lesson with examples.",
};

export const CODING_MODES: { id: CodingMode; label: string }[] = [
  { id: 'learn', label: 'Learn' },
  { id: 'debug', label: 'Debug' },
  { id: 'review', label: 'Review' },
  { id: 'explain', label: 'Explain' },
  { id: 'build', label: 'Build' },
];
