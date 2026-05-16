import { describe, expect, it } from "vitest";
import {
  exportSessionHistoryJson,
  formatSessionHistoryControls,
  formatSessionHistoryList,
  importSessionHistoryFromJson,
  loadSessionHistory,
  replaceSessionHistoryFromJson,
  saveSessionSnapshotToHistory,
  sessionHistoryStorageKey,
  type SessionHistoryItem,
} from "../src/sessionHistory";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

class ThrowingStorage {
  getItem(): string {
    throw new Error("storage blocked");
  }

  setItem(): void {
    throw new Error("storage blocked");
  }

  removeItem(): void {
    throw new Error("storage blocked");
  }
}

describe("local session history", () => {
  it("saves snapshots newest-first with stable ids and ISO timestamps", () => {
    const storage = new MemoryStorage();

    const first = saveSessionSnapshotToHistory(storage, {
      title: "Opening sprint",
      content: "# Snapshot one",
      now: new Date("2026-05-15T09:00:00.000Z"),
    });
    const second = saveSessionSnapshotToHistory(storage, {
      title: "Share round",
      content: "# Snapshot two",
      now: new Date("2026-05-15T09:05:00.000Z"),
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(loadSessionHistory(storage).items).toEqual([
      {
        id: "session-20260515T090500000Z-38bfa18f",
        createdAt: "2026-05-15T09:05:00.000Z",
        title: "Share round",
        content: "# Snapshot two",
      },
      {
        id: "session-20260515T090000000Z-07c0315e",
        createdAt: "2026-05-15T09:00:00.000Z",
        title: "Opening sprint",
        content: "# Snapshot one",
      },
    ]);
  });

  it("keeps only the 10 most recent snapshots", () => {
    const storage = new MemoryStorage();

    for (let index = 0; index < 12; index += 1) {
      saveSessionSnapshotToHistory(storage, {
        title: `Session ${index}`,
        content: `# Session ${index}`,
        now: new Date(Date.UTC(2026, 4, 15, 9, index)),
      });
    }

    const history = loadSessionHistory(storage).items;
    expect(history).toHaveLength(10);
    expect(history.map((item) => item.title)).toEqual([
      "Session 11",
      "Session 10",
      "Session 9",
      "Session 8",
      "Session 7",
      "Session 6",
      "Session 5",
      "Session 4",
      "Session 3",
      "Session 2",
    ]);
  });

  it("recovers gracefully from corrupted storage", () => {
    const storage = new MemoryStorage();
    storage.setItem(sessionHistoryStorageKey, "{not json");

    const result = loadSessionHistory(storage);

    expect(result.items).toEqual([]);
    expect(result.warning).toBe("Session history could not be read, so it was reset.");
    expect(storage.getItem(sessionHistoryStorageKey)).toBeNull();
  });

  it("exports deterministic pretty JSON with a schema marker", () => {
    const items: SessionHistoryItem[] = [
      {
        id: "session-a",
        createdAt: "2026-05-15T09:05:00.000Z",
        title: "Share round",
        content: "# Snapshot two",
      },
      {
        id: "session-b",
        createdAt: "2026-05-15T09:00:00.000Z",
        title: "Opening sprint",
        content: "# Snapshot one",
      },
    ];

    expect(exportSessionHistoryJson(items)).toBe(`{
  "schema": "story-dice-lab.session-history",
  "version": 1,
  "items": [
    {
      "id": "session-a",
      "createdAt": "2026-05-15T09:05:00.000Z",
      "title": "Share round",
      "content": "# Snapshot two"
    },
    {
      "id": "session-b",
      "createdAt": "2026-05-15T09:00:00.000Z",
      "title": "Opening sprint",
      "content": "# Snapshot one"
    }
  ]
}`);
  });

  it("imports validated history JSON through normal history ordering and max-10 rules", () => {
    const items = Array.from({ length: 12 }, (_, index) => ({
      id: `incoming-${index}`,
      createdAt: new Date(Date.UTC(2026, 4, 15, 9, index)).toISOString(),
      title: `  Session   ${index}  `,
      content: `# Session ${index}`,
    }));

    const result = importSessionHistoryFromJson(
      JSON.stringify({
        schema: "story-dice-lab.session-history",
        version: 1,
        items,
      }),
    );

    expect(result).toEqual({
      ok: true,
      items: [
        {
          id: "session-20260515T091100000Z-1618fb06",
          createdAt: "2026-05-15T09:11:00.000Z",
          title: "Session 11",
          content: "# Session 11",
        },
        {
          id: "session-20260515T091000000Z-6813e358",
          createdAt: "2026-05-15T09:10:00.000Z",
          title: "Session 10",
          content: "# Session 10",
        },
        {
          id: "session-20260515T090900000Z-18167ed0",
          createdAt: "2026-05-15T09:09:00.000Z",
          title: "Session 9",
          content: "# Session 9",
        },
        {
          id: "session-20260515T090800000Z-acf36b48",
          createdAt: "2026-05-15T09:08:00.000Z",
          title: "Session 8",
          content: "# Session 8",
        },
        {
          id: "session-20260515T090700000Z-948d73b4",
          createdAt: "2026-05-15T09:07:00.000Z",
          title: "Session 7",
          content: "# Session 7",
        },
        {
          id: "session-20260515T090600000Z-0ece3004",
          createdAt: "2026-05-15T09:06:00.000Z",
          title: "Session 6",
          content: "# Session 6",
        },
        {
          id: "session-20260515T090500000Z-7081d400",
          createdAt: "2026-05-15T09:05:00.000Z",
          title: "Session 5",
          content: "# Session 5",
        },
        {
          id: "session-20260515T090400000Z-93665028",
          createdAt: "2026-05-15T09:04:00.000Z",
          title: "Session 4",
          content: "# Session 4",
        },
        {
          id: "session-20260515T090300000Z-3887802c",
          createdAt: "2026-05-15T09:03:00.000Z",
          title: "Session 3",
          content: "# Session 3",
        },
        {
          id: "session-20260515T090200000Z-4acc98fc",
          createdAt: "2026-05-15T09:02:00.000Z",
          title: "Session 2",
          content: "# Session 2",
        },
      ],
    });
  });

  it("rejects malformed history imports with friendly errors", () => {
    expect(importSessionHistoryFromJson("{not json")).toEqual({
      ok: false,
      items: [],
      warning: "History import must be valid JSON.",
    });
    expect(importSessionHistoryFromJson(JSON.stringify({ schema: "wrong", version: 1, items: [] }))).toEqual({
      ok: false,
      items: [],
      warning: "History import uses an unsupported schema.",
    });
    expect(
      importSessionHistoryFromJson(
        JSON.stringify({
          schema: "story-dice-lab.session-history",
          version: 1,
          items: [{ id: "bad", createdAt: "not-a-date", title: "Bad", content: "# Bad" }],
        }),
      ),
    ).toEqual({
      ok: false,
      items: [],
      warning: "History import contains a malformed session entry.",
    });
  });

  it("replaces stored history on import without appending and stays safe when storage is unavailable", () => {
    const storage = new MemoryStorage();
    saveSessionSnapshotToHistory(storage, {
      title: "Existing",
      content: "# Existing",
      now: new Date("2026-05-15T08:00:00.000Z"),
    });
    const importJson = exportSessionHistoryJson([
      {
        id: "incoming-a",
        createdAt: "2026-05-15T09:00:00.000Z",
        title: "Imported",
        content: "# Imported",
      },
    ]);

    const result = replaceSessionHistoryFromJson(storage, importJson);

    expect(result).toEqual({
      ok: true,
      items: [
        {
          id: "session-20260515T090000000Z-5dd3dfa2",
          createdAt: "2026-05-15T09:00:00.000Z",
          title: "Imported",
          content: "# Imported",
        },
      ],
    });
    expect(loadSessionHistory(storage).items.map((item) => item.title)).toEqual(["Imported"]);
    expect(replaceSessionHistoryFromJson(new ThrowingStorage(), importJson)).toEqual({
      ok: false,
      items: [],
      warning: "Local session history is unavailable in this browser.",
    });
  });

  it("falls back cleanly when storage is unavailable", () => {
    const loadResult = loadSessionHistory(null);
    const saveResult = saveSessionSnapshotToHistory(new ThrowingStorage(), {
      title: "Blocked",
      content: "# Blocked",
      now: new Date("2026-05-15T09:00:00.000Z"),
    });

    expect(loadResult).toEqual({
      items: [],
      warning: "Local session history is unavailable in this browser.",
    });
    expect(saveResult).toEqual({
      ok: false,
      items: [],
      warning: "Local session history is unavailable in this browser.",
    });
  });

  it("formats a concise plain-text history list", () => {
    const items: SessionHistoryItem[] = [
      {
        id: "session-a",
        createdAt: "2026-05-15T09:05:00.000Z",
        title: "Share round",
        content: "# Snapshot two",
      },
      {
        id: "session-b",
        createdAt: "2026-05-15T09:00:00.000Z",
        title: "Opening sprint",
        content: "# Snapshot one",
      },
    ];

    expect(formatSessionHistoryList(items)).toBe(`Story Dice Lab session history

1. 2026-05-15T09:05:00.000Z - Share round
2. 2026-05-15T09:00:00.000Z - Opening sprint`);
  });

  it("renders accessible save, copy, import, export, and clear controls with recent saved snapshots", () => {
    const markup = formatSessionHistoryControls(
      [
        {
          id: "session-a",
          createdAt: "2026-05-15T09:05:00.000Z",
          title: "Share round",
          content: "# Snapshot two",
        },
      ],
      "Saved session snapshot.",
    );

    expect(markup).toContain('aria-labelledby="session-history-title"');
    expect(markup).toContain('id="save-session-history"');
    expect(markup).toContain("Save current snapshot");
    expect(markup).toContain('id="copy-session-history"');
    expect(markup).toContain("Copy history list");
    expect(markup).toContain('id="copy-session-history-json"');
    expect(markup).toContain("Copy history JSON");
    expect(markup).toContain('for="session-history-import-json"');
    expect(markup).toContain('id="session-history-import-json"');
    expect(markup).toContain('id="import-session-history"');
    expect(markup).toContain("Import history");
    expect(markup).toContain('id="clear-session-history"');
    expect(markup).toContain("Clear history");
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("Share round");
    expect(markup).toContain("2026-05-15T09:05:00.000Z");
  });
});
