import { describe, expect, it } from "vitest";
import {
  formatPrintableSessionSnapshotHtml,
  formatSessionSnapshot,
  printSessionSnapshot,
} from "../src/sessionSnapshot";

const result = {
  seed: "snapshot seed",
  dice: {
    character: "runaway # archivist",
    want: "to return a borrowed name",
    setting: "abandoned\nclock tower",
    obstacle: "a deadline at sunrise",
    object: "brass compass",
    twist: "home has been following them",
  },
};

describe("session snapshot formatting", () => {
  it("formats a deterministic Markdown session snapshot with current dice and facilitator context", () => {
    expect(
      formatSessionSnapshot({
        title: "  Workshop #4\nFinal share  ",
        dateLabel: "2026-05-14 09:30",
        result,
        timer: {
          phaseLabel: "Phase 4 of 5",
          name: "Share",
          minutes: 5,
          action:
            "Check when brass compass or home has been following them changed a choice.",
        },
        preset: {
          name: "Middle-grade sprint",
          notes: "Use for opening scenes.\nPair before drafting.",
        },
        artifacts: [
          {
            label: "Agenda",
            content: "Workshop agenda\n\n1. Warm-up\n2. Draft\n3. Share",
          },
        ],
      }),
    ).toBe(`# Workshop \\#4 Final share

Date: 2026\\-05\\-14 09:30
Seed: snapshot seed

## Active dice

- Character: runaway \\# archivist
- Want: to return a borrowed name
- Setting: abandoned clock tower
- Obstacle: a deadline at sunrise
- Object: brass compass
- Twist: home has been following them

## Facilitator phase

- Phase: Phase 4 of 5
- Timer: Share, 5 minutes
- Action: Check when brass compass or home has been following them changed a choice\\.

## Preset notes

- Preset: Middle\\-grade sprint
- Notes: Use for opening scenes\\. Pair before drafting\\.

## Classroom artifacts

### Agenda

> Workshop agenda
> 1\\. Warm\\-up
> 2\\. Draft
> 3\\. Share`);
  });

  it("keeps optional notes and copied artifact excerpts bounded and paste-friendly", () => {
    const snapshot = formatSessionSnapshot({
      title: "###\n",
      dateLabel: "2026-05-14",
      result,
      timer: {
        phaseLabel: "Phase 1 of 5",
        name: "Warm-up",
        minutes: 3,
        action: "Check when the group has named one vivid image.",
      },
      preset: {
        name: "  ",
        notes: "   ",
      },
      artifacts: [
        {
          label: "Student excerpts\n## Draft",
          content: [
            "line 1",
            "line 2",
            "line 3",
            "line 4",
            "line 5",
            "line 6",
            "line 7",
          ].join("\n"),
        },
      ],
    });

    expect(snapshot).toContain("# Story Dice Lab session snapshot");
    expect(snapshot).toContain("- Preset: None");
    expect(snapshot).toContain("- Notes: None");
    expect(snapshot).toContain("### Student excerpts \\#\\# Draft");
    expect(snapshot).toContain("> line 6");
    expect(snapshot).toContain("> ...");
    expect(snapshot).not.toContain("line 7");
  });

  it("omits classroom artifacts when none are selected", () => {
    expect(
      formatSessionSnapshot({
        dateLabel: "2026-05-14",
        result,
        timer: {
          phaseLabel: "Phase 5 of 5",
          name: "Reflection",
          minutes: 2,
          action: "Check when each writer has one next revision question.",
        },
      }),
    ).not.toContain("## Classroom artifacts");
  });

  it("formats a compact printable session snapshot with dice, active timer phase, and artifact excerpts", () => {
    const html = formatPrintableSessionSnapshotHtml({
      title: "  Workshop #4\nFinal share  ",
      dateLabel: "2026-05-14 09:30",
      result,
      timer: {
        phaseLabel: "Phase 4 of 5",
        name: "Share",
        minutes: 5,
        action:
          "Check when brass compass or home has been following them changed a choice.",
      },
      preset: {
        name: "Middle-grade sprint",
        notes: "Use for opening scenes.\nPair before drafting.",
      },
      artifacts: [
        {
          label: "Agenda",
          content: "Workshop agenda\n\n1. Warm-up\n2. Draft\n3. Share",
        },
      ],
    });

    expect(html).toContain("<title>Workshop #4 Final share</title>");
    expect(html).toContain(
      '<article class="snapshot-print" aria-label="Compact printable session snapshot">',
    );
    expect(html).toContain("<h1>Workshop #4 Final share</h1>");
    expect(html).toContain("<dt>Date</dt><dd>2026-05-14 09:30</dd>");
    expect(html).toContain("<dt>Seed</dt><dd>snapshot seed</dd>");
    expect(html).toContain("<th scope=\"row\">Character</th><td>runaway # archivist</td>");
    expect(html).toContain("<th scope=\"row\">Setting</th><td>abandoned clock tower</td>");
    expect(html).toContain(
      "<dt>Active phase</dt><dd>Phase 4 of 5: Share, 5 minutes</dd>",
    );
    expect(html).toContain(
      "<dt>Action</dt><dd>Check when brass compass or home has been following them changed a choice.</dd>",
    );
    expect(html).toContain("<dt>Preset</dt><dd>Middle-grade sprint</dd>");
    expect(html).toContain("<dt>Preset notes</dt><dd>Use for opening scenes. Pair before drafting.</dd>");
    expect(html).toContain("<h2>Selected artifact excerpts</h2>");
    expect(html).toContain("<h3>Agenda</h3>");
    expect(html).toContain("<li>1. Warm-up</li>");
  });

  it("escapes and bounds user-provided printable snapshot content", () => {
    const html = formatPrintableSessionSnapshotHtml({
      title: "<script>alert(1)</script> Session",
      dateLabel: "2026-05-14 <img src=x>",
      result: {
        ...result,
        seed: "seed <b>bold</b>",
        dice: {
          ...result.dice,
          twist: "twist & turn",
        },
      },
      timer: {
        phaseLabel: "Phase <1>",
        name: "Warm-up & choose",
        minutes: 3,
        action: "Check <script>bad()</script> now.",
      },
      preset: {
        name: "Preset <A>",
        notes: "n".repeat(260),
      },
      artifacts: [
        {
          label: "Student <draft>",
          content: [
            "first <line>",
            "x".repeat(220),
            "line 3",
            "line 4",
            "line 5",
            "line 6",
            "line 7 should not print",
          ].join("\n"),
        },
      ],
    });

    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt; Session");
    expect(html).toContain("2026-05-14 &lt;img src=x&gt;");
    expect(html).toContain("seed &lt;b&gt;bold&lt;/b&gt;");
    expect(html).toContain("twist &amp; turn");
    expect(html).toContain("Preset &lt;A&gt;");
    expect(html).toContain("Student &lt;draft&gt;");
    expect(html).toContain("first &lt;line&gt;");
    expect(html).toContain("...");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("line 7 should not print");
  });

  it("writes the compact printable snapshot document to an injected print target and triggers print", () => {
    const calls: string[] = [];
    const writes: string[] = [];

    printSessionSnapshot(
      {
        document: {
          open: () => calls.push("open"),
          write: (html) => {
            calls.push("write");
            writes.push(html);
          },
          close: () => calls.push("close"),
        },
        focus: () => calls.push("focus"),
        print: () => calls.push("print"),
      },
      {
        dateLabel: "2026-05-14",
        result,
        timer: {
          phaseLabel: "Phase 1 of 5",
          name: "Warm-up",
          minutes: 3,
          action: "Check when the group has named one vivid image.",
        },
      },
    );

    expect(calls).toEqual(["open", "write", "close", "focus", "print"]);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain("<!doctype html>");
    expect(writes[0]).toContain("Compact printable session snapshot");
  });
});
