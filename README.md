# Story Dice Lab

[English](README.md) | [中文](README-zh.md) | [日本語](README-ja.md)

Story Dice Lab is a local-first browser app for rolling deterministic creative writing prompts.

## Problem and motivation

Writers, teachers, and tabletop facilitators often need quick prompts that are playful, reproducible, and easy to share without accounts or network calls.

## Features

- Six prompt dice: character, want, setting, obstacle, object, and twist.
- Seeded deterministic rolls for repeatable workshop prompts.
- Reroll all dice or reroll one die at a time.
- Lock dice so reroll-all preserves the strongest ideas.
- Copy a compact plain-text prompt.
- Copy a deterministic five-beat scene outline that uses all six dice for an opening image, desire, complication, turning point, and ending hook.
- Copy a deterministic printable workshop handout with the seed, all six dice, and three scene-building questions.
- Copy a deterministic facilitator agenda with editable title and total minutes, timed phases, and notes that connect dice categories to scene decisions.
- Copy facilitator-friendly timer cards for each agenda phase, scaled to the same total minutes and ready for live workshop checkoffs.
- Print facilitator timer-card layouts with dashed cut lines, using the agenda title and scaled phase minutes.
- Show an optional large-type facilitator timer display for live in-room use, derived from the same agenda phases and controlled with previous, next, and reset buttons.
- Copy deterministic classroom revision cards with an editable title and one card per die, each pairing the current value with a revision task and reflection question.
- Print classroom revision-card layouts with dashed cut lines, one card per die/category, using the same title, seed, and current roll.
- Copy deterministic small-group peer role cards with an editable critique-round title and facilitator-friendly roles that use the current dice.
- Print small-group peer role-card layouts with dashed cut lines for critique rounds.
- Copy a compact deterministic post-critique action plan with an editable title, exactly three prioritized next steps, and a closing revision commit line.
- Copy a Markdown prompt with escaped dice values and the same workshop questions.
- Print the current prompt as a workshop-friendly browser sheet with controls hidden.
- Copy shareable URL hashes that restore the seed and locked dice.
- Import a custom JSON word bank for the six dice categories and copy/export the normalized JSON.
- Save, load, and delete named local word-bank presets with optional notes in browser storage for different classes, genres, or workshop groups.
- Apply built-in classroom session templates for repeat workshops, prefilled with a seed, agenda title, total minutes, template word bank, and usage notes.
- Copy a local Markdown facilitator session snapshot that bundles the current dice, active timer phase, preset notes, and checked classroom artifact excerpts for post-workshop records.
- Print a compact browser sheet of the current facilitator session snapshot for paper workshop records.
- Save up to 10 recent local session snapshots in browser history with optional facilitator tags and archive labels, filter records by tag or label, search titles and snapshot Markdown text in browser-only UI state, view a saved snapshot detail panel for copy/print reuse without changing the current roll, copy a concise visible history list, copy portable visible history JSON, import validated history JSON from another browser, or clear the history.
- Use visible keyboard shortcuts for live facilitation: `r` rerolls unlocked dice, `l` toggles the focused die lock, `[` and `]` move timer phases, `c` copies the current prompt, and `?` shows or hides shortcut help.
- Accessible, keyboard-friendly controls.

## Installation

Story Dice Lab is published on GitHub only. It is not published to npm, so there are no verified `npm install -g` or `npx` commands.

```bash
git clone https://github.com/codecat-ai/story-dice-lab.git
cd story-dice-lab
npm ci
```

## Quick start

```bash
npm run dev
```

Open the local Vite URL shown in the terminal.

Press `?` or click **Show shortcuts** to display the live facilitation shortcut panel. Shortcuts are ignored while typing in form fields or when Ctrl, Meta, or Alt is pressed.

## Examples

