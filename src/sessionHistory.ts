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

export function filterSessionHistory(
  items: SessionHistoryItem[],
  filters: { tag?: string; archiveLabel?: SessionHistoryArchiveLabelInput },
): SessionHistoryItem[] {
  return filterSessionHistoryByArchiveLabel(filterSessionHistoryByTag(items, filters.tag ?? ""), filters.archiveLabel);
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

export function formatSessionHistoryControls(
  items: SessionHistoryItem[],
  statusMessage: string,
  importText = "",
  tagInput = "",
  selectedArchiveLabel: SessionHistoryArchiveLabelInput = "",
  selectedTagFilter = "",
  selectedArchiveFilter: SessionHistoryArchiveLabelInput = "",
  selectedItemId = "",
): string {
  const tagOptions = listSessionHistoryTags(items);
  const archiveLabelOptions = formatArchiveLabelOptions(selectedArchiveLabel);
  const archiveFilterOptions = formatArchiveLabelOptions(selectedArchiveFilter, "All archive labels");
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
      : '<p class="session-history-empty">No saved session snapshots yet.</p>';

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
      <button id="clear-session-history" type="button">Clear history</button>
    </div>
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
