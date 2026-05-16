import { describe, expect, it } from "vitest";
import {
  archiveLabels,
  exportSessionHistoryJson,
  filterSessionHistory,
  filterSessionHistoryByArchiveLabel,
  filterSessionHistoryByTag,
  formatArchiveLabel,
  formatSessionHistoryControls,
  formatSessionHistoryDetailPanel,
  formatSessionHistoryList,
  importSessionHistoryFromJson,
  loadSessionHistory,
  normalizeSessionHistoryArchiveLabel,
  normalizeSessionHistoryTags,
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
  it("normalizes the fixed optional archive label model", () => {
    expect(archiveLabels).toEqual(["classroom", "event", "draft", "assessment-follow-up"]);
    expect(normalizeSessionHistoryArchiveLabel(undefined)).toBe("");
    expect(normalizeSessionHistoryArchiveLabel("")).toBe("");
    expect(normalizeSessionHistoryArchiveLabel("   ")).toBe("");
    expect(normalizeSessionHistoryArchiveLabel("Classroom")).toBe("classroom");
    expect(normalizeSessionHistoryArchiveLabel(" assessment-follow-up ")).toBe("assessment-follow-up");
    expect(normalizeSessionHistoryArchiveLabel("field-trip")).toBeNull();
    expect(normalizeSessionHistoryArchiveLabel(["classroom"])).toBeNull();
    expect(formatArchiveLabel("assessment-follow-up")).toBe("Assessment follow-up");
    expect(formatArchiveLabel("")).toBe("No archive label");
  });

  it("normalizes facilitator tags from comma and newline text with bounded unique values", () => {
    expect(
      normalizeSessionHistoryTags(
        [
          " Class 4A, cohort spring ",
          "event night\nclass 4a\n",
          "Genre Lab",
          "   ",
          "Very long facilitator tag that should be bounded",
          "Event Night",
          "one,two,three,four",
        ],
      ),
    ).toEqual([
      "Class 4A",
      "cohort spring",
      "event night",
      "Genre Lab",
      "Very long facilitator tag that",
      "one",
      "two",
      "three",
    ]);
  });

  it("saves snapshots newest-first with stable ids and ISO timestamps", () => {
    const storage = new MemoryStorage();

    const first = saveSessionSnapshotToHistory(storage, {
      title: "Opening sprint",
      content: "# Snapshot one",
      tags: "Class 4A, cohort spring",
      archiveLabel: "classroom",
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
        tags: [],
        archiveLabel: "",
      },
      {
        id: "session-20260515T090000000Z-07c0315e",
        createdAt: "2026-05-15T09:00:00.000Z",
        title: "Opening sprint",
        content: "# Snapshot one",
        tags: ["Class 4A", "cohort spring"],
        archiveLabel: "classroom",
      },
    ]);
  });

  it("loads legacy untagged and unlabeled stored snapshots with empty tags and no archive label", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      sessionHistoryStorageKey,
      JSON.stringify([
        {
          id: "legacy-session",
          createdAt: "2026-05-15T09:00:00.000Z",
          title: "Legacy",
          content: "# Legacy",
        },
      ]),
    );

    expect(loadSessionHistory(storage).items).toEqual([
      {
        id: "legacy-session",
        createdAt: "2026-05-15T09:00:00.000Z",
        title: "Legacy",
        content: "# Legacy",
        tags: [],
        archiveLabel: "",
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
        tags: ["Class 4A", "Festival"],
        archiveLabel: "event",
      },
      {
        id: "session-b",
        createdAt: "2026-05-15T09:00:00.000Z",
        title: "Opening sprint",
        content: "# Snapshot one",
        tags: [],
        archiveLabel: "",
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
      "content": "# Snapshot two",
      "tags": [
        "Class 4A",
        "Festival"
      ],
      "archiveLabel": "event"
    },
    {
      "id": "session-b",
      "createdAt": "2026-05-15T09:00:00.000Z",
      "title": "Opening sprint",
      "content": "# Snapshot one",
      "tags": [],
      "archiveLabel": ""
    }
  ]
}`);
  });

  it("imports and replaces history with validated normalized tags and archive labels", () => {
    const storage = new MemoryStorage();
    const importJson = JSON.stringify({
      schema: "story-dice-lab.session-history",
      version: 1,
      items: [
        {
          id: "incoming-a",
          createdAt: "2026-05-15T09:00:00.000Z",
          title: "Imported",
          content: "# Imported",
          tags: [" Class 4A ", "class 4a", "Event Night\nfestival", "", "x".repeat(40)],
          archiveLabel: " Assessment-Follow-Up ",
        },
      ],
    });

    const result = replaceSessionHistoryFromJson(storage, importJson);

    expect(result).toEqual({
      ok: true,
      items: [
        {
          id: "session-20260515T090000000Z-5dd3dfa2",
          createdAt: "2026-05-15T09:00:00.000Z",
          title: "Imported",
          content: "# Imported",
          tags: ["Class 4A", "Event Night", "festival", "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"],
          archiveLabel: "assessment-follow-up",
        },
      ],
    });
    expect(loadSessionHistory(storage).items[0]?.tags).toEqual([
      "Class 4A",
      "Event Night",
      "festival",
      "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    ]);
    expect(loadSessionHistory(storage).items[0]?.archiveLabel).toBe("assessment-follow-up");
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
          tags: [],
          archiveLabel: "",
        },
        {
          id: "session-20260515T091000000Z-6813e358",
          createdAt: "2026-05-15T09:10:00.000Z",
          title: "Session 10",
          content: "# Session 10",
          tags: [],
          archiveLabel: "",
        },
        {
          id: "session-20260515T090900000Z-18167ed0",
          createdAt: "2026-05-15T09:09:00.000Z",
          title: "Session 9",
          content: "# Session 9",
          tags: [],
          archiveLabel: "",
        },
        {
          id: "session-20260515T090800000Z-acf36b48",
          createdAt: "2026-05-15T09:08:00.000Z",
          title: "Session 8",
          content: "# Session 8",
          tags: [],
          archiveLabel: "",
        },
        {
          id: "session-20260515T090700000Z-948d73b4",
          createdAt: "2026-05-15T09:07:00.000Z",
          title: "Session 7",
          content: "# Session 7",
          tags: [],
          archiveLabel: "",
        },
        {
          id: "session-20260515T090600000Z-0ece3004",
          createdAt: "2026-05-15T09:06:00.000Z",
          title: "Session 6",
          content: "# Session 6",
          tags: [],
          archiveLabel: "",
        },
        {
          id: "session-20260515T090500000Z-7081d400",
          createdAt: "2026-05-15T09:05:00.000Z",
          title: "Session 5",
          content: "# Session 5",
          tags: [],
          archiveLabel: "",
        },
        {
          id: "session-20260515T090400000Z-93665028",
          createdAt: "2026-05-15T09:04:00.000Z",
          title: "Session 4",
          content: "# Session 4",
          tags: [],
          archiveLabel: "",
        },
        {
          id: "session-20260515T090300000Z-3887802c",
          createdAt: "2026-05-15T09:03:00.000Z",
          title: "Session 3",
          content: "# Session 3",
          tags: [],
          archiveLabel: "",
        },
        {
          id: "session-20260515T090200000Z-4acc98fc",
          createdAt: "2026-05-15T09:02:00.000Z",
          title: "Session 2",
          content: "# Session 2",
          tags: [],
          archiveLabel: "",
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
    expect(
      importSessionHistoryFromJson(
        JSON.stringify({
          schema: "story-dice-lab.session-history",
          version: 1,
          items: [
            {
              id: "bad-label",
              createdAt: "2026-05-15T09:00:00.000Z",
              title: "Bad label",
              content: "# Bad label",
              tags: [],
              archiveLabel: "conference",
            },
          ],
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
        tags: [],
        archiveLabel: "draft",
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
          tags: [],
          archiveLabel: "draft",
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
        tags: ["Class 4A", "Festival"],
        archiveLabel: "classroom",
      },
      {
        id: "session-b",
        createdAt: "2026-05-15T09:00:00.000Z",
        title: "Opening sprint",
        content: "# Snapshot one",
        tags: ["Cohort Spring"],
        archiveLabel: "event",
      },
    ];

    expect(formatSessionHistoryList(items)).toBe(`Story Dice Lab session history

