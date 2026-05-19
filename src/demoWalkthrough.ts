import { formatSessionSnapshot } from "./sessionSnapshot";
import { exportSessionHistoryJson } from "./sessionHistory";
import { exportTemplatePackJson } from "./templatePacks";
import type { StoryDiceResult } from "./storyDice";

export type DemoWalkthrough = {
  title: string;
  audienceNote: string;
  privacyNote: string;
  templatePackJson: string;
  sessionSnapshotMarkdown: string;
  sessionHistoryJson: string;
  steps: string[];
};

const demoResult: StoryDiceResult = {
  seed: "demo opening circle",
  dice: {
    character: "new club leader",
    want: "to earn one honest question",
    setting: "library makerspace after school",
    obstacle: "the projector cable is missing",
    object: "index card with a hidden note",
    twist: "the quiet group already solved the first problem",
  },
};

export function buildDemoWalkthrough(): DemoWalkthrough {
  const templatePackJson = exportTemplatePackJson({
    title: "Classroom Loop Demo Pack",
    notes: "Offline-friendly pack for showing the import, apply, save-history, and facilitator-export loop.",
    templates: [
      {
        id: "demo-opening-circle",
        title: "Demo Opening Circle",
        description: "A short classroom story sprint for demonstrating the full local-first workflow.",
        seed: demoResult.seed,
        agendaTitle: "Demo Opening Circle",
        agendaTotalMinutes: 30,
        notes: "Use this when teachers need a quick walkthrough before trying their own class pack.",
        wordBank: {
          character: ["new club leader", "late-arriving teammate", "library aide"],
          want: ["to earn one honest question", "to keep the group focused", "to make the first draft less quiet"],
          setting: ["library makerspace after school", "circle of desks near the whiteboard", "rainy hallway display"],
          obstacle: ["the projector cable is missing", "the group has only ten minutes", "two prompts contradict each other"],
          object: ["index card with a hidden note", "shared marker", "folded exit ticket"],
          twist: [
            "the quiet group already solved the first problem",
            "the best line appears in the example",
            "the note was written for the facilitator",
          ],
        },
      },
    ],
    wordBankPresets: [
      {
        name: "Demo circle word bank",
        notes: "Small classroom set for an offline walkthrough.",
        wordBank: {
          character: ["new club leader", "late-arriving teammate", "library aide"],
          want: ["to earn one honest question", "to keep the group focused", "to make the first draft less quiet"],
          setting: ["library makerspace after school", "circle of desks near the whiteboard", "rainy hallway display"],
          obstacle: ["the projector cable is missing", "the group has only ten minutes", "two prompts contradict each other"],
          object: ["index card with a hidden note", "shared marker", "folded exit ticket"],
          twist: [
            "the quiet group already solved the first problem",
            "the best line appears in the example",
            "the note was written for the facilitator",
          ],
        },
      },
    ],
  });
  const sessionSnapshotMarkdown = formatSessionSnapshot({
    title: "Demo Opening Circle checkpoint",
    dateLabel: "2026-05-18 09:00",
    result: demoResult,
    timer: {
      phaseLabel: "Phase 3 of 5",
      name: "Draft",
      minutes: 12,
      action: "Check when each pair has one obstacle choice and one object action.",
    },
    preset: {
      name: "Demo circle word bank",
      notes: "Imported from the demo template pack for a local classroom walkthrough.",
    },
    artifacts: [
      {
        label: "Facilitator agenda",
        content: [
          "Copy the agenda before class.",
          "Print timer cards for table groups.",
          "Use reflection prompts after saving history.",
        ].join("\n"),
      },
      {
        label: "Action plan excerpt",
        content: "Next step: revise the obstacle so the missing cable changes what the character wants.",
      },
    ],
  });
  const sessionHistoryJson = exportSessionHistoryJson([
    {
      id: "demo-session-history-checkpoint",
      createdAt: "2026-05-18T09:00:00.000Z",
      title: "Demo Opening Circle checkpoint",
      content: sessionSnapshotMarkdown,
      tags: ["demo", "classroom-loop"],
      archiveLabel: "classroom",
    },
  ]);

  return {
    title: "Story Dice Lab classroom loop demo",
    audienceNote:
      "For teachers and facilitators who want a paste-ready offline walkthrough before running a real class.",
    privacyNote:
      "No account or network access is required; imported packs, saved histories, and facilitator exports stay local to the browser unless you copy them out.",
    templatePackJson,
    sessionSnapshotMarkdown,
    sessionHistoryJson,
    steps: [
      "Copy the demo template pack JSON, paste it into Template packs, and import template pack data.",
      "Choose Demo Opening Circle from the classroom template menu and apply the template.",
      "Copy or print the facilitator agenda, timer cards, and action plan before the workshop starts.",
      "Run the prompt, keep the strongest dice, and copy a session snapshot at the checkpoint.",
      "Save the checkpoint to local session history with the demo and classroom-loop tags.",
      "Copy the visible history JSON and facilitator reflection prompts for a local paper or file handoff.",
    ],
  };
}