Use the seed `moonlit workshop`, lock the setting, then reroll the other dice until the prompt fits your scene. Choose a classroom template and click **Apply template** to prefill a repeatable workshop seed, template word bank, agenda title, and total minutes; applying a template clears locks and restarts the live timer at phase 1. Click **Copy outline** to copy a five-beat scene outline, click **Copy handout** to copy a printable workshop sheet, set the agenda title and total minutes before clicking **Copy agenda** to copy a scene sprint agenda for a teacher or writing-group facilitator, use the large live timer display's **Previous**, **Reset**, and **Next** buttons when projecting the current phase, or press `[` and `]` to step phases from the keyboard. Press `r` to reroll unlocked dice, focus a die card or one of its controls and press `l` to toggle that die lock, press `c` to copy the current prompt, and press `?` to show or hide shortcut help. Click **Copy timer cards** to copy per-phase timer cards using the same agenda settings, click **Print timer-card layout** to print those phase cards with dashed cut lines, set the revision-card title before clicking **Copy revision cards** to copy six peer-feedback cards for a second writing pass, click **Print revision-card layout** to print one cut-out revision card for each die/category, set the peer role-card title before clicking **Copy peer role cards** to assign small-group critique jobs, click **Print peer role-card layout** to print cut-out role cards, set the action-plan title before clicking **Copy action plan** to copy three critique-backed next steps, check the artifact excerpts you want and click **Copy session snapshot** to capture a Markdown post-workshop record, click **Print session snapshot** to open a compact browser print sheet for the same current snapshot, enter optional comma- or newline-separated tags such as class, cohort, event, or genre and choose an optional **Archive label** such as classroom, event, draft, or assessment follow-up before clicking **Save current snapshot** to keep the current snapshot in local session history, choose **Filter saved snapshots by tag** or **Filter saved snapshots by archive label** and type in **Search saved snapshots** to show a focused saved set by title or snapshot Markdown text, click **View details** on a visible saved snapshot to review its escaped title, ISO time, tags, archive label, and full content, then use **Copy saved snapshot** or **Print saved snapshot** without replacing the current roll, click **Copy history list** to copy the visible newest-first saved snapshot list, click **Copy history JSON** to copy visible portable versioned JSON, paste compatible JSON into **Paste/import history JSON** and click **Import history** to replace this browser's saved history, click **Clear history** to remove saved snapshots from this browser, click **Copy Markdown** to copy a Markdown prompt for notes or issue threads, click **Print prompt sheet** to open the browser print flow for the current prompt, or click **Copy share link** to save or send a URL hash such as `#seed=moonlit+workshop&locked=setting`.

The outline preview includes the seed and five beats: opening image, desire, complication, turning point, and ending hook. Together the beats reuse the character, want, setting, obstacle, object, and twist from the current roll.

The agenda preview includes the seed, all six dice, five timed phases scaled to the selected total minutes, and facilitator notes that tie character/want, obstacle/setting, and object/twist into concrete scene choices.

The timer cards use the same title, seed, total minutes, and scaled phase durations as the agenda. The copied cards include a phase label, a concise facilitator prompt, and a checkbox/action line for running the sprint live. The print layout turns the same deterministic card data into a two-column sheet with dashed cut lines.

The live facilitator timer display uses the same agenda data as the copied and printed timer cards. It shows the current phase label, large phase name, minutes, facilitator prompt, and action check, with manual previous, reset, and next controls. It is intentionally step-based; no real-time countdown is required.

The revision cards include the custom title when provided, the seed, and six numbered cards. Character asks for agency, want raises stakes, setting adds sensory detail, obstacle escalates pressure, object requires concrete action, and twist follows through with consequence. The print layout turns the same deterministic card data into a two-column sheet with dashed cut lines for workshop cutting.

The peer role cards include the custom title when provided, the seed, and four small-group jobs: Connector, Detail Coach, Stakes Coach, and Twist Tracker. Each role uses the current dice so critique stays tied to the active prompt rather than generic feedback. The print layout turns the same deterministic card data into a two-column sheet with dashed cut lines.

The action plan includes the custom title when provided, the seed, three numbered next steps, and a commit line. The steps map peer-role feedback focus back to dice categories: character/want for Connector, setting/object for Detail Coach, and obstacle/twist for Stakes Coach.

The session snapshot is a paste-friendly Markdown record for facilitators after a live session. It includes a caller-supplied date label, current seed and dice, the active facilitator timer phase, current preset name and notes when present, and short excerpts from the checked classroom artifacts. User-provided fields are collapsed to single-line Markdown-safe text, and artifact excerpts are bounded so copied student or classroom output stays readable. The compact print view uses the same snapshot state, escapes user-provided content as HTML, bounds long notes and artifact lines, and writes a self-contained local browser print document.

