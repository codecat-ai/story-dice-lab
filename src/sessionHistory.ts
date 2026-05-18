export const sessionHistoryStorageKey = "story-dice-lab:session-history:v1";

export type SessionHistoryItem = {
  id: string;
  createdAt: string;
  title: string;
  content: string;
  tags: string[];
  archiveLabel: SessionHistoryArchiveLabel;
};

export type SessionHistoryStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type SessionHistoryPrintTarget = {
  document: {
    open: () => void;
    write: (html: string) => void;
    close: () => void;
  };
  focus?: () => void;
  print: () => void;
};

export type LoadSessionHistoryResult = {
  items: SessionHistoryItem[];
  warning?: string;
};

export type SaveSessionSnapshotInput = {
  title?: string;
  content: string;
  tags?: SessionHistoryTagInput;
  archiveLabel?: SessionHistoryArchiveLabelInput;
  now?: Date;
};

export type SessionHistoryTagInput = string | string[];
export type SessionHistoryArchiveLabel = "" | "classroom" | "event" | "draft" | "assessment-follow-up";
export type SessionHistoryArchiveLabelInput = SessionHistoryArchiveLabel | string | undefined;

export type SaveSessionHistoryResult =
  | {
      ok: true;
      item: SessionHistoryItem;
      items: SessionHistoryItem[];
      warning?: string;
    }
  | {
      ok: false;
      items: SessionHistoryItem[];
      warning: string;
    };

export type ImportSessionHistoryResult =
  | {
      ok: true;
      items: SessionHistoryItem[];
    }
  | {
      ok: false;
      items: SessionHistoryItem[];
      warning: string;
    };

const maxSessionHistoryItems = 10;
const maxSessionHistoryTags = 8;
const maxSessionHistoryTagLength = 32;
const sessionHistoryExportSchema = "story-dice-lab.session-history";
const sessionHistoryExportVersion = 1;
const printableSessionHistoryContentLimit = 2200;
const reflectionPromptExcerptLimit = 220;
const unavailableWarning = "Local session history is unavailable in this browser.";
const unreadableWarning = "Session history could not be read, so it was reset.";
const invalidJsonWarning = "History import must be valid JSON.";
const unsupportedSchemaWarning = "History import uses an unsupported schema.";
const malformedEntryWarning = "History import contains a malformed session entry.";

export const archiveLabels = ["classroom", "event", "draft", "assessment-follow-up"] as const;

export function loadSessionHistory(storage: SessionHistoryStorage | null): LoadSessionHistoryResult {
  if (!storage) return { items: [], warning: unavailableWarning };

  try {
    const raw = storage.getItem(sessionHistoryStorageKey);
    if (!raw) return { items: [] };

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      storage.removeItem(sessionHistoryStorageKey);
      return { items: [], warning: unreadableWarning };
    }

    return { items: parsed.map(normalizeStoredSessionHistoryItem).filter(isPresent).slice(0, maxSessionHistoryItems) };
  } catch {
    try {
      storage.removeItem(sessionHistoryStorageKey);
    } catch {
      // Storage may be read-only or blocked; callers still receive a graceful status.
    }
    return { items: [], warning: storage ? unreadableWarning : unavailableWarning };
  }
}

export function saveSessionSnapshotToHistory(
  storage: SessionHistoryStorage | null,
  input: SaveSessionSnapshotInput,
): SaveSessionHistoryResult {
  if (!storage) return { ok: false, items: [], warning: unavailableWarning };

  const loaded = loadSessionHistory(storage);
  if (loaded.warning === unavailableWarning) {
    return { ok: false, items: [], warning: unavailableWarning };
  }

  const createdAt = (input.now ?? new Date()).toISOString();
  const title = normalizeTitle(input.title);
  const content = input.content;
  const item: SessionHistoryItem = {
    id: createSessionHistoryId(createdAt, title, content),
    createdAt,
    title,
    content,
    tags: normalizeSessionHistoryTags(input.tags ?? ""),
    archiveLabel: normalizeSessionHistoryArchiveLabel(input.archiveLabel) ?? "",
  };
  const items = [item, ...loaded.items].slice(0, maxSessionHistoryItems);

  try {
    storage.setItem(sessionHistoryStorageKey, JSON.stringify(items));
    return loaded.warning ? { ok: true, item, items, warning: loaded.warning } : { ok: true, item, items };
  } catch {
    return { ok: false, items: loaded.items, warning: unavailableWarning };
  }
}