export function formatDemoWalkthroughMarkdown(demo: DemoWalkthrough = buildDemoWalkthrough()): string {
  return [
    `# ${normalizeText(demo.title)}`,
    "",
    normalizeText(demo.audienceNote),
    "",
    normalizeText(demo.privacyNote),
    "",
    "## Steps",
    "",
    ...demo.steps.map((step, index) => `${index + 1}. ${normalizeText(step)}`),
    "",
    "## Demo template pack JSON",
    "",
    "```json",
    demo.templatePackJson,
    "```",
    "",
    "## Saved-history checkpoint JSON",
    "",
    "```json",
    demo.sessionHistoryJson,
    "```",
    "",
    "## Session snapshot excerpt",
    "",
    "```markdown",
    demo.sessionSnapshotMarkdown,
    "```",
  ].join("\n");
}

export function formatDemoWalkthroughSection(demo: DemoWalkthrough = buildDemoWalkthrough()): string {
  const walkthroughMarkdown = formatDemoWalkthroughMarkdown(demo);

  return `<section class="demo-walkthrough-controls" aria-labelledby="demo-walkthrough-title">
    <h2 id="demo-walkthrough-title">${escapeHtml(normalizeText(demo.title))}</h2>
    <p>${escapeHtml(normalizeText(demo.audienceNote))}</p>
    <p>${escapeHtml(normalizeText(demo.privacyNote))}</p>
    <ol class="demo-walkthrough-steps">
      ${demo.steps.map((step) => `<li>${escapeHtml(normalizeText(step))}</li>`).join("")}
    </ol>
    <div class="demo-walkthrough-fields">
      <div>
        <label class="demo-walkthrough-field" for="demo-template-pack-json">Demo template pack JSON</label>
        <textarea id="demo-template-pack-json" rows="8" spellcheck="false" readonly>${escapeHtml(demo.templatePackJson)}</textarea>
      </div>
      <button id="copy-demo-template-pack" type="button">Copy demo pack</button>
      <div>
        <label class="demo-walkthrough-field" for="demo-session-history-json">Demo saved-history JSON</label>
        <textarea id="demo-session-history-json" rows="8" spellcheck="false" readonly>${escapeHtml(demo.sessionHistoryJson)}</textarea>
      </div>
      <button id="copy-demo-session-history" type="button">Copy demo history</button>
      <div>
        <label class="demo-walkthrough-field" for="demo-walkthrough-markdown">Demo walkthrough Markdown</label>
        <textarea id="demo-walkthrough-markdown" rows="10" spellcheck="false" readonly>${escapeHtml(walkthroughMarkdown)}</textarea>
      </div>
      <button id="copy-demo-walkthrough" type="button">Copy walkthrough</button>
    </div>
  </section>`;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}
