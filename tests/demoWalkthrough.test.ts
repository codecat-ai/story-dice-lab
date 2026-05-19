import { describe, expect, it } from "vitest";
import {
  buildDemoWalkthrough,
  formatDemoWalkthroughMarkdown,
  formatDemoWalkthroughSection,
} from "../src/demoWalkthrough";
import { parseTemplatePackJson } from "../src/templatePacks";
import { importSessionHistoryFromJson } from "../src/sessionHistory";

describe("demo walkthrough", () => {
  it("returns deterministic classroom-loop demo content with a schema-compatible template pack", () => {
    const first = buildDemoWalkthrough();
    const second = buildDemoWalkthrough();

    expect(first).toEqual(second);
    expect(first.title).toBe("Story Dice Lab classroom loop demo");
    expect(first.audienceNote).toContain("teachers");
    expect(first.privacyNote).toMatch(/no account/i);
    expect(first.privacyNote).toMatch(/network/i);
    expect(first.steps).toHaveLength(6);

    const parsedPack = parseTemplatePackJson(first.templatePackJson);
    expect(parsedPack.ok).toBe(true);
    if (!parsedPack.ok) throw new Error(parsedPack.error);

    expect(parsedPack.pack.title).toBe("Classroom Loop Demo Pack");
    expect(parsedPack.pack.templates.map((template) => template.id)).toEqual(["demo-opening-circle"]);
    expect(parsedPack.pack.wordBankPresets.map((preset) => preset.name)).toEqual(["Demo circle word bank"]);
  });

  it("includes a concrete saved-history checkpoint that imports through the existing validator", () => {
    const demo = buildDemoWalkthrough();
    const imported = importSessionHistoryFromJson(demo.sessionHistoryJson);

    expect(imported.ok).toBe(true);
    if (!imported.ok) throw new Error(imported.warning);

    expect(imported.items).toEqual([
      {
        id: "session-20260518T090000000Z-aa2e10a3",
        createdAt: "2026-05-18T09:00:00.000Z",
        title: "Demo Opening Circle checkpoint",
        content: demo.sessionSnapshotMarkdown,
        tags: ["demo", "classroom-loop"],
        archiveLabel: "classroom",
      },
    ]);
    expect(demo.sessionSnapshotMarkdown).toContain("## Classroom artifacts");
    expect(demo.sessionSnapshotMarkdown).toContain("Facilitator agenda");
  });

  it("formats a paste-ready walkthrough that references imported packs, saved histories, and facilitator exports", () => {
    const markdown = formatDemoWalkthroughMarkdown(buildDemoWalkthrough());

    expect(markdown).toContain("# Story Dice Lab classroom loop demo");
    expect(markdown).toContain("No account or network access is required");
    expect(markdown).toMatch(/import(ed)? template pack/i);
    expect(markdown).toMatch(/apply .*template/i);
    expect(markdown).toMatch(/save .*history/i);
    expect(markdown).toMatch(/copy .*facilitator/i);
    expect(markdown).toMatch(/print .*facilitator/i);
    expect(markdown).toContain("```json");
    expect(markdown).toContain("```markdown");
    expect(formatDemoWalkthroughMarkdown(buildDemoWalkthrough())).toBe(markdown);
  });

  it("escapes generated HTML and normalizes copied text in the demo section", () => {
    const demo = {
      ...buildDemoWalkthrough(),
      title: "Demo <script>alert(1)</script>",
      audienceNote: " Teachers & facilitators\n use <local> mode. ",
      privacyNote: "No account <required> & no network.",
      steps: [
        "Import <pack>",
        "Apply & save",
        "Copy/print facilitator artifacts",
        "Save history",
        "Review exports",
      ],
    };
    const html = formatDemoWalkthroughSection(demo);

    expect(html).toContain("Demo &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("Teachers &amp; facilitators use &lt;local&gt; mode.");
    expect(html).toContain("No account &lt;required&gt; &amp; no network.");
    expect(html).toContain("Import &lt;pack&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain('<textarea id="demo-template-pack-json"');
    expect(html).toContain('<textarea id="demo-walkthrough-markdown"');
    expect(html).toContain('<button id="copy-demo-template-pack" type="button">Copy demo pack</button>');
    expect(html).toContain('<button id="copy-demo-walkthrough" type="button">Copy walkthrough</button>');
  });
});