export function clearSessionHistory(storage: SessionHistoryStorage | null): LoadSessionHistoryResult {
  if (!storage) return { items: [], warning: unavailableWarning };

  try {
    storage.removeItem(sessionHistoryStorageKey);
    return { items: [] };
  } catch {
    return { items: [], warning: unavailableWarning };
  }
}

export function exportSessionHistoryJson(items: SessionHistoryItem[]): string {
  return JSON.stringify(
    {
      schema: sessionHistoryExportSchema,
      version: sessionHistoryExportVersion,
      items,
    },
    null,
    2,
  );
}

export function normalizeSessionHistoryTags(input: SessionHistoryTagInput): string[] {
  const rawTags = Array.isArray(input) ? input : [input];
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const rawTag of rawTags) {
    for (const tagPart of rawTag.split(/[,\n]/)) {
      const tag = boundSessionHistoryTag(tagPart.trim().replace(/\s+/g, " "));
      if (!tag) continue;

      const key = tag.toLocaleLowerCase();
      if (seen.has(key)) continue;

      seen.add(key);
      tags.push(tag);
      if (tags.length >= maxSessionHistoryTags) return tags;
    }
  }

  return tags;
}

export function normalizeSessionHistoryArchiveLabel(input: unknown): SessionHistoryArchiveLabel | null {
  if (input === undefined) return "";
  if (typeof input !== "string") return null;

  const normalized = input.trim().toLocaleLowerCase();
  if (!normalized) return "";
  return archiveLabels.includes(normalized as (typeof archiveLabels)[number])
    ? (normalized as SessionHistoryArchiveLabel)
    : null;
}

export function formatArchiveLabel(label: SessionHistoryArchiveLabel): string {
  if (!label) return "No archive label";
  if (label === "assessment-follow-up") return "Assessment follow-up";
  return label.charAt(0).toLocaleUpperCase() + label.slice(1);
}

export function filterSessionHistoryByTag(items: SessionHistoryItem[], tag: string): SessionHistoryItem[] {
  const normalizedTag = normalizeSessionHistoryTags(tag)[0]?.toLocaleLowerCase();
  if (!normalizedTag) return items;
  return items.filter((item) => item.tags.some((itemTag) => itemTag.toLocaleLowerCase() === normalizedTag));
}

export function filterSessionHistoryByArchiveLabel(
  items: SessionHistoryItem[],
  archiveLabel: SessionHistoryArchiveLabelInput,
): SessionHistoryItem[] {
  const normalizedLabel = normalizeSessionHistoryArchiveLabel(archiveLabel);
  if (!normalizedLabel) return items;
  return items.filter((item) => item.archiveLabel === normalizedLabel);
}

export function filterSessionHistoryBySearchQuery(items: SessionHistoryItem[], query: string): SessionHistoryItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return items;
  return items.filter((item) =>
    `${item.title}\n${item.content}`.toLocaleLowerCase().includes(normalizedQuery),
  );
}

export function filterSessionHistory(
  items: SessionHistoryItem[],
  filters: { tag?: string; archiveLabel?: SessionHistoryArchiveLabelInput; searchQuery?: string },
): SessionHistoryItem[] {
  return filterSessionHistoryBySearchQuery(
    filterSessionHistoryByArchiveLabel(filterSessionHistoryByTag(items, filters.tag ?? ""), filters.archiveLabel),
    filters.searchQuery ?? "",
  );
}

