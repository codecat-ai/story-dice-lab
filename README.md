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
- Copy deterministic classroom revision cards with an editable title and one card per die, each pairing the current value with a revision task and reflection question.
- Print classroom revision-card layouts with dashed cut lines, one card per die/category, using the same title, seed, and current roll.
- Copy a Markdown prompt with escaped dice values and the same workshop questions.
- Print the current prompt as a workshop-friendly browser sheet with controls hidden.
- Copy shareable URL hashes that restore the seed and locked dice.
- Import a custom JSON word bank for the six dice categories and copy/export the normalized JSON.
- Save, load, and delete named local word-bank presets in browser storage for different classes, genres, or workshop groups.
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

## Examples

Use the seed `moonlit workshop`, lock the setting, then reroll the other dice until the prompt fits your scene. Click **Copy outline** to copy a five-beat scene outline, click **Copy handout** to copy a printable workshop sheet, set the agenda title and total minutes before clicking **Copy agenda** to copy a scene sprint agenda for a teacher or writing-group facilitator, click **Copy timer cards** to copy per-phase timer cards using the same agenda settings, click **Print timer-card layout** to print those phase cards with dashed cut lines, set the revision-card title before clicking **Copy revision cards** to copy six peer-feedback cards for a second writing pass, click **Print revision-card layout** to print one cut-out revision card for each die/category, click **Copy Markdown** to copy a Markdown prompt for notes or issue threads, click **Print prompt sheet** to open the browser print flow for the current prompt, or click **Copy share link** to save or send a URL hash such as `#seed=moonlit+workshop&locked=setting`.

The outline preview includes the seed and five beats: opening image, desire, complication, turning point, and ending hook. Together the beats reuse the character, want, setting, obstacle, object, and twist from the current roll.

The agenda preview includes the seed, all six dice, five timed phases scaled to the selected total minutes, and facilitator notes that tie character/want, obstacle/setting, and object/twist into concrete scene choices.

The timer cards use the same title, seed, total minutes, and scaled phase durations as the agenda. The copied cards include a phase label, a concise facilitator prompt, and a checkbox/action line for running the sprint live. The print layout turns the same deterministic card data into a two-column sheet with dashed cut lines.

The revision cards include the custom title when provided, the seed, and six numbered cards. Character asks for agency, want raises stakes, setting adds sensory detail, obstacle escalates pressure, object requires concrete action, and twist follows through with consequence. The print layout turns the same deterministic card data into a two-column sheet with dashed cut lines for workshop cutting.

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

To reuse a custom word bank later in the same browser, enter a preset name and click **Save preset**. Names are trimmed, must be non-empty, and can be reused to intentionally overwrite an existing preset. Choose a saved preset and click **Load preset** to apply it while preserving locked dice, or click **Delete preset** to remove it without changing the current word bank.

## Configuration

No configuration is required. The app runs locally in the browser and does not call remote APIs. Custom word-bank JSON and named presets are handled in the browser only. Presets use versioned `localStorage`; if storage is unavailable or corrupt, the app ignores bad data safely and keeps import/export available.

## Development

```bash
npm ci
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

## Testing

Behavior tests live in `tests/storyDice.test.ts` and `tests/wordBankPresets.test.ts`. They cover deterministic rolls, lock behavior, single-die rerolls, prompt formatting, five-beat scene outline export, workshop handout export, facilitator agenda export, agenda timer-card export and printable timer-card cut-line layout, classroom revision card export and printable revision-card cut-line layout with editable title controls, time scaling and UI controls, Markdown prompt export, print-layout formatting, browser print triggering, custom word-bank import/export, and local word-bank preset storage.

## Roadmap

- Add optional preset notes so facilitators can document age group, genre, or classroom context.
- Add optional large-type facilitator timer display for live in-room use.
- Add printable small-group role cards for peer critique rounds.

## Contributing

Issues and small pull requests are welcome. Please keep changes local-first, accessible, and covered by behavior tests.

## License

MIT. See `LICENSE`.

## Maintenance note

This project is maintained with AI assistance, with tests and CI used to verify changes.
