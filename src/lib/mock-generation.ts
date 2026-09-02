import type { TypingStage } from '@/types/chat';

const MOCK_MIND_MAP_REPLY = `Here's a mind map breaking down your topic.

\`\`\`json
{
  "nodeData": {
    "id": "root",
    "topic": "Your Topic",
    "root": true,
    "children": [
      {
        "id": "branch1",
        "topic": "Core Idea",
        "children": [
          { "id": "leaf1", "topic": "Definition" },
          { "id": "leaf2", "topic": "Why it matters" }
        ]
      },
      {
        "id": "branch2",
        "topic": "Key Parts",
        "children": [
          { "id": "leaf3", "topic": "Component A" },
          { "id": "leaf4", "topic": "Component B" }
        ]
      },
      {
        "id": "branch3",
        "topic": "Examples",
        "children": [
          { "id": "leaf5", "topic": "Real-world use" }
        ]
      }
    ]
  }
}
\`\`\``;

const MOCK_MIND_MAP_MARKDOWN = `Here is a structured breakdown of your topic.

### Photosynthesis

- **Light reactions**
  - Chlorophyll absorbs light
  - Water splits into oxygen
- **Calvin cycle**
  - CO₂ is fixed into sugar
  - ATP and NADPH provide energy
- **Inputs**
  - Sunlight
  - Water
  - Carbon dioxide
- **Outputs**
  - Glucose
  - Oxygen`;

const MOCK_REPLIES = [
  `Great question! Here's a quick breakdown:

### Key points

- **Start simple** — focus on the core idea first
- **Iterate fast** — small steps beat big rewrites
- **Measure results** — let data guide the next move

Want me to go deeper on any of these?`,
  `I'd be happy to help with that. Here's an example:

\`\`\`js
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

Let me know if you'd like a different language.`,
  `Here are some ideas worth considering:

1. **Clarify the goal** — what does success look like?
2. **List constraints** — time, budget, tools
3. **Pick one approach** — commit, then review after a week`,
];

const THINKING_DELAY_MS = 900;
const STREAM_WORD_INTERVAL_MS = 40;

export const MOCK_TYPING_STAGES: { stage: TypingStage; at: number }[] = [
  { stage: 'thinking', at: 0 },
  { stage: 'writing', at: 500 },
  { stage: 'finishing', at: 900 },
];

function pickMockReply(seedText: string, mindMap?: boolean) {
  if (mindMap) {
    return seedText.length % 2 === 0 ? MOCK_MIND_MAP_REPLY : MOCK_MIND_MAP_MARKDOWN;
  }
  return MOCK_REPLIES[seedText.length % MOCK_REPLIES.length];
}

export type MockGenerationCallbacks = {
  onTypingStart: () => void;
  onTypingStage: (stage: TypingStage) => void;
  onStreamStart: (assistantId: string) => void;
  onStreamDelta: (assistantId: string, content: string) => void;
  onStreamEnd: () => void;
  onError: (message: string) => void;
};

export function runMockGeneration(
  seedText: string,
  callbacks: MockGenerationCallbacks,
  signal: AbortSignal,
  mindMap?: boolean,
) {
  callbacks.onTypingStart();
  const stageTimers = MOCK_TYPING_STAGES.slice(1).map(({ stage, at }) =>
    setTimeout(() => {
      if (!signal.aborted) callbacks.onTypingStage(stage);
    }, at),
  );

  const thinkingTimer = setTimeout(() => {
    if (signal.aborted) return;

    stageTimers.forEach(clearTimeout);
    const replyText = pickMockReply(seedText, mindMap);
    const words = replyText.split(' ');
    const assistantId = `mock-${Date.now()}`;
    let wordIndex = 0;

    callbacks.onStreamStart(assistantId);
    callbacks.onStreamDelta(assistantId, '');

    const streamInterval = setInterval(() => {
      if (signal.aborted) {
        clearInterval(streamInterval);
        callbacks.onStreamEnd();
        return;
      }
      wordIndex += 1;
      callbacks.onStreamDelta(assistantId, words.slice(0, wordIndex).join(' '));
      if (wordIndex >= words.length) {
        clearInterval(streamInterval);
        callbacks.onStreamEnd();
      }
    }, STREAM_WORD_INTERVAL_MS);
  }, THINKING_DELAY_MS);

  return () => {
    clearTimeout(thinkingTimer);
    stageTimers.forEach(clearTimeout);
  };
}
