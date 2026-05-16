export const sessionHistoryStorageKey = "story-dice-lab:session-history:v1";

export type SessionHistoryItem = {
  id: string;
  createdAt: string;
  title: string;
  content: string;
};

export type SessionHistoryStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type LoadSessionHistoryResult = {
  items: SessionHistoryItem[];
  warning?: string;
};

export type SaveSessionSnapshotInput = {
  title?: string;
  content: string;
  now?: Date;
};

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
const sessionHistoryExportSchema = "story-dice-lab.session-history";
const sessionHistoryExportVersion = 1;
const unavailableWarning = "Local session history is unavailable in this browser.";
const unreadableWarning = "Session history could not be read, so it was reset.";
const invalidJsonWarning = "History import must be valid JSON.";
const unsupportedSchemaWarning = "History import uses an unsupported schema.";
const malformedEntryWarning = "History import contains a malformed session entry.";

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

    return { items: parsed.filter(isSessionHistoryItem).slice(0, maxSessionHistoryItems) };
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
    ...items.map((item, index) => `${index + 1}. ${item.createdAt} - ${item.title}`),
  ].join("\n");
}

export function formatSessionHistoryControls(
  items: SessionHistoryItem[],
  statusMessage: string,
  importText = "",
): string {
  const list =
    items.length > 0
      ? `<ol class="session-history-list">
          ${items
            .map(
              (item) => `<li>
                <time datetime="${escapeHtml(item.createdAt)}">${escapeHtml(item.createdAt)}</time>
                <span>${escapeHtml(item.title)}</span>
              </li>`,
            )
            .join("")}
        </ol>`
      : '<p class="session-history-empty">No saved session snapshots yet.</p>';

  return `<div class="session-history-controls" aria-labelledby="session-history-title">
    <h2 id="session-history-title">Local session history</h2>
    <p id="session-history-help">Save up to 10 recent session snapshots in this browser before exporting or clearing them.</p>
    <div class="actions">
      <button id="save-session-history" type="button" aria-describedby="session-history-help">Save current snapshot</button>
      <button id="copy-session-history" type="button">Copy history list</button>
      <button id="copy-session-history-json" type="button">Copy history JSON</button>
      <button id="clear-session-history" type="button">Clear history</button>
    </div>
    <label class="session-history-import-label" for="session-history-import-json">Paste/import history JSON</label>
    <textarea id="session-history-import-json" rows="6" spellcheck="false" aria-describedby="session-history-import-help">${escapeHtml(importText)}</textarea>
    <p id="session-history-import-help">Import replaces the saved local history in this browser.</p>
    <button id="import-session-history" type="button">Import history</button>
    <p id="session-history-status" class="status" aria-live="polite">${escapeHtml(statusMessage)}</p>
    ${list}
  </div>`;
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

  const title = normalizeTitle(value.title);
  const content = value.content;
  return {
    id: createSessionHistoryId(value.createdAt, title, content),
    createdAt: value.createdAt,
    title,
    content,
  };
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
