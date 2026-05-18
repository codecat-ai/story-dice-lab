import { describe, expect, it } from 'vitest';
import { listClassroomSessionTemplates, type ClassroomSessionTemplate } from '../src/classroomSessionTemplates';
import {
  exportTemplatePackJson,
  formatTemplatePackControls,
  importedClassroomTemplateStorageKey,
  loadPersistedClassroomTemplates,
  mergeClassroomSessionTemplates,
  parseTemplatePackJson,
  saveImportedClassroomTemplates,
  templatePackSchema,
  templatePackVersion,
  type TemplatePackWordBankPreset,
} from '../src/templatePacks';
import type { StoryDiceWordBank } from '../src/storyDice';

const validBank: StoryDiceWordBank = {
  character: ['custom hero', 'custom hero'],
  want: ['custom want'],
  setting: ['custom setting'],
  obstacle: ['custom obstacle'],
  object: ['custom object'],
  twist: ['custom twist'],
};

const template: ClassroomSessionTemplate = {
  id: 'center-sprint',
  title: 'Center Sprint',
  description: 'A campus writing center sprint for an opening scene.',
  seed: 'center sprint',
  agendaTitle: 'Center Sprint',
  agendaTotalMinutes: 30,
  wordBank: validBank,
  notes: 'Use for drop-in student groups.',
};

const preset: TemplatePackWordBankPreset = {
  name: 'Writing Center Bank',
  notes: 'Drop-in tutoring group',
  wordBank: validBank,
};

