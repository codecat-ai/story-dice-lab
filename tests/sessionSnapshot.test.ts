import { describe, expect, it } from "vitest";
import { formatSessionSnapshot } from "../src/sessionSnapshot";

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
});
