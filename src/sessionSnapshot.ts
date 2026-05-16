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

export type SessionSnapshotPrintTarget = {
  document: {
    open: () => void;
    write: (html: string) => void;
    close: () => void;
  };
  focus?: () => void;
  print: () => void;
};

const artifactLineLimit = 6;
const printableInlineLimit = 160;
const printableNotesLimit = 220;

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

export function formatPrintableSessionSnapshotHtml(
  options: SessionSnapshotOptions,
): string {
  const title = sanitizePrintableHeading(
    options.title,
    "Story Dice Lab session snapshot",
  );
  const date = sanitizePrintableInline(options.dateLabel);
  const seed = sanitizePrintableInline(options.result.seed);
  const presetName = sanitizePrintableOptional(options.preset?.name);
  const presetNotes = sanitizePrintableOptional(
    options.preset?.notes,
    printableNotesLimit,
  );
  const artifactSections = (options.artifacts ?? [])
    .map(formatPrintableArtifact)
    .filter(Boolean);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { margin: 0; color: #16120d; font: 10pt/1.35 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .snapshot-print { padding: 0.35in; }
    h1 { margin: 0 0 0.12in; font-size: 18pt; }
    h2 { margin: 0.16in 0 0.07in; font-size: 12pt; }
    h3 { margin: 0.1in 0 0.04in; font-size: 10.5pt; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.04in 0.12in; margin: 0; }
    dt { font-weight: 800; }
    dd { margin: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 0.06in; }
    th, td { border-top: 1px solid #c8beb1; padding: 0.035in 0.05in; text-align: left; vertical-align: top; }
    th { width: 1.2in; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.04em; }
    ul { margin: 0.03in 0 0; padding-left: 0.18in; }
    li { margin: 0 0 0.025in; }
    .snapshot-artifact { break-inside: avoid; }
  </style>
</head>
<body>
  <article class="snapshot-print" aria-label="Compact printable session snapshot">
    <h1>${title}</h1>
    <dl>
      <dt>Date</dt><dd>${date || "Unspecified"}</dd>
      <dt>Seed</dt><dd>${seed || "Unspecified"}</dd>
      <dt>Active phase</dt><dd>${sanitizePrintableInline(options.timer.phaseLabel)}: ${sanitizePrintableInline(options.timer.name)}, ${options.timer.minutes} minutes</dd>
      <dt>Action</dt><dd>${sanitizePrintableInline(options.timer.action)}</dd>
      <dt>Preset</dt><dd>${presetName}</dd>
      <dt>Preset notes</dt><dd>${presetNotes}</dd>
    </dl>
    <h2>Current dice</h2>
    <table>
      <tbody>
        ${storyDiceCategories
          .map(
            (category) =>
              `<tr><th scope="row">${formatCategory(category)}</th><td>${sanitizePrintableInline(options.result.dice[category])}</td></tr>`,
          )
          .join("")}
      </tbody>
    </table>${artifactSections.length > 0 ? `
    <h2>Selected artifact excerpts</h2>
    ${artifactSections.join("")}` : ""}
  </article>
</body>
</html>`;
}

export function printSessionSnapshot(
  target: SessionSnapshotPrintTarget,
  options: SessionSnapshotOptions,
): void {
  const html = formatPrintableSessionSnapshotHtml(options);
  target.document.open();
  target.document.write(html);
  target.document.close();
  target.focus?.();
  target.print();
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

function formatPrintableArtifact(artifact: SessionSnapshotArtifact): string {
  const label = sanitizePrintableHeading(artifact.label, "Artifact");
  const normalizedLines = artifact.content
    .split(/\r?\n/)
    .map((line) => sanitizePrintableInline(line))
    .filter(Boolean);

  if (normalizedLines.length === 0) return "";

  const excerptLines = normalizedLines.slice(0, artifactLineLimit);
  if (normalizedLines.length > artifactLineLimit) excerptLines.push("...");

  return `<section class="snapshot-artifact"><h3>${label}</h3><ul>${excerptLines.map((line) => `<li>${line}</li>`).join("")}</ul></section>`;
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

function sanitizePrintableHeading(
  value: string | undefined,
  fallback: string,
): string {
  const normalized = boundedInline(value ?? "", printableInlineLimit);
  return hasMeaningfulText(normalized) ? escapeHtml(normalized) : fallback;
}

function sanitizePrintableOptional(
  value: string | undefined,
  limit = printableInlineLimit,
): string {
  const normalized = boundedInline(value ?? "", limit);
  return normalized ? escapeHtml(normalized) : "None";
}

function sanitizePrintableInline(
  value: string,
  limit = printableInlineLimit,
): string {
  return escapeHtml(boundedInline(value, limit));
}

function boundedInline(value: string, limit: number): string {
  const normalized = collapseWhitespace(value);
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
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
