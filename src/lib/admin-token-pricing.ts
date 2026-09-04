/**
 * Token pricing for admin cost estimates.
 * Rates are approximate DeepSeek pricing (USD per 1M tokens).
 */

export type ModelPricing = {
  promptPer1M: number;   // USD per 1M prompt tokens
  completionPer1M: number; // USD per 1M completion tokens
};

/** Known model rates. Falls back to deepseek-chat rates for unknowns. */
const MODEL_RATES: Record<string, ModelPricing> = {
  'deepseek-chat':         { promptPer1M: 0.14,  completionPer1M: 0.28 },
  'deepseek-reasoner':     { promptPer1M: 0.55,  completionPer1M: 2.19 },
  'deepseek-coder':        { promptPer1M: 0.14,  completionPer1M: 0.28 },
  'deepseek-vision':       { promptPer1M: 0.14,  completionPer1M: 0.28 },
};

const DEFAULT_RATE: ModelPricing = { promptPer1M: 0.14, completionPer1M: 0.28 };

export function getRateForModel(model: string): ModelPricing {
  // Try exact match, then prefix match
  if (MODEL_RATES[model]) return MODEL_RATES[model]!;
  const key = Object.keys(MODEL_RATES).find((k) => model.startsWith(k));
  return key ? MODEL_RATES[key]! : DEFAULT_RATE;
}

/** Compute estimated USD cost for token counts. */
export function estimateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const rate = getRateForModel(model);
  return (
    (promptTokens / 1_000_000) * rate.promptPer1M +
    (completionTokens / 1_000_000) * rate.completionPer1M
  );
}

/** Format a USD amount compactly. */
export function formatUsd(amount: number): string {
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  if (amount < 1) return `$${amount.toFixed(3)}`;
  return `$${amount.toFixed(2)}`;
}

/** Format large token counts with K / M suffix. */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