export function importSessionHistoryFromJson(json: string): ImportSessionHistoryResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, items: [], warning: invalidJsonWarning };
  }

  if (!isSessionHistoryImportDocument(parsed)) {
    return { ok: false, items: [], warning: unsupportedSchemaWarning };
  }

  const items: SessionHistoryItem[] = [];
  for (const item of parsed.items) {
    const normalized = normalizeImportedSessionHistoryItem(item);
    if (!normalized) return { ok: false, items: [], warning: malformedEntryWarning };
    items.push(normalized);
  }

  return { ok: true, items: sortAndLimitSessionHistory(items) };
}

export function replaceSessionHistoryFromJson(
  storage: SessionHistoryStorage | null,
  json: string,
): ImportSessionHistoryResult {
  if (!storage) return { ok: false, items: [], warning: unavailableWarning };

  const imported = importSessionHistoryFromJson(json);
  if (!imported.ok) return imported;

  try {
    storage.setItem(sessionHistoryStorageKey, JSON.stringify(imported.items));
    return imported;
  } catch {
    return { ok: false, items: [], warning: unavailableWarning };
  }
}

export function formatSessionHistoryList(items: SessionHistoryItem[]): string {
  if (items.length === 0) return "Story Dice Lab session history\n\nNo saved session snapshots.";

  return [
    "Story Dice Lab session history",
    "",
    ...items.map(
      (item, index) =>
        `${index + 1}. ${item.createdAt} - ${item.title}${formatTagSuffix(item.tags)}${formatArchiveLabelSuffix(
          item.archiveLabel,
        )}`,
    ),
  ].join("\n");
}

export function formatPrintableSessionHistoryBatchHtml(items: SessionHistoryItem[]): string {
  const countLabel = `${items.length} visible saved snapshot${items.length === 1 ? "" : "s"}`;
  const records =
    items.length > 0
      ? `<section class="history-records" aria-label="Visible saved snapshots">
        ${items.map(formatPrintableSessionHistoryRecord).join("")}
      </section>`
      : `<section class="history-empty" aria-label="No visible saved snapshots">
        <h2>No visible saved snapshots</h2>
        <p>No saved snapshots are visible with the current search or filters. Adjust the visible saved-history set and print again.</p>
      </section>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Story Dice Lab saved history batch</title>
  <style>
    body { margin: 0; color: #16120d; font: 9.5pt/1.35 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .history-batch-print { padding: 0.35in; }
    h1 { margin: 0 0 0.08in; font-size: 18pt; }
    h2 { margin: 0; font-size: 12pt; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.04in 0.12in; margin: 0 0 0.16in; }
    dt { font-weight: 800; }
    dd { margin: 0; }
    .history-record { break-inside: avoid; border-top: 1px solid #c8beb1; padding: 0.12in 0 0.14in; }
    .history-meta { display: flex; flex-wrap: wrap; gap: 0.06in 0.16in; margin: 0.04in 0 0.08in; color: #554b40; }
    .history-meta span, .history-meta time { display: inline-block; }
    pre { margin: 0; white-space: pre-wrap; font: 8.8pt/1.35 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace; }
    .history-truncation { margin: 0.08in 0 0; font-style: italic; color: #554b40; }
    .history-empty { border-top: 1px solid #c8beb1; padding-top: 0.14in; }
  </style>
</head>
<body>
  <article class="history-batch-print" aria-label="Printable saved history batch">
    <h1>Story Dice Lab saved history batch</h1>
    <dl>
      <dt>Visible records</dt><dd>${items.length}</dd>
      <dt>Batch scope</dt><dd>${escapeHtml(countLabel)} from the current filtered saved-history view</dd>
    </dl>
    ${records}
  </article>
</body>
</html>`;
}