Local session history stores the 10 most recent saved snapshots in this browser only. Saved items show newest first with ISO timestamps, concise titles, optional facilitator tags, optional archive labels, and a detail action. The detail panel renders a selected visible saved snapshot with escaped metadata and full snapshot content so older records can be copied or printed without replacing the active dice result. Tags are trimmed, split on commas or new lines, deduplicated case-insensitively while preserving the first spelling, capped at 8 tags, and bounded to short labels. Archive labels are limited to blank, classroom, event, draft, or assessment follow-up. Untagged or unlabeled legacy history loads with empty tags and no archive label. The tag and archive-label filters compose with the trimmed case-insensitive search box for title and snapshot Markdown text, and copied history lists or JSON exports reflect the currently visible set. The JSON export includes a schema and version marker, and import validates that wrapper plus each entry before replacing the browser's saved history. Imported entries are normalized through the same title, stable ID, tag, archive-label, newest-first, and max-10 rules used by regular saves.

To use a custom word bank, paste JSON with all six categories:

```json
{
  "character": ["curious pilot"],
  "want": ["to find dawn"],
  "setting": ["clock market"],
  "obstacle": ["a locked moon"],
  "object": ["silver key"],
  "twist": ["the map is alive"]
}
```

Click **Import word bank** to validate and normalize it. Click **Copy/export word bank** to copy the active normalized JSON.

To reuse a custom word bank later in the same browser, enter a preset name, optionally add preset notes such as age group, genre, or classroom context, and click **Save preset**. Names and notes are trimmed; names must be non-empty and can be reused to intentionally overwrite an existing preset. Choose a saved preset to show its notes, click **Load preset** to apply its word bank and notes while preserving locked dice, or click **Delete preset** to remove it without changing the current word bank.

## Configuration

No configuration is required. The app runs locally in the browser and does not call remote APIs. Built-in classroom templates are bundled in source and apply only local UI state. Session snapshots are formatted locally, copied through the browser clipboard, and printed through an injected local browser print document. Local session history stores recent snapshot text, normalized facilitator tags, and validated archive labels in versioned `localStorage`; search queries are browser-only UI state and do not change the storage schema. If storage is unavailable or corrupt, the app reports a safe status and continues without crashing. History JSON import/export is clipboard- and textarea-based, validates the `story-dice-lab.session-history` schema marker and version `1`, rejects arbitrary archive labels, and replaces only local browser history after validation. Custom word-bank JSON and named presets, including optional preset notes, are handled in the browser only. The live facilitator timer display is manually stepped and does not use background timing services. Presets also use versioned `localStorage`; if storage is unavailable or corrupt, the app ignores bad data safely and keeps import/export available. Notes are stored as preset metadata and are not added to exported word-bank JSON.

## Development

```bash
npm ci
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

## Testing

Behavior tests live in `tests/storyDice.test.ts`, `tests/sessionSnapshot.test.ts`, `tests/sessionHistory.test.ts`, `tests/classroomSessionTemplates.test.ts`, `tests/wordBankPresets.test.ts`, and `tests/keyboardShortcuts.test.ts`. They cover deterministic rolls, lock behavior, single-die rerolls, prompt formatting, five-beat scene outline export, workshop handout export, facilitator agenda export, agenda timer-card export and printable timer-card cut-line layout, large-type facilitator timer phase state and accessible display controls, classroom revision card export and printable revision-card cut-line layout with editable title controls, small-group peer role-card export and printable peer role-card cut-line layout with editable title controls, compact post-critique action-plan export with editable title controls, deterministic Markdown session snapshot formatting, compact printable session snapshot HTML with escaped and bounded user content, injected session snapshot print targeting, local session history ordering, max-10 trimming, facilitator tag normalization and filtering, archive-label normalization and filtering, title/content search filtering, visible-list and visible-JSON filtering, legacy untagged/unlabeled history loading, deterministic tagged and labeled history JSON export, validated history JSON import, import replacement behavior, corrupted/unavailable storage fallbacks, history tag/label/search/import/export/detail control markup, selected saved snapshot detail rendering, friendly empty detail states, time scaling and UI controls, Markdown prompt export, print-layout formatting, browser print triggering, classroom session template listing/application/control rendering, custom word-bank import/export, local word-bank preset storage with optional notes, and pure keyboard shortcut mapping plus typing-field suppression.

## Roadmap

- Add user-importable template packs for departments or writing centers to share local classroom workshop sets.
- Add saved-history print batch layouts for the currently visible filtered set.
- Add an optional browser-only backup reminder for facilitators before clearing local records.

## Contributing

Issues and small pull requests are welcome. Please keep changes local-first, accessible, and covered by behavior tests.

## License

MIT. See `LICENSE`.

## Maintenance note

This project is maintained with AI assistance, with tests and CI used to verify changes.
