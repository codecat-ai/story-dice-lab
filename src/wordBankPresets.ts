import { normalizeWordBankJson, type StoryDiceWordBank } from './storyDice';

export const wordBankPresetStorageKey = 'story-dice-lab:word-bank-presets:v1';
export const maxWordBankPresetNameLength = 64;

export type WordBankPreset = {
  name: string;
  notes: string;
  wordBank: StoryDiceWordBank;
};

export type SaveWordBankPresetResult =
  | { ok: true; name: string; overwritten: boolean }
  | { ok: false; reason: string };

export type LoadWordBankPresetResult =
  | { ok: true; name: string; notes: string; wordBank: StoryDiceWordBank }
  | { ok: false; reason: string };

export type DeleteWordBankPresetResult =
  | { ok: true; name: string }
  | { ok: false; reason: string };

type StoredPresets = {
  version: 1;
  presets: unknown[];
};

type ReadPresetsResult = {
  presets: WordBankPreset[];
  storageAvailable: boolean;
};

export function listWordBankPresets(storage: Storage): WordBankPreset[] {
  return readPresets(storage).presets;
}

export function saveWordBankPreset(
  storage: Storage,
  name: string,
  wordBank: StoryDiceWordBank,
  notes = '',
): SaveWordBankPresetResult {
  const normalizedName = normalizePresetName(name);
  if (!normalizedName.ok) return normalizedName;

  const readResult = readPresets(storage);
  if (!readResult.storageAvailable) {
    return { ok: false, reason: 'Local storage is unavailable.' };
  }

  const normalizedWordBank = normalizeWordBankJson(wordBank);
  const existingIndex = readResult.presets.findIndex((preset) => preset.name === normalizedName.name);
  const nextPreset = { name: normalizedName.name, notes: normalizePresetNotes(notes), wordBank: normalizedWordBank };
  const presets =
    existingIndex >= 0
      ? readResult.presets.flatMap((preset, index) => {
          if (preset.name !== normalizedName.name) return [preset];
          return index === existingIndex ? [nextPreset] : [];
        })
      : [...readResult.presets, nextPreset];

  if (!writePresets(storage, presets)) {
    return { ok: false, reason: 'Local storage is unavailable.' };
  }

  return { ok: true, name: normalizedName.name, overwritten: existingIndex >= 0 };
}

export function loadWordBankPreset(storage: Storage, name: string): LoadWordBankPresetResult {
  const normalizedName = normalizePresetName(name);
  if (!normalizedName.ok) return normalizedName;

  const preset = readPresets(storage).presets.find((candidate) => candidate.name === normalizedName.name);
  if (!preset) return { ok: false, reason: 'Preset not found.' };

  return { ok: true, name: preset.name, notes: preset.notes, wordBank: preset.wordBank };
}

export function deleteWordBankPreset(storage: Storage, name: string): DeleteWordBankPresetResult {
  const normalizedName = normalizePresetName(name);
  if (!normalizedName.ok) return normalizedName;

  const readResult = readPresets(storage);
  if (!readResult.storageAvailable) {
    return { ok: false, reason: 'Local storage is unavailable.' };
  }

  const presets = readResult.presets.filter((preset) => preset.name !== normalizedName.name);
  if (presets.length === readResult.presets.length) {
    return { ok: false, reason: 'Preset not found.' };
  }

  if (!writePresets(storage, presets)) {
    return { ok: false, reason: 'Local storage is unavailable.' };
  }

  return { ok: true, name: normalizedName.name };
}

