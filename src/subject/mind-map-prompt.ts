/** Appended to the system prompt when mind-map mode is active. Keep in sync with deepseek-chat Edge Function. */
export const MIND_MAP_SYSTEM_PROMPT = `The user wants an interactive mind map. Structure your reply as:
1. One brief introductory sentence (plain text, outside any code fence).
2. Exactly one \`\`\`json fenced code block containing valid Mind Elixir data with this shape:
{"nodeData":{"id":"root","topic":"Central Topic","root":true,"children":[{"id":"branch1","topic":"Branch","children":[]}]}}
Rules: every node must have a unique string "id" and a "topic" string under 80 characters; max depth 4; max 25 nodes total; valid JSON only inside the fence; no trailing commas.
CRITICAL — OUTPUT FORMAT OVERRIDE: Do NOT reply with markdown headings, bullet lists, numbered lists, or prose paragraphs. Your entire reply must be exactly one plain introductory sentence followed by one \`\`\`json code fence. Any other format will break the interactive mind map and show the user an error. The markdown formatting rules above do not apply here.`;
