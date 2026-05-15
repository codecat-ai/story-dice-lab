import { describe, expect, it } from "vitest";
import {
  formatSessionHistoryControls,
  formatSessionHistoryList,
  loadSessionHistory,
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

  it("renders accessible save, copy, and clear controls with recent saved snapshots", () => {
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
    expect(markup).toContain('id="clear-session-history"');
    expect(markup).toContain("Clear history");
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("Share round");
    expect(markup).toContain("2026-05-15T09:05:00.000Z");
  });
});
