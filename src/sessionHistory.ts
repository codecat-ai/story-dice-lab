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

const maxSessionHistoryItems = 10;
const unavailableWarning = "Local session history is unavailable in this browser.";
const unreadableWarning = "Session history could not be read, so it was reset.";

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

export function formatSessionHistoryList(items: SessionHistoryItem[]): string {
  if (items.length === 0) return "Story Dice Lab session history\n\nNo saved session snapshots.";

  return [
    "Story Dice Lab session history",
    "",
    ...items.map((item, index) => `${index + 1}. ${item.createdAt} - ${item.title}`),
  ].join("\n");
}

export function formatSessionHistoryControls(items: SessionHistoryItem[], statusMessage: string): string {
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
      <button id="clear-session-history" type="button">Clear history</button>
    </div>
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