export function formatSessionHistoryReflectionPrompts(items: SessionHistoryItem[]): string {
  const recordLines =
    items.length > 0
      ? items.flatMap((item, index) => [
          `${index + 1}. ${item.title}`,
          `   Date: ${item.createdAt}`,
          `   Tags: ${item.tags.length > 0 ? item.tags.join(", ") : "No tags"}`,
          `   Archive: ${formatArchiveLabel(item.archiveLabel)}`,
          `   Theme/excerpt: ${formatReflectionPromptExcerpt(item.content)}`,
        ])
      : [
          "No visible saved session snapshots yet.",
          "Use this blank reflection sheet after saving or importing session history.",
        ];

  return [
    "Story Dice Lab facilitator reflection prompts",
    `Visible saved records: ${items.length}`,
    "",
    "Prior-session context",
    ...recordLines,
    "",
    "What worked last time?",
    "- Which prompt, dice result, routine, or peer move created the most useful writing energy?",
    "- What evidence from the saved records should be repeated?",
    "",
    "What should we revisit?",
    "- Which story element, draft habit, or facilitation move needs another pass?",
    "- Which record should be opened first if the group needs a reminder?",
    "",
    "Next-session goal",
    "- Set one small goal for the next workshop.",
    "- Name the first observable success signal.",
    "",
    "First 10 minutes",
    "- Start with the saved record that best connects to the next goal.",
    "- Ask participants to name one detail to keep and one choice to revise.",
  ].join("\n");
}

export function formatPrintableSessionHistoryReflectionPromptsHtml(items: SessionHistoryItem[]): string {
  const records =
    items.length > 0
      ? `<section class="reflection-records" aria-label="Visible saved snapshot context">
        ${items.map(formatPrintableReflectionPromptRecord).join("")}
      </section>`
      : `<section class="reflection-empty" aria-label="No visible saved snapshots">
        <h2>No visible saved session snapshots</h2>
        <p>Use this blank reflection sheet after saving or importing session history.</p>
      </section>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Story Dice Lab facilitator reflection prompts</title>
  <style>
    body { margin: 0; color: #16120d; font: 10pt/1.38 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .reflection-print { padding: 0.35in; }
    h1 { margin: 0 0 0.08in; font-size: 18pt; }
    h2 { margin: 0 0 0.06in; font-size: 12pt; }
    h3 { margin: 0; font-size: 11pt; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.04in 0.12in; margin: 0 0 0.16in; }
    dt { font-weight: 800; }
    dd { margin: 0; }
    .reflection-record { break-inside: avoid; border-top: 1px solid #c8beb1; padding: 0.1in 0 0.12in; }
    .reflection-meta { display: flex; flex-wrap: wrap; gap: 0.06in 0.14in; margin: 0.03in 0 0.06in; color: #554b40; }
    .reflection-prompts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.14in; border-top: 2px solid #16120d; padding-top: 0.14in; }
    .reflection-prompt { break-inside: avoid; border: 1px solid #c8beb1; padding: 0.1in; min-height: 0.85in; }
    .reflection-empty { border-top: 1px solid #c8beb1; padding-top: 0.14in; }
    p { margin: 0 0 0.06in; }
    ul { margin: 0; padding-left: 0.18in; }
  </style>
</head>
<body>
  <article class="reflection-print" aria-label="Printable facilitator reflection prompts">
    <h1>Story Dice Lab facilitator reflection prompts</h1>
    <dl>
      <dt>Visible records</dt><dd>${items.length}</dd>
      <dt>Scope</dt><dd>${escapeHtml(
        `${items.length} visible saved snapshot${items.length === 1 ? "" : "s"} from the current filtered saved-history view`,
      )}</dd>
    </dl>
    ${records}
    <section class="reflection-prompts" aria-label="Next-session planning prompts">
      <section class="reflection-prompt">
        <h2>What worked last time?</h2>
        <ul>
          <li>Which prompt, routine, or peer move created useful writing energy?</li>
          <li>What evidence from the saved records should be repeated?</li>
        </ul>
      </section>
      <section class="reflection-prompt">
        <h2>What should we revisit?</h2>
        <ul>
          <li>Which story element, draft habit, or facilitation move needs another pass?</li>
          <li>Which record should be opened first if the group needs a reminder?</li>
        </ul>
      </section>
      <section class="reflection-prompt">
        <h2>Next-session goal</h2>
        <ul>
          <li>Set one small goal for the next workshop.</li>
          <li>Name the first observable success signal.</li>
        </ul>
      </section>
      <section class="reflection-prompt">
        <h2>First 10 minutes</h2>
        <ul>
          <li>Start with the saved record that best connects to the next goal.</li>
          <li>Ask participants to name one detail to keep and one choice to revise.</li>
        </ul>
      </section>
    </section>
  </article>
</body>
</html>`;
}

