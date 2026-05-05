# Clean-room brief: story-dice-lab

Category: creative coding / local-first writing productivity web app.

Target users: writers, teachers, tabletop facilitators, and creative teams who want quick, remixable prompts without accounts or network calls.

Problem: many prompt generators are opaque, online-only, or not reproducible. Users need a playful local-first tool where a seed generates the same set of story dice and where prompts can be copied for workshops.

Non-goals: no AI text generation, no accounts, no remote APIs, no copyrighted word lists copied from other games, no package registry publication.

MVP features:
- Browser app built with Vite + TypeScript.
- Deterministic prompt generation from a seed string.
- Six story dice categories: character, want, setting, obstacle, object, twist.
- Reroll all and reroll individual die controls.
- Lock individual dice so reroll-all keeps them unchanged.
- Export/copy a compact prompt text.
- Accessible UI with keyboard-friendly buttons and visible labels.

Expected API behavior:
- Pure functions in src/storyDice.ts for hashSeed, rollDice(seed, locked?), rerollDie(result, category, seed), formatPrompt(result).
- Same seed yields same categories and text.
- Locked dice remain stable across rerolls.

Tests:
- deterministic seed behavior
- different seed usually changes at least one die
- lock behavior preserves selected dice during reroll-all
- rerolling one die changes only that category when possible
- prompt formatting includes all categories

Structure:
- src/storyDice.ts, src/main.ts, src/styles.css
- tests/storyDice.test.ts
- README.md, README-zh.md, README-ja.md, LICENSE, CHANGELOG.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md
- .github workflows and templates

CI: npm ci; npm run lint; npm run typecheck; npm test -- --run; npm run build. Use Node 24 actions opt-in.

Publication: GitHub only. Do not document npm/npx install commands.
