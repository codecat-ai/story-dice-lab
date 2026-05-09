import { describe, expect, it } from 'vitest';
import {
  deleteWordBankPreset,
  formatWordBankPresetControls,
  listWordBankPresets,
  loadWordBankPreset,
  saveWordBankPreset,
  wordBankPresetStorageKey,
} from '../src/wordBankPresets';
import type { StoryDiceWordBank } from '../src/storyDice';

const validBank: StoryDiceWordBank = {
  character: ['custom hero'],
  want: ['custom want'],
  setting: ['custom setting'],
  obstacle: ['custom obstacle'],
  object: ['custom object'],
  twist: ['custom twist'],
};

describe('word-bank presets', () => {
  it('saves normalized presets under trimmed names and overwrites duplicates intentionally', () => {
    const storage = new MemoryStorage();
    const first = saveWordBankPreset(storage, '  Middle Grade Mystery  ', validBank);
    const second = saveWordBankPreset(storage, 'Middle Grade Mystery', {
      ...validBank,
      character: [' second hero ', 'second hero'],
    });

    expect(first).toEqual({ ok: true, name: 'Middle Grade Mystery', overwritten: false });
    expect(second).toEqual({ ok: true, name: 'Middle Grade Mystery', overwritten: true });
    expect(listWordBankPresets(storage)).toEqual([
      {
        name: 'Middle Grade Mystery',
        wordBank: {
          ...validBank,
          character: ['second hero'],
        },
      },
    ]);
    expect(JSON.parse(storage.getItem(wordBankPresetStorageKey) ?? '{}')).toEqual({
      version: 1,
      presets: [
        {
          name: 'Middle Grade Mystery',
          wordBank: {
            ...validBank,
            character: ['second hero'],
          },
        },
      ],
    });
  });

  it('rejects blank and overly long preset names before writing', () => {
    const storage = new MemoryStorage();

    expect(saveWordBankPreset(storage, '   ', validBank)).toEqual({
      ok: false,
      reason: 'Preset name is required.',
    });
    expect(saveWordBankPreset(storage, 'x'.repeat(65), validBank)).toEqual({
      ok: false,
      reason: 'Preset name must be 64 characters or fewer.',
    });
    expect(storage.getItem(wordBankPresetStorageKey)).toBeNull();
  });

  it('ignores corrupt stored data and invalid preset word banks safely', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      wordBankPresetStorageKey,
      JSON.stringify({
        version: 1,
        presets: [
          { name: 'Valid', wordBank: validBank },
          { name: 'Missing twist', wordBank: { ...validBank, twist: undefined } },
          { name: 'Blank entries', wordBank: { ...validBank, want: ['   '] } },
          { name: '', wordBank: validBank },
        ],
      }),
    );

    expect(listWordBankPresets(storage)).toEqual([{ name: 'Valid', wordBank: validBank }]);

    storage.setItem(wordBankPresetStorageKey, '{not json');
    expect(listWordBankPresets(storage)).toEqual([]);
    expect(loadWordBankPreset(storage, 'Valid')).toEqual({ ok: false, reason: 'Preset not found.' });
  });

  it('loads and deletes presets by trimmed name', () => {
    const storage = new MemoryStorage();
    saveWordBankPreset(storage, 'Genre A', validBank);
    saveWordBankPreset(storage, 'Genre B', { ...validBank, object: ['silver key'] });

    expect(loadWordBankPreset(storage, ' Genre B ')).toEqual({
      ok: true,
      name: 'Genre B',
      wordBank: { ...validBank, object: ['silver key'] },
    });
    expect(deleteWordBankPreset(storage, 'Genre A')).toEqual({ ok: true, name: 'Genre A' });
    expect(deleteWordBankPreset(storage, 'Genre A')).toEqual({ ok: false, reason: 'Preset not found.' });
    expect(listWordBankPresets(storage).map((preset) => preset.name)).toEqual(['Genre B']);
  });

  it('returns storage failure results instead of throwing when storage is unavailable', () => {
    const storage = new ThrowingStorage();

    expect(listWordBankPresets(storage)).toEqual([]);
    expect(saveWordBankPreset(storage, 'Genre', validBank)).toEqual({
      ok: false,
      reason: 'Local storage is unavailable.',
    });
    expect(loadWordBankPreset(storage, 'Genre')).toEqual({ ok: false, reason: 'Preset not found.' });
    expect(deleteWordBankPreset(storage, 'Genre')).toEqual({
      ok: false,
      reason: 'Local storage is unavailable.',
    });
  });

  it('renders accessible preset controls with escaped names and disabled empty-state actions', () => {
    const emptyControls = formatWordBankPresetControls([]);
    const controls = formatWordBankPresetControls([
      { name: 'Mystery <A>', wordBank: validBank },
      { name: 'Sci-Fi & Fantasy', wordBank: validBank },
    ]);

    expect(emptyControls).toContain('<label class="preset-field" for="preset-name">Preset name</label>');
    expect(emptyControls).toContain('<button id="load-preset" type="button" disabled>Load preset</button>');
    expect(emptyControls).toContain('<button id="delete-preset" type="button" disabled>Delete preset</button>');
    expect(controls).toContain(
      '<option value="Mystery &lt;A&gt;">Mystery &lt;A&gt;</option>',
    );
    expect(controls).toContain(
      '<option value="Sci-Fi &amp; Fantasy">Sci-Fi &amp; Fantasy</option>',
    );
    expect(controls).toContain('<button id="save-preset" type="button">Save preset</button>');
    expect(controls).toContain('<button id="load-preset" type="button">Load preset</button>');
    expect(controls).toContain('<button id="delete-preset" type="button">Delete preset</button>');
    expect(controls.indexOf('id="preset-name"')).toBeLessThan(controls.indexOf('id="save-preset"'));
    expect(controls.indexOf('id="preset-select"')).toBeLessThan(controls.indexOf('id="load-preset"'));
  });
});

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

class ThrowingStorage extends MemoryStorage {
  override getItem(): string | null {
    throw new Error('blocked');
  }

  override setItem(): void {
    throw new Error('blocked');
  }

  override removeItem(): void {
    throw new Error('blocked');
  }
}