export function printSessionHistoryBatch(target: SessionHistoryPrintTarget, items: SessionHistoryItem[]): void {
  const html = formatPrintableSessionHistoryBatchHtml(items);
  target.document.open();
  target.document.write(html);
  target.document.close();
  target.focus?.();
  target.print();
}

export function printSessionHistoryReflectionPrompts(
  target: SessionHistoryPrintTarget,
  items: SessionHistoryItem[],
): void {
  const html = formatPrintableSessionHistoryReflectionPromptsHtml(items);
  target.document.open();
  target.document.write(html);
  target.document.close();
  target.focus?.();
  target.print();
}

export function formatSessionHistoryControls(
  items: SessionHistoryItem[],
  statusMessage: string,
  importText = "",
  tagInput = "",
  selectedArchiveLabel: SessionHistoryArchiveLabelInput = "",
  selectedTagFilter = "",
  selectedArchiveFilter: SessionHistoryArchiveLabelInput = "",
  searchQuery = "",
  selectedItemId = "",
): string {
  const tagOptions = listSessionHistoryTags(items);
  const archiveLabelOptions = formatArchiveLabelOptions(selectedArchiveLabel);
  const archiveFilterOptions = formatArchiveLabelOptions(selectedArchiveFilter, "All archive labels");
  const hasActiveVisibleFilter = Boolean(
    normalizeSessionHistoryTags(selectedTagFilter)[0] ||
      normalizeSessionHistoryArchiveLabel(selectedArchiveFilter) ||
      searchQuery.trim(),
  );
  const list =
    items.length > 0
      ? `<ol class="session-history-list">
          ${items
            .map(
              (item) => `<li>
                <time datetime="${escapeHtml(item.createdAt)}">${escapeHtml(item.createdAt)}</time>
                <span>${escapeHtml(item.title)}</span>
                ${formatTagBadges(item.tags)}
                ${formatArchiveLabelBadge(item.archiveLabel)}
                <button
                  type="button"
                  data-session-history-detail-id="${escapeHtml(item.id)}"
                  aria-controls="session-history-detail-panel"
                >View details</button>
              </li>`,
            )
            .join("")}
        </ol>`
      : `<p class="session-history-empty">${
          hasActiveVisibleFilter
            ? "No saved snapshots match the current search or filters."
            : "No saved session snapshots yet."
        }</p>`;

  return `<div class="session-history-controls" aria-labelledby="session-history-title">
    <h2 id="session-history-title">Local session history</h2>
    <p id="session-history-help">Save up to 10 recent session snapshots in this browser before exporting or clearing them.</p>
    <label class="session-history-tag-label" for="session-history-tags">Snapshot tags</label>
    <input id="session-history-tags" value="${escapeHtml(tagInput)}" aria-describedby="session-history-tag-help" />
    <p id="session-history-tag-help">Separate local facilitator tags with commas or new lines. Up to 8 tags are saved.</p>
    <label class="session-history-archive-label" for="session-history-archive-label">Archive label</label>
    <select id="session-history-archive-label" aria-describedby="session-history-archive-label-help">
      ${archiveLabelOptions}
    </select>
    <p id="session-history-archive-label-help">Optionally mark this saved snapshot as classroom, event, draft, or assessment follow-up.</p>
    <div class="actions">
      <button id="save-session-history" type="button" aria-describedby="session-history-help">Save current snapshot</button>
      <button id="copy-session-history" type="button">Copy history list</button>
      <button id="copy-session-history-json" type="button">Copy history JSON</button>
      <button id="print-visible-session-history" type="button" aria-describedby="session-history-print-help">Print visible history</button>
      <button id="copy-session-history-reflection-prompts" type="button" aria-describedby="session-history-reflection-help">Copy reflection prompts</button>
      <button id="print-session-history-reflection-prompts" type="button" aria-describedby="session-history-reflection-help">Print reflection prompts</button>
      <button id="clear-session-history" type="button">Clear history</button>
    </div>
    <p id="session-history-print-help">Prints only the saved snapshots visible after tag, archive-label, and search filters.</p>
    <p id="session-history-reflection-help">Reflection prompts use only the currently visible saved-history set.</p>
    <label class="session-history-filter-label" for="session-history-tag-filter">Filter saved snapshots by tag</label>
    <select id="session-history-tag-filter">
      <option value="">All saved snapshots</option>
      ${tagOptions
        .map((tag) => {
          const selected = tag.toLocaleLowerCase() === selectedTagFilter.toLocaleLowerCase() ? " selected" : "";
          return `<option value="${escapeHtml(tag)}"${selected}>${escapeHtml(tag)}</option>`;
        })
        .join("")}
    </select>
    <label class="session-history-filter-label" for="session-history-archive-filter">Filter saved snapshots by archive label</label>
    <select id="session-history-archive-filter">
      ${archiveFilterOptions}
    </select>
    <label class="session-history-filter-label" for="session-history-search">Search saved snapshots</label>
    <input id="session-history-search" type="search" value="${escapeHtml(searchQuery)}" aria-describedby="session-history-search-help" />
    <p id="session-history-search-help">Search visible saved snapshot titles and Markdown text in this browser.</p>
    <label class="session-history-import-label" for="session-history-import-json">Paste/import history JSON</label>
    <textarea id="session-history-import-json" rows="6" spellcheck="false" aria-describedby="session-history-import-help">${escapeHtml(importText)}</textarea>
    <p id="session-history-import-help">Import replaces the saved local history in this browser.</p>
    <button id="import-session-history" type="button">Import history</button>
    <p id="session-history-status" class="status" aria-live="polite">${escapeHtml(statusMessage)}</p>
    ${list}
    ${formatSessionHistoryDetailPanel(items, selectedItemId)}
  </div>`;
}