export function formatWordBankPresetControls(
  presets: WordBankPreset[],
  options: { currentName?: string; currentNote?: string; selectedName?: string } = {},
): string {
  const hasPresets = presets.length > 0;
  const disabled = hasPresets ? '' : ' disabled';
  const optionHtml = presets
    .map((preset) => {
      const selected = preset.name === options.selectedName ? ' selected' : '';
      return `<option value="${escapeHtml(preset.name)}" data-notes="${escapeHtml(preset.notes)}"${selected}>${escapeHtml(preset.name)}</option>`;
    })
    .join('');

  return `<div class="preset-controls" aria-labelledby="preset-controls-title">
    <h3 id="preset-controls-title">Local presets</h3>
    <p id="preset-help">Save named custom word banks in this browser for reuse across classes or genres.</p>
    <div class="preset-fields">
      <div>
        <label class="preset-field" for="preset-name">Preset name</label>
        <input id="preset-name" maxlength="${maxWordBankPresetNameLength}" value="${escapeHtml(options.currentName ?? '')}" aria-describedby="preset-help" />
      </div>
      <div>
        <label class="preset-field" for="preset-notes">Preset notes</label>
        <textarea id="preset-notes" rows="3" aria-describedby="preset-help">${escapeHtml(options.currentNote ?? '')}</textarea>
      </div>
      <button id="save-preset" type="button">Save preset</button>
      <div>
        <label class="preset-field" for="preset-select">Saved preset</label>
        <select id="preset-select" aria-describedby="preset-help"${disabled}>
          ${optionHtml}
        </select>
      </div>
      <button id="load-preset" type="button"${disabled}>Load preset</button>
      <button id="delete-preset" type="button"${disabled}>Delete preset</button>
    </div>
  </div>`;
}

function normalizePresetName(name: string): { ok: true; name: string } | { ok: false; reason: string } {
  const normalizedName = name.trim();
  if (!normalizedName) {
    return { ok: false, reason: 'Preset name is required.' };
  }
  if (normalizedName.length > maxWordBankPresetNameLength) {
    return { ok: false, reason: `Preset name must be ${maxWordBankPresetNameLength} characters or fewer.` };
  }

  return { ok: true, name: normalizedName };
}

function normalizePresetNotes(notes: string): string {
  return notes.trim();
}

function readPresets(storage: Storage): ReadPresetsResult {
  let source: string | null;
  try {
    source = storage.getItem(wordBankPresetStorageKey);
  } catch {
    return { presets: [], storageAvailable: false };
  }

  if (!source) {
    return { presets: [], storageAvailable: true };
  }

  try {
    const parsed = JSON.parse(source) as unknown;
    if (!isStoredPresets(parsed)) {
      return { presets: [], storageAvailable: true };
    }

    return {
      presets: parsed.presets.flatMap((preset) => normalizeStoredPreset(preset)),
      storageAvailable: true,
    };
  } catch {
    return { presets: [], storageAvailable: true };
  }
}

function writePresets(storage: Storage, presets: WordBankPreset[]): boolean {
  try {
    const storedPresets = presets.map((preset) => ({
      name: preset.name,
      ...(preset.notes ? { notes: preset.notes } : {}),
      wordBank: preset.wordBank,
    }));

    storage.setItem(
      wordBankPresetStorageKey,
      JSON.stringify(
        {
          version: 1,
          presets: storedPresets,
        },
        null,
        2,
      ),
    );
    return true;
  } catch {
    return false;
  }
}

function isStoredPresets(value: unknown): value is StoredPresets {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (value as { version?: unknown }).version === 1 &&
    Array.isArray((value as { presets?: unknown }).presets)
  );
}

function normalizeStoredPreset(value: unknown): WordBankPreset[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }

  const record = value as { name?: unknown; notes?: unknown; wordBank?: unknown };
  if (typeof record.name !== 'string') {
    return [];
  }

  const normalizedName = normalizePresetName(record.name);
  if (!normalizedName.ok) {
    return [];
  }

  try {
    return [
      {
        name: normalizedName.name,
        notes: typeof record.notes === 'string' ? normalizePresetNotes(record.notes) : '',
        wordBank: normalizeWordBankJson(record.wordBank),
      },
    ];
  } catch {
    return [];
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}