1. 2026-05-15T09:05:00.000Z - Share round [Class 4A, Festival] (Classroom)
2. 2026-05-15T09:00:00.000Z - Opening sprint [Cohort Spring] (Event)`);
    expect(formatSessionHistoryList(filterSessionHistory(items, { tag: "class 4a", archiveLabel: "classroom" }))).toBe(`Story Dice Lab session history

1. 2026-05-15T09:05:00.000Z - Share round [Class 4A, Festival] (Classroom)`);
    expect(filterSessionHistoryByArchiveLabel(items, "event").map((item) => item.title)).toEqual(["Opening sprint"]);
    expect(filterSessionHistoryByTag(items, "missing")).toEqual([]);
  });

  it("renders accessible save, copy, import, export, and clear controls with recent saved snapshots", () => {
    const markup = formatSessionHistoryControls(
      [
        {
          id: "session-a",
          createdAt: "2026-05-15T09:05:00.000Z",
          title: "Share round",
          content: "# Snapshot two",
          tags: ["Class 4A", "Festival"],
          archiveLabel: "assessment-follow-up",
        },
      ],
      "Saved session snapshot.",
      "",
      "class 4a",
      "draft",
      "",
      "assessment-follow-up",
      "session-a",
    );

    expect(markup).toContain('aria-labelledby="session-history-title"');
    expect(markup).toContain('id="save-session-history"');
    expect(markup).toContain("Save current snapshot");
    expect(markup).toContain('id="copy-session-history"');
    expect(markup).toContain("Copy history list");
    expect(markup).toContain('id="copy-session-history-json"');
    expect(markup).toContain("Copy history JSON");
    expect(markup).toContain('for="session-history-tags"');
    expect(markup).toContain('id="session-history-tags"');
    expect(markup).toContain("Snapshot tags");
    expect(markup).toContain('for="session-history-archive-label"');
    expect(markup).toContain('id="session-history-archive-label"');
    expect(markup).toContain("Archive label");
    expect(markup).toContain('value="draft" selected');
    expect(markup).toContain('for="session-history-tag-filter"');
    expect(markup).toContain('id="session-history-tag-filter"');
    expect(markup).toContain("Filter saved snapshots by tag");
    expect(markup).toContain("All saved snapshots");
    expect(markup).toContain('for="session-history-archive-filter"');
    expect(markup).toContain('id="session-history-archive-filter"');
    expect(markup).toContain("Filter saved snapshots by archive label");
    expect(markup).toContain("All archive labels");
    expect(markup).toContain('value="assessment-follow-up" selected');
    expect(markup).toContain('value="class 4a"');
    expect(markup).toContain('for="session-history-import-json"');
    expect(markup).toContain('id="session-history-import-json"');
    expect(markup).toContain('id="import-session-history"');
    expect(markup).toContain("Import history");
    expect(markup).toContain('id="clear-session-history"');
    expect(markup).toContain("Clear history");
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("Share round");
    expect(markup).toContain("Class 4A");
    expect(markup).toContain("Festival");
    expect(markup).toContain("Assessment follow-up");
    expect(markup).toContain("2026-05-15T09:05:00.000Z");
    expect(markup).toContain('data-session-history-detail-id="session-a"');
    expect(markup).toContain("View details");
    expect(markup).toContain('aria-controls="session-history-detail-panel"');
    expect(markup).toContain('id="session-history-detail-panel"');
    expect(markup).toContain('id="copy-session-history-detail-session-a"');
    expect(markup).toContain('id="print-session-history-detail-session-a"');
    expect(markup).toContain("# Snapshot two");
  });

  it("renders an escaped selected saved snapshot detail panel with keyed copy and print controls", () => {
    const markup = formatSessionHistoryDetailPanel([
      {
        id: "session-a",
        createdAt: "2026-05-15T09:05:00.000Z",
        title: 'Share <round> "A"',
        content: "# Snapshot <two>\nUse & revise.",
        tags: ["Class <4A>", "Festival"],
        archiveLabel: "draft",
      },
    ], "session-a");

    expect(markup).toContain('id="session-history-detail-panel"');
    expect(markup).toContain('aria-labelledby="session-history-detail-title-session-a"');
    expect(markup).toContain('Share &lt;round&gt; &quot;A&quot;');
    expect(markup).toContain('datetime="2026-05-15T09:05:00.000Z"');
    expect(markup).toContain("Class &lt;4A&gt;");
    expect(markup).toContain("Festival");
    expect(markup).toContain("Draft");
    expect(markup).toContain("# Snapshot &lt;two&gt;\nUse &amp; revise.");
    expect(markup).toContain('id="copy-session-history-detail-session-a"');
    expect(markup).toContain('data-session-history-detail-copy="session-a"');
    expect(markup).toContain('id="print-session-history-detail-session-a"');
    expect(markup).toContain('data-session-history-detail-print="session-a"');
  });

  it("renders a friendly empty detail state when no selected snapshot is visible", () => {
    expect(formatSessionHistoryDetailPanel([], "session-a")).toContain(
      "Select a visible saved snapshot to review, copy, or print it without changing the current roll.",
    );
    expect(
      formatSessionHistoryDetailPanel(
        [
          {
            id: "session-a",
            createdAt: "2026-05-15T09:05:00.000Z",
            title: "Share round",
            content: "# Snapshot two",
            tags: [],
            archiveLabel: "",
          },
        ],
        "missing-session",
      ),
    ).toContain("That saved snapshot is not visible with the current history filter.");
  });
});