export function formatSessionHistoryDetailPanel(items: SessionHistoryItem[], selectedItemId = ""): string {
  if (!selectedItemId || items.length === 0) {
    return `<section id="session-history-detail-panel" class="session-history-detail" aria-live="polite">
      <h3>Saved snapshot details</h3>
      <p class="session-history-empty">Select a visible saved snapshot to review, copy, or print it without changing the current roll.</p>
    </section>`;
  }

  const item = items.find((historyItem) => historyItem.id === selectedItemId);
  if (!item) {
    return `<section id="session-history-detail-panel" class="session-history-detail" aria-live="polite">
      <h3>Saved snapshot details</h3>
      <p class="session-history-empty">That saved snapshot is not visible with the current history filter.</p>
    </section>`;
  }

  const escapedId = escapeHtml(item.id);
  return `<section
      id="session-history-detail-panel"
      class="session-history-detail"
      aria-labelledby="session-history-detail-title-${escapedId}"
    >
      <h3 id="session-history-detail-title-${escapedId}">${escapeHtml(item.title)}</h3>
      <p><time datetime="${escapeHtml(item.createdAt)}">${escapeHtml(item.createdAt)}</time></p>
      ${formatTagBadges(item.tags)}
      ${formatArchiveLabelBadge(item.archiveLabel)}
      <div class="actions">
        <button id="copy-session-history-detail-${escapedId}" type="button" data-session-history-detail-copy="${escapedId}">Copy saved snapshot</button>
        <button id="print-session-history-detail-${escapedId}" type="button" data-session-history-detail-print="${escapedId}">Print saved snapshot</button>
      </div>
      <pre>${escapeHtml(item.content)}</pre>
    </section>`;
}

