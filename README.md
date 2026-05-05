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
- Copy a deterministic printable workshop handout with the seed, all six dice, and three scene-building questions.
- Copy shareable URL hashes that restore the seed and locked dice.
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

Use the seed `moonlit workshop`, lock the setting, then reroll the other dice until the prompt fits your scene. Click **Copy handout** to copy a printable workshop sheet, or click **Copy share link** to save or send a URL hash such as `#seed=moonlit+workshop&locked=setting`.

## Configuration

No configuration is required. The app runs locally in the browser and does not call remote APIs.

## Development

```bash
npm ci
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

## Testing

Behavior tests live in `tests/storyDice.test.ts` and cover deterministic rolls, lock behavior, single-die rerolls, prompt formatting, and workshop handout export.

## Roadmap

- Workshop-friendly print layout.
- Optional custom word-bank import/export.

## Contributing

Issues and small pull requests are welcome. Please keep changes local-first, accessible, and covered by behavior tests.

## License

MIT. See `LICENSE`.

## Maintenance note

This project is maintained with AI assistance, with tests and CI used to verify changes.
