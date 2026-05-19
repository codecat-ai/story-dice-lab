# Story Dice Lab Roadmap

Maturity: `maintenance`

Planned cadence: maintenance/growth as needed for bug reports, browser compatibility, and validated classroom adoption signals. The local-first classroom facilitation loop now has a tested demo walkthrough, so routine feature cadence is lowered.

## Now

- Keep imported classroom template packs persistent, validated, and safe when browser storage is missing or corrupt.
- Keep destructive local actions guarded by tested browser-only backup reminders.
- Preserve truthful source-checkout-only usage docs until there is an explicitly approved package or hosted release.
- Prioritize user-facing classroom reliability over additional novelty controls.

## Next

- Consider optional combined local export bundles for session history, word-bank presets, and imported template packs with clear privacy wording.
- Add a compact facilitator checklist for verifying local exports before clearing classroom data.

## Later

- Explore lightweight accessibility/usability polish for workshop projection and keyboard-only facilitation.

## Maintenance triggers

- Open bug reports, failing `main` CI, broken local persistence, misleading install/run documentation, or storage-schema migration issues.
- Browser compatibility changes that affect clipboard, print, or localStorage behavior.

## Cadence review notes

- The tested demo walkthrough completed the main classroom-loop item. Lower routine cadence to `maintenance`; only return to growth if users ask for classroom export bundles, browser compatibility breaks, or adoption signals justify a next phase.

## Completion-review rule

Status: reflection prompts and the tested demo walkthrough are complete; the classroom-loop roadmap is ready for lower-frequency maintenance.

Before adding more small features after the current classroom workflow items are complete, either define a next phase based on adoption/user value/quality gaps or keep the project on maintenance and shift routine capacity elsewhere.