describe('template packs', () => {
  it('exports deterministic versioned JSON with sorted templates and presets', () => {
    const json = exportTemplatePackJson({
      title: '  Writing Center Pack  ',
      notes: '  Local workshop set  ',
      templates: [
        { ...template, id: 'z-template', title: 'Z Template' },
        { ...template, id: 'a-template', title: 'A Template', agendaTitle: '  A agenda  ' },
      ],
      wordBankPresets: [
        { ...preset, name: 'Z Bank' },
        { ...preset, name: 'A Bank' },
      ],
    });

    expect(json).toBe(
      JSON.stringify(
        {
          schema: templatePackSchema,
          version: templatePackVersion,
          title: 'Writing Center Pack',
          notes: 'Local workshop set',
          templates: [
            {
              id: 'a-template',
              title: 'A Template',
              description: 'A campus writing center sprint for an opening scene.',
              seed: 'center sprint',
              agendaTitle: 'A agenda',
              agendaTotalMinutes: 30,
              notes: 'Use for drop-in student groups.',
              wordBank: {
                ...validBank,
                character: ['custom hero'],
              },
            },
            {
              id: 'z-template',
              title: 'Z Template',
              description: 'A campus writing center sprint for an opening scene.',
              seed: 'center sprint',
              agendaTitle: 'Center Sprint',
              agendaTotalMinutes: 30,
              notes: 'Use for drop-in student groups.',
              wordBank: {
                ...validBank,
                character: ['custom hero'],
              },
            },
          ],
          wordBankPresets: [
            {
              name: 'A Bank',
              notes: 'Drop-in tutoring group',
              wordBank: {
                ...validBank,
                character: ['custom hero'],
              },
            },
            {
              name: 'Z Bank',
              notes: 'Drop-in tutoring group',
              wordBank: {
                ...validBank,
                character: ['custom hero'],
              },
            },
          ],
        },
        null,
        2,
      ),
    );
    expect(exportTemplatePackJson({ title: 'Writing Center Pack', templates: [template], wordBankPresets: [preset] })).toBe(
      exportTemplatePackJson({ title: 'Writing Center Pack', templates: [template], wordBankPresets: [preset] }),
    );
  });

  it('parses a valid pack into cloned templates and presets with normalized word banks', () => {
    const parsed = parseTemplatePackJson(
      JSON.stringify({
        schema: templatePackSchema,
        version: templatePackVersion,
        title: 'Writing Center Pack',
        notes: 'Local set',
        templates: [template],
        wordBankPresets: [preset],
      }),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.error);

    expect(parsed.pack.title).toBe('Writing Center Pack');
    expect(parsed.pack.notes).toBe('Local set');
    expect(parsed.pack.templates).toEqual([
      {
        ...template,
        wordBank: {
          ...validBank,
          character: ['custom hero'],
        },
      },
    ]);
    expect(parsed.pack.wordBankPresets).toEqual([
      {
        ...preset,
        wordBank: {
          ...validBank,
          character: ['custom hero'],
        },
      },
    ]);

    template.wordBank.character[0] = 'mutated original';
    expect(parsed.pack.templates[0].wordBank.character[0]).toBe('custom hero');
  });

  it('rejects malformed packs with friendly errors before import changes local state', () => {
    expect(parseTemplatePackJson('not json')).toEqual({
      ok: false,
      error: 'Template pack import failed: paste valid JSON.',
    });
    expect(parseTemplatePackJson(JSON.stringify({ version: 1, title: 'Pack' }))).toEqual({
      ok: false,
      error: `Template pack import failed: schema must be "${templatePackSchema}".`,
    });
    expect(parseTemplatePackJson(JSON.stringify({ schema: templatePackSchema, version: 99, title: 'Pack' }))).toEqual({
      ok: false,
      error: `Template pack import failed: version must be ${templatePackVersion}.`,
    });
    expect(
      parseTemplatePackJson(JSON.stringify({ schema: templatePackSchema, version: templatePackVersion, title: '   ' })),
    ).toEqual({
      ok: false,
      error: 'Template pack import failed: pack title is required.',
    });
    expect(
      parseTemplatePackJson(
        JSON.stringify({
          schema: templatePackSchema,
          version: templatePackVersion,
          title: 'Pack',
          templates: [],
          wordBankPresets: [],
        }),
      ),
    ).toEqual({
      ok: false,
      error: 'Template pack import failed: include at least one template or word-bank preset.',
    });
  });

  it('rejects duplicate template and preset names and invalid template fields', () => {
    expect(
      parseTemplatePackJson(
        JSON.stringify({
          schema: templatePackSchema,
          version: templatePackVersion,
          title: 'Pack',
          templates: [
            { ...template, title: 'Same Name' },
            { ...template, id: 'other', title: ' same name ' },
          ],
        }),
      ),
    ).toEqual({
      ok: false,
      error: 'Template pack import failed: template titles must be unique.',
    });

    expect(
      parseTemplatePackJson(
        JSON.stringify({
          schema: templatePackSchema,
          version: templatePackVersion,
          title: 'Pack',
          wordBankPresets: [
            { ...preset, name: 'Same Bank' },
            { ...preset, name: ' same bank ' },
          ],
        }),
      ),
    ).toEqual({
      ok: false,
      error: 'Template pack import failed: word-bank preset names must be unique.',
    });

    expect(
      parseTemplatePackJson(
        JSON.stringify({
          schema: templatePackSchema,
          version: templatePackVersion,
          title: 'Pack',
          templates: [{ ...template, title: '', agendaTotalMinutes: 0 }],
        }),
      ),
    ).toEqual({
      ok: false,
      error: 'Template pack import failed: template 1 title is required.',
    });
  });

  it('bounds pack size and category item counts for classroom-safe paste imports', () => {
    expect(
      parseTemplatePackJson(
        JSON.stringify({
          schema: templatePackSchema,
          version: templatePackVersion,
          title: 'Pack',
          templates: Array.from({ length: 25 }, (_, index) => ({
            ...template,
            id: `template-${index}`,
            title: `Template ${index}`,
          })),
        }),
      ),
    ).toEqual({
      ok: false,
      error: 'Template pack import failed: include 24 or fewer templates.',
    });

    expect(
      parseTemplatePackJson(
        JSON.stringify({
          schema: templatePackSchema,
          version: templatePackVersion,
          title: 'Pack',
          templates: [{ ...template, wordBank: { ...validBank, character: Array.from({ length: 41 }, (_, index) => `hero ${index}`) } }],
        }),
      ),
    ).toEqual({
      ok: false,
      error: 'Template pack import failed: template 1 character can include 40 or fewer items.',
    });
  });

  it('renders accessible import and export controls with escaped local state', () => {
    const controls = formatTemplatePackControls({
      exportText: '<pack json>',
      importText: '<paste json>',
      statusMessage: 'Imported <Center> & ready.',
    });

    expect(controls).toContain('<h2 id="template-pack-controls-title">Template packs</h2>');
    expect(controls).toContain('<label class="template-pack-field" for="template-pack-export-json">Exportable pack JSON</label>');
    expect(controls).toContain(
      '<textarea id="template-pack-export-json" rows="8" spellcheck="false" readonly aria-describedby="template-pack-help">&lt;pack json&gt;</textarea>',
    );
    expect(controls).toContain('<button id="copy-template-pack" type="button">Copy template pack</button>');
    expect(controls).toContain('<label class="template-pack-field" for="template-pack-import-json">Paste/import pack JSON</label>');
    expect(controls).toContain(
      '<textarea id="template-pack-import-json" rows="8" spellcheck="false" aria-describedby="template-pack-help">&lt;paste json&gt;</textarea>',
    );
    expect(controls).toContain('<button id="import-template-pack" type="button">Import template pack</button>');
    expect(controls).toContain('<p id="template-pack-status" class="template-pack-status" role="status">Imported &lt;Center&gt; &amp; ready.</p>');
  });

  it('can export the built-in templates without mutating them', () => {
    const before = listClassroomSessionTemplates();
    const parsed = parseTemplatePackJson(exportTemplatePackJson({ title: 'Built-ins', templates: before }));

    expect(parsed.ok).toBe(true);
    expect(listClassroomSessionTemplates()).toEqual(before);
  });

  it('persists only normalized imported classroom templates under a versioned key', () => {
    const storage = new MemoryStorage();
    const cleanTemplate = makeTemplate();

    const saved = saveImportedClassroomTemplates(storage, [
      { ...cleanTemplate, title: '  Center Sprint  ', wordBank: { ...validBank, character: ['custom hero', ' custom hero '] } },
      { ...cleanTemplate, id: 'alpha-lab', title: 'Alpha Lab', agendaTitle: '  Alpha  ' },
    ]);

    expect(saved).toEqual({
      ok: true,
      templates: [
        { ...cleanTemplate, id: 'alpha-lab', title: 'Alpha Lab', agendaTitle: 'Alpha', wordBank: { ...validBank, character: ['custom hero'] } },
        { ...cleanTemplate, title: 'Center Sprint', wordBank: { ...validBank, character: ['custom hero'] } },
      ],
      status: 'Saved 2 imported classroom templates in this browser.',
    });
    expect(JSON.parse(storage.getItem(importedClassroomTemplateStorageKey) ?? '{}')).toEqual({
      version: 1,
      templates: saved.ok ? saved.templates : [],
    });
  });

  it('loads persisted classroom templates as normalized clones and merges them deterministically', () => {
    const storage = new MemoryStorage();
    const cleanTemplate = makeTemplate();
    storage.setItem(
      importedClassroomTemplateStorageKey,
      JSON.stringify({
        version: 1,
        templates: [
          { ...cleanTemplate, id: 'z-import', title: 'Z Import', wordBank: { ...validBank, character: ['custom hero', 'custom hero'] } },
          { ...cleanTemplate, id: 'a-import', title: 'A Import', agendaTitle: '  A Import  ' },
        ],
      }),
    );

    const builtIns = listClassroomSessionTemplates();
    const loaded = loadPersistedClassroomTemplates(storage, builtIns);

    expect(loaded.status).toBe('Loaded 2 imported classroom templates saved in this browser.');
    expect(loaded.importedTemplates.map((template) => template.id)).toEqual(['a-import', 'z-import']);
    expect(loaded.templates.map((entry) => entry.id)).toEqual([...builtIns.map((entry) => entry.id), 'a-import', 'z-import']);

    loaded.importedTemplates[0].title = 'Mutated';
    loaded.importedTemplates[0].wordBank.character[0] = 'mutated';
    const loadedAgain = loadPersistedClassroomTemplates(storage, builtIns);
    expect(loadedAgain.importedTemplates[0].title).toBe('A Import');
    expect(loadedAgain.importedTemplates[0].wordBank.character[0]).toBe('custom hero');
  });

  it('handles unavailable, malformed, wrong-version, invalid, and write-blocked storage without throwing', () => {
    const cleanTemplate = makeTemplate();

    expect(loadPersistedClassroomTemplates(null, [cleanTemplate])).toEqual({
      templates: [cleanTemplate],
      importedTemplates: [],
      status: 'Local template persistence is unavailable; imported templates are session-only.',
    });

    const storage = new MemoryStorage();
    storage.setItem(importedClassroomTemplateStorageKey, '{not json');
    expect(loadPersistedClassroomTemplates(storage, [cleanTemplate])).toEqual({
      templates: [cleanTemplate],
      importedTemplates: [],
      status: 'Saved imported classroom templates could not be read, so only built-in templates were loaded.',
    });

    storage.setItem(importedClassroomTemplateStorageKey, JSON.stringify({ version: 99, templates: [cleanTemplate] }));
    expect(loadPersistedClassroomTemplates(storage, [cleanTemplate])).toEqual({
      templates: [cleanTemplate],
      importedTemplates: [],
      status: 'Saved imported classroom templates use an unsupported storage version, so only built-in templates were loaded.',
    });

    storage.setItem(importedClassroomTemplateStorageKey, JSON.stringify({ version: 1, templates: [{ ...cleanTemplate, title: '' }] }));
    expect(loadPersistedClassroomTemplates(storage, [cleanTemplate])).toEqual({
      templates: [cleanTemplate],
      importedTemplates: [],
      status: 'Saved imported classroom templates were invalid, so only built-in templates were loaded.',
    });

    expect(saveImportedClassroomTemplates(null, [cleanTemplate])).toEqual({
      ok: false,
      templates: [{ ...cleanTemplate, wordBank: { ...validBank, character: ['custom hero'] } }],
      status: 'Local template persistence is unavailable; imported templates are session-only.',
    });
    expect(saveImportedClassroomTemplates(new ThrowingStorage(), [cleanTemplate])).toEqual({
      ok: false,
      templates: [{ ...cleanTemplate, wordBank: { ...validBank, character: ['custom hero'] } }],
      status: 'Could not save imported classroom templates locally; they are available for this session only.',
    });
  });

  it('merges built-in and imported classroom templates without duplicate ids or titles', () => {
    const builtIns = listClassroomSessionTemplates();
    const merged = mergeClassroomSessionTemplates(builtIns, [
      { ...template, id: builtIns[0].id, title: 'Replacement Import' },
      { ...template, id: 'duplicate-title', title: builtIns[1].title },
      { ...template, id: 'z-import', title: 'Z Import' },
      { ...template, id: 'a-import', title: 'A Import' },
    ]);

    expect(merged.map((entry) => entry.id)).toEqual([builtIns[0].id, ...builtIns.slice(1).map((entry) => entry.id), 'a-import', 'z-import']);
    expect(merged.find((entry) => entry.id === builtIns[0].id)?.title).toBe('Replacement Import');
    expect(merged.some((entry) => entry.id === 'duplicate-title')).toBe(false);
    expect(new Set(merged.map((entry) => entry.id.toLocaleLowerCase())).size).toBe(merged.length);
    expect(new Set(merged.map((entry) => entry.title.toLocaleLowerCase())).size).toBe(merged.length);
  });
});

function makeTemplate(): ClassroomSessionTemplate {
  return {
    ...template,
    wordBank: {
      ...validBank,
      character: ['custom hero', 'custom hero'],
    },
  };
}

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
}