function normalizeTitle(title: string | undefined): string {
  const normalized = title?.trim().replace(/\s+/g, " ") ?? "";
  return normalized || "Story Dice Lab session";
}

function createSessionHistoryId(createdAt: string, title: string, content: string): string {
  const compactDate = createdAt.replace(/[-:.]/g, "");
  return `session-${compactDate}-${fnv1a(`${title}\n${content}`)}`;
}

function sortAndLimitSessionHistory(items: SessionHistoryItem[]): SessionHistoryItem[] {
  return [...items]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, maxSessionHistoryItems);
}

function normalizeImportedSessionHistoryItem(value: unknown): SessionHistoryItem | null {
  if (!isSessionHistoryItem(value)) return null;
  const createdAtDate = new Date(value.createdAt);
  if (Number.isNaN(createdAtDate.getTime()) || createdAtDate.toISOString() !== value.createdAt) return null;
  if (!value.content.trim()) return null;
  const tags = readSessionHistoryTags(value.tags);
  if (!tags) return null;
  const archiveLabel = normalizeSessionHistoryArchiveLabel(value.archiveLabel);
  if (archiveLabel === null) return null;

  const title = normalizeTitle(value.title);
  const content = value.content;
  return {
    id: createSessionHistoryId(value.createdAt, title, content),
    createdAt: value.createdAt,
    title,
    content,
    tags,
    archiveLabel,
  };
}

function normalizeStoredSessionHistoryItem(value: unknown): SessionHistoryItem | null {
  if (!isSessionHistoryItem(value)) return null;
  const tags = readSessionHistoryTags(value.tags) ?? [];
  const archiveLabel = normalizeSessionHistoryArchiveLabel(value.archiveLabel) ?? "";
  return { ...value, tags, archiveLabel };
}

function isSessionHistoryImportDocument(
  value: unknown,
): value is { schema: typeof sessionHistoryExportSchema; version: typeof sessionHistoryExportVersion; items: unknown[] } {
  if (!value || typeof value !== "object") return false;
  const document = value as Record<string, unknown>;
  return (
    document.schema === sessionHistoryExportSchema &&
    document.version === sessionHistoryExportVersion &&
    Array.isArray(document.items)
  );
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function isSessionHistoryItem(value: unknown): value is SessionHistoryItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.createdAt === "string" &&
    typeof item.title === "string" &&
    typeof item.content === "string"
  );
}

