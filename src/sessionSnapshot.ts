import {
  storyDiceCategories,
  type StoryDiceCategory,
  type StoryDiceResult,
} from "./storyDice";

export type SessionSnapshotArtifact = {
  label: string;
  content: string;
};

export type SessionSnapshotTimer = {
  phaseLabel: string;
  name: string;
  minutes: number;
  action: string;
};

export type SessionSnapshotPreset = {
  name?: string;
  notes?: string;
};

export type SessionSnapshotOptions = {
  title?: string;
  dateLabel: string;
  result: StoryDiceResult;
  timer: SessionSnapshotTimer;
  preset?: SessionSnapshotPreset;
  artifacts?: SessionSnapshotArtifact[];
};

const artifactLineLimit = 6;

export function formatSessionSnapshot(options: SessionSnapshotOptions): string {
  const title = sanitizeHeading(
    options.title,
    "Story Dice Lab session snapshot",
  );
  const presetName = sanitizeOptionalInline(options.preset?.name);
  const presetNotes = sanitizeOptionalInline(options.preset?.notes);
  const artifactSections = (options.artifacts ?? [])
    .map(formatArtifact)
    .filter(Boolean);

  const lines = [
    `# ${title}`,
    "",
    `Date: ${sanitizeInline(options.dateLabel) || "Unspecified"}`,
    `Seed: ${sanitizeInline(options.result.seed) || "Unspecified"}`,
    "",
    "## Active dice",
    "",
    ...storyDiceCategories.map(
      (category) =>
        `- ${formatCategory(category)}: ${sanitizeInline(options.result.dice[category])}`,
    ),
    "",
    "## Facilitator phase",
    "",
    `- Phase: ${sanitizeInline(options.timer.phaseLabel)}`,
    `- Timer: ${sanitizeInline(options.timer.name)}, ${options.timer.minutes} minutes`,
    `- Action: ${sanitizeInline(options.timer.action)}`,
    "",
    "## Preset notes",
    "",
    `- Preset: ${presetName}`,
    `- Notes: ${presetNotes}`,
  ];

  if (artifactSections.length > 0) {
    lines.push(
      "",
      "## Classroom artifacts",
      "",
      ...joinSections(artifactSections),
    );
  }

  return lines.join("\n");
}

function formatArtifact(artifact: SessionSnapshotArtifact): string {
  const label = sanitizeHeading(artifact.label, "Artifact");
  const normalizedLines = artifact.content
    .split(/\r?\n/)
    .map((line) => sanitizeInline(line))
    .filter(Boolean);

  if (normalizedLines.length === 0) return "";

  const excerptLines = normalizedLines.slice(0, artifactLineLimit);
  if (normalizedLines.length > artifactLineLimit) excerptLines.push("...");

  return [`### ${label}`, "", ...excerptLines.map((line) => `> ${line}`)].join(
    "\n",
  );
}

function joinSections(sections: string[]): string[] {
  return sections.flatMap((section, index) =>
    index === 0 ? [section] : ["", section],
  );
}

function sanitizeHeading(value: string | undefined, fallback: string): string {
  const normalized = collapseWhitespace(value ?? "");
  return hasMeaningfulText(normalized) ? escapeMarkdown(normalized) : fallback;
}

function sanitizeOptionalInline(value: string | undefined): string {
  const normalized = collapseWhitespace(value ?? "");
  return normalized ? escapeMarkdown(normalized) : "None";
}

function sanitizeInline(value: string): string {
  return escapeMarkdown(collapseWhitespace(value));
}

function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function hasMeaningfulText(value: string): boolean {
  return /[\p{L}\p{N}]/u.test(value);
}

function formatCategory(category: StoryDiceCategory): string {
  return category[0].toUpperCase() + category.slice(1);
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_[\]{}()#+\-.!|>]/g, "\\$&");
}
