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

const MOCK_PRESENTATION_REPLY = `Here's a short teaching deck covering the main visual layout types.

\`\`\`json
{"title":"Sample Topic","subtitle":"Teaching deck","audience":"Students","theme":"academic","slides":[{"layout":"title","title":"Sample Topic","subtitle":"A clear overview","notes":"Welcome the class and state the learning goal."},{"layout":"agenda","title":"What We'll Cover","steps":["Core ideas","Data & Charts","Flows & Cycles","Hierarchies","Key terms","Takeaways"],"notes":"Roadmap for the short deck."},{"layout":"section","title":"Part 1: Core Ideas","notes":"Set up the first teaching block."},{"layout":"bullets","title":"What to Remember","bullets":["Start with the big idea","Use one concrete example","Check understanding early","Connect to prior knowledge","End with a short practice"],"notes":"Keep each bullet short enough to read aloud."},{"layout":"infographic","title":"Key Figures at a Glance","facts":[{"label":"3","value":"Core stages in the process"},{"label":"80%","value":"Of students improve with visual aids"},{"label":"1492","value":"Year the Age of Exploration began"},{"label":"4.5B","value":"Years of Earth's history"}],"notes":"Pause on these figures and ask students to guess the context before revealing."},{"layout":"chart","title":"Student Performance by Subject","chartType":"bar","series":[{"label":"Maths","value":78},{"label":"Science","value":85},{"label":"History","value":62},{"label":"English","value":71},{"label":"Art","value":90}],"notes":"Ask students why Art scores are highest — discuss intrinsic motivation."},{"layout":"timeline","title":"Key Milestones","facts":[{"label":"1543","value":"Copernicus publishes heliocentric model"},{"label":"1687","value":"Newton's laws of motion"},{"label":"1859","value":"Darwin's On the Origin of Species"},{"label":"1905","value":"Einstein's special relativity"},{"label":"1953","value":"DNA double helix discovered"}],"notes":"Emphasise how each discovery built on the previous one."},{"layout":"diagram","title":"The Learning Cycle","nodes":[{"id":"exp","label":"Experience","detail":"Do or observe"},{"id":"ref","label":"Reflect","detail":"Think it over"},{"id":"abs","label":"Conceptualise","detail":"Form a model"},{"id":"act","label":"Apply","detail":"Test in practice"}],"edges":[{"from":"exp","to":"ref"},{"from":"ref","to":"abs"},{"from":"abs","to":"act"},{"from":"act","to":"exp","label":"new cycle"}],"notes":"Kolb's cycle — ask students where they are right now in their learning."},{"layout":"triangle","title":"The Fire Triangle","vertices":[{"heading":"Heat","body":"Energy source that starts and sustains combustion"},{"heading":"Fuel","body":"Material that burns — wood, gas, or organic matter"},{"heading":"Oxygen","body":"Oxidiser that allows the combustion reaction"}],"center":"Fire","notes":"Remove any vertex and the fire is extinguished — useful analogy for problem-solving."},{"layout":"pyramid","title":"Maslow's Hierarchy of Needs","levels":[{"heading":"Self-Actualisation","body":"Achieving one's full potential"},{"heading":"Esteem","body":"Respect, achievement, recognition"},{"heading":"Love & Belonging","body":"Friendship, family, belonging"},{"heading":"Safety","body":"Security, health, employment"},{"heading":"Physiological","body":"Food, water, shelter, sleep"}],"notes":"Work upward from the base — lower needs must be met before higher ones are pursued."},{"layout":"cycle","title":"The Water Cycle","steps":["Evaporation from oceans","Water vapour rises","Condensation forms clouds","Precipitation falls as rain or snow","Runoff flows into rivers","Returns to the ocean"],"center":"H₂O","notes":"Ask students to identify the energy source driving the cycle (solar radiation)."},{"layout":"funnel","title":"The Scientific Method","steps":["Ask a Question","Form a Hypothesis","Design an Experiment","Collect & Analyse Data","Draw Conclusions"],"notes":"Stress that most experiments are rejected at the data stage — failure is part of science."},{"layout":"twoColumn","title":"Compare two views","left":{"heading":"Before","bullets":["Guess from memory","List what is unclear"]},"right":{"heading":"After","bullets":["Explain in own words","Teach a peer"]},"notes":"Use this slide to show progress across the lesson."},{"layout":"keyFacts","title":"Key Terms","facts":[{"label":"Concept","value":"The main idea in one sentence"},{"label":"Example","value":"A real case that makes it concrete"},{"label":"Check","value":"A quick question to confirm understanding"}],"notes":"Pause here and ask students to define each term."},{"layout":"closing","title":"Key Takeaways","subtitle":"Next: try one practice question","bullets":["Teach less, but teach it clearly","Check understanding early","Connect new ideas to prior knowledge"],"notes":"Close with this takeaway and invite questions."}]}
\`\`\``;

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

function pickMockReply(seedText: string, mindMap?: boolean, presentation?: boolean) {
  if (presentation) {
    return MOCK_PRESENTATION_REPLY;
  }
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
  presentation?: boolean,
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
    const replyText = pickMockReply(seedText, mindMap, presentation);
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