function readSessionHistoryTags(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (typeof value === "string") return normalizeSessionHistoryTags(value);
  if (Array.isArray(value) && value.every((tag) => typeof tag === "string")) {
    return normalizeSessionHistoryTags(value);
  }
  return null;
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

function boundSessionHistoryTag(tag: string): string {
  if (tag.length <= maxSessionHistoryTagLength) return tag;

  const bounded = tag.slice(0, maxSessionHistoryTagLength).trim();
  const lastSpace = bounded.lastIndexOf(" ");
  if (lastSpace >= Math.floor(maxSessionHistoryTagLength * 0.75)) return bounded.slice(0, lastSpace);
  return bounded;
}

function formatTagSuffix(tags: string[]): string {
  return tags.length > 0 ? ` [${tags.join(", ")}]` : "";
}

function formatArchiveLabelSuffix(label: SessionHistoryArchiveLabel): string {
  return label ? ` (${formatArchiveLabel(label)})` : "";
}

function formatPrintableSessionHistoryRecord(item: SessionHistoryItem): string {
  const boundedContent = boundPrintableSessionHistoryContent(item.content);
  const tags = item.tags.length > 0 ? item.tags.map(escapeHtml).join(", ") : "No tags";
  const archiveLabel = item.archiveLabel ? formatArchiveLabel(item.archiveLabel) : "No archive label";
  return `<article class="history-record">
          <h2>${escapeHtml(item.title)}</h2>
          <p class="history-meta">
            <time datetime="${escapeHtml(item.createdAt)}">${escapeHtml(item.createdAt)}</time>
            <span>Tags: ${tags}</span>
            <span>Archive: ${escapeHtml(archiveLabel)}</span>
          </p>
          <pre>${escapeHtml(boundedContent.content)}</pre>${
            boundedContent.truncated
              ? `
          <p class="history-truncation">This saved snapshot was shortened for printing. Open the local saved history detail to review the full text.</p>`
              : ""
          }
        </article>`;
}

function boundPrintableSessionHistoryContent(content: string): { content: string; truncated: boolean } {
  if (content.length <= printableSessionHistoryContentLimit) return { content, truncated: false };
  return {
    content: content.slice(0, printableSessionHistoryContentLimit).trimEnd(),
    truncated: true,
  };
}

function formatPrintableReflectionPromptRecord(item: SessionHistoryItem): string {
  const tags = item.tags.length > 0 ? item.tags.map(escapeHtml).join(", ") : "No tags";
  return `<article class="reflection-record">
          <h3>${escapeHtml(item.title)}</h3>
          <p class="reflection-meta">
            <time datetime="${escapeHtml(item.createdAt)}">${escapeHtml(item.createdAt)}</time>
            <span>Tags: ${tags}</span>
            <span>Archive: ${escapeHtml(formatArchiveLabel(item.archiveLabel))}</span>
          </p>
          <p><strong>Theme/excerpt:</strong> ${escapeHtml(formatReflectionPromptExcerpt(item.content))}</p>
        </article>`;
}

function formatReflectionPromptExcerpt(content: string): string {
  const normalized = normalizeReflectionPromptContent(content);
  if (normalized.length <= reflectionPromptExcerptLimit) return normalized || "No snapshot text saved.";

  const bounded = normalized.slice(0, reflectionPromptExcerptLimit).trimEnd();
  const lastSpace = bounded.lastIndexOf(" ");
  const excerpt =
    lastSpace >= Math.floor(reflectionPromptExcerptLimit * 0.72) ? bounded.slice(0, lastSpace).trimEnd() : bounded;
  return `${excerpt}...`;
}

function normalizeReflectionPromptContent(content: string): string {
  return content
    .replace(/\[([^\]]+)\]\([^)\s]*(?:\([^)]*\))?[^)]*\)/g, "$1")
    .replace(/[`*_~#-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatTagBadges(tags: string[]): string {
  if (tags.length === 0) return "";
  return `<span class="session-history-tags" aria-label="Tags">${tags
    .map((tag) => `<span class="session-history-tag">${escapeHtml(tag)}</span>`)
    .join("")}</span>`;
}

function formatArchiveLabelBadge(label: SessionHistoryArchiveLabel): string {
  if (!label) return "";
  return `<span class="session-history-archive-label-badge" aria-label="Archive label">${escapeHtml(
    formatArchiveLabel(label),
  )}</span>`;
}

function formatArchiveLabelOptions(
  selectedLabel: SessionHistoryArchiveLabelInput,
  emptyLabel = "No archive label",
): string {
  const normalized = normalizeSessionHistoryArchiveLabel(selectedLabel) ?? "";
  return [
    `<option value=""${normalized === "" ? " selected" : ""}>${escapeHtml(emptyLabel)}</option>`,
    ...archiveLabels.map((label) => {
      const selected = label === normalized ? " selected" : "";
      return `<option value="${escapeHtml(label)}"${selected}>${escapeHtml(formatArchiveLabel(label))}</option>`;
    }),
  ].join("");
}

function listSessionHistoryTags(items: SessionHistoryItem[]): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    for (const tag of item.tags) {
      const key = tag.toLocaleLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      tags.push(tag);
    }
  }
  return tags;
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
