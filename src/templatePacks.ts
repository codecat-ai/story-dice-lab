import type { ClassroomSessionTemplate } from './classroomSessionTemplates';
import { normalizeWordBankJson, storyDiceCategories, type StoryDiceCategory, type StoryDiceWordBank } from './storyDice';

export const templatePackSchema = 'story-dice-lab.template-pack';
export const templatePackVersion = 1;
export const importedClassroomTemplateStorageKey = 'story-dice-lab:imported-classroom-templates:v1';

const maxPackTitleLength = 96;
const maxPackNotesLength = 600;
const maxTemplateCount = 24;
const maxPresetCount = 24;
const maxWordBankItemsPerCategory = 40;
const maxShortTextLength = 160;
const maxLongTextLength = 600;
const maxAgendaMinutes = 240;

export type TemplatePackWordBankPreset = {
  name: string;
  notes: string;
  wordBank: StoryDiceWordBank;
};

export type TemplatePack = {
  schema: typeof templatePackSchema;
  version: typeof templatePackVersion;
  title: string;
  notes?: string;
  templates: ClassroomSessionTemplate[];
  wordBankPresets: TemplatePackWordBankPreset[];
};

export type TemplatePackInput = {
  title: string;
  notes?: string;
  templates?: ClassroomSessionTemplate[];
  wordBankPresets?: TemplatePackWordBankPreset[];
};

export type ParseTemplatePackResult =
  | {
      ok: true;
      pack: TemplatePack;
    }
  | {
      ok: false;
      error: string;
    };

export type SaveImportedClassroomTemplatesResult =
  | {
      ok: true;
      templates: ClassroomSessionTemplate[];
      status: string;
    }
  | {
      ok: false;
      templates: ClassroomSessionTemplate[];
      status: string;
    };

export type LoadPersistedClassroomTemplatesResult = {
  templates: ClassroomSessionTemplate[];
  importedTemplates: ClassroomSessionTemplate[];
  status: string;
};

export type ClearImportedClassroomTemplatesResult =
  | {
      ok: true;
      templates: ClassroomSessionTemplate[];
      importedTemplates: [];
      status: string;
    }
  | {
      ok: false;
      templates: ClassroomSessionTemplate[];
      importedTemplates: ClassroomSessionTemplate[];
      status: string;
    };

type StoredImportedClassroomTemplates = {
  version: 1;
  templates: unknown[];
};

export function exportTemplatePackJson(input: TemplatePackInput): string {
  const pack = buildTemplatePack(input);
  return JSON.stringify(pack, null, 2);
}

export function parseTemplatePackJson(source: string): ParseTemplatePackResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return importError('paste valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return importError('paste a JSON object.');
  }

  const record = parsed as {
    schema?: unknown;
    version?: unknown;
    title?: unknown;
    notes?: unknown;
    templates?: unknown;
    wordBankPresets?: unknown;
  };

  if (record.schema !== templatePackSchema) {
    return importError(`schema must be "${templatePackSchema}".`);
  }
  if (record.version !== templatePackVersion) {
    return importError(`version must be ${templatePackVersion}.`);
  }

  const title = normalizeRequiredText(record.title, 'pack title', maxPackTitleLength);
  if (!title.ok) return importError(title.error);

  const notes = normalizeOptionalText(record.notes, maxPackNotesLength);
  if (!notes.ok) return importError(`pack notes must be ${maxPackNotesLength} characters or fewer.`);

  const templatesResult = normalizeTemplateArray(record.templates);
  if (!templatesResult.ok) return importError(templatesResult.error);

  const presetsResult = normalizePresetArray(record.wordBankPresets);
  if (!presetsResult.ok) return importError(presetsResult.error);

  if (templatesResult.templates.length === 0 && presetsResult.wordBankPresets.length === 0) {
    return importError('include at least one template or word-bank preset.');
  }

  return {
    ok: true,
    pack: {
      schema: templatePackSchema,
      version: templatePackVersion,
      title: title.value,
      ...(notes.value ? { notes: notes.value } : {}),
      templates: sortTemplates(templatesResult.templates),
      wordBankPresets: sortPresets(presetsResult.wordBankPresets),
    },
  };
}

export function saveImportedClassroomTemplates(
  storage: Storage | null,
  templates: ClassroomSessionTemplate[],
): SaveImportedClassroomTemplatesResult {
  const normalized = normalizeTemplateArray(templates);
  const normalizedTemplates = normalized.ok ? sortTemplates(normalized.templates) : [];

  if (!storage) {
    return {
      ok: false,
      templates: normalizedTemplates,
      status: 'Local template persistence is unavailable; imported templates are session-only.',
    };
  }

  if (!normalized.ok) {
    return {
      ok: false,
      templates: [],
      status: 'Imported classroom templates were invalid and were not saved locally.',
    };
  }

  try {
    storage.setItem(
      importedClassroomTemplateStorageKey,
      JSON.stringify(
        {
          version: 1,
          templates: normalizedTemplates,
        },
        null,
        2,
      ),
    );
  } catch {
    return {
      ok: false,
      templates: normalizedTemplates,
      status: 'Could not save imported classroom templates locally; they are available for this session only.',
    };
  }

  return {
    ok: true,
    templates: normalizedTemplates,
    status: `Saved ${normalizedTemplates.length} imported classroom template${normalizedTemplates.length === 1 ? '' : 's'} in this browser.`,
  };
}

export function loadPersistedClassroomTemplates(
  storage: Storage | null,
  builtInTemplates: ClassroomSessionTemplate[] = [],
): LoadPersistedClassroomTemplatesResult {
  const baseTemplates = cloneTemplates(builtInTemplates);
  if (!storage) {
    return {
      templates: baseTemplates,
      importedTemplates: [],
      status: 'Local template persistence is unavailable; imported templates are session-only.',
    };
  }

  let source: string | null;
  try {
    source = storage.getItem(importedClassroomTemplateStorageKey);
  } catch {
    return {
      templates: baseTemplates,
      importedTemplates: [],
      status: 'Local template persistence is unavailable; imported templates are session-only.',
    };
  }

  if (!source) {
    return {
      templates: baseTemplates,
      importedTemplates: [],
      status: 'Imported classroom templates can be saved in this browser after import.',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return {
      templates: baseTemplates,
      importedTemplates: [],
      status: 'Saved imported classroom templates could not be read, so only built-in templates were loaded.',
    };
  }

  if (!isStoredImportedClassroomTemplates(parsed)) {
    const hasVersion = !!parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'version' in parsed;
    return {
      templates: baseTemplates,
      importedTemplates: [],
      status: hasVersion
        ? 'Saved imported classroom templates use an unsupported storage version, so only built-in templates were loaded.'
        : 'Saved imported classroom templates could not be read, so only built-in templates were loaded.',
    };
  }

  const normalized = normalizeTemplateArray(parsed.templates);
  if (!normalized.ok) {
    return {
      templates: baseTemplates,
      importedTemplates: [],
      status: 'Saved imported classroom templates were invalid, so only built-in templates were loaded.',
    };
  }

  const importedTemplates = sortTemplates(normalized.templates);
  return {
    templates: mergeClassroomSessionTemplates(baseTemplates, importedTemplates),
    importedTemplates,
    status: `Loaded ${importedTemplates.length} imported classroom template${importedTemplates.length === 1 ? '' : 's'} saved in this browser.`,
  };
}

export function clearImportedClassroomTemplates(
  storage: Storage | null,
  builtInTemplates: ClassroomSessionTemplate[] = [],
): ClearImportedClassroomTemplatesResult {
  const baseTemplates = cloneTemplates(builtInTemplates);
  if (!storage) {
    return {
      ok: true,
      templates: baseTemplates,
      importedTemplates: [],
      status: 'Cleared imported classroom templates for this session; local persistence is unavailable.',
    };
  }

  try {
    storage.removeItem(importedClassroomTemplateStorageKey);
  } catch {
    const loaded = loadPersistedClassroomTemplates(storage, builtInTemplates);
    return {
      ok: false,
      templates: loaded.templates,
      importedTemplates: loaded.importedTemplates,
      status: 'Local template persistence is unavailable, so imported templates could not be cleared.',
    };
  }

  return {
    ok: true,
    templates: baseTemplates,
    importedTemplates: [],
    status: 'Cleared imported classroom templates saved in this browser.',
  };
}

export function mergeClassroomSessionTemplates(
  builtInTemplates: ClassroomSessionTemplate[],
  importedTemplates: ClassroomSessionTemplate[],
): ClassroomSessionTemplate[] {
  const merged = cloneTemplates(builtInTemplates);
  const idIndexes = new Map(merged.map((template, index) => [template.id.toLocaleLowerCase(), index]));
  const titleIndexes = new Map(merged.map((template, index) => [template.title.toLocaleLowerCase(), index]));

  for (const importedTemplate of sortTemplates(importedTemplates)) {
    const idKey = importedTemplate.id.toLocaleLowerCase();
    const titleKey = importedTemplate.title.toLocaleLowerCase();
    const existingIdIndex = idIndexes.get(idKey);
    const existingTitleIndex = titleIndexes.get(titleKey);
    if (existingTitleIndex !== undefined && existingTitleIndex !== existingIdIndex) {
      continue;
    }

    const template = cloneTemplate(importedTemplate);
    if (existingIdIndex !== undefined) {
      titleIndexes.delete(merged[existingIdIndex].title.toLocaleLowerCase());
      merged[existingIdIndex] = template;
      titleIndexes.set(titleKey, existingIdIndex);
    } else {
      idIndexes.set(idKey, merged.length);
      titleIndexes.set(titleKey, merged.length);
      merged.push(template);
    }
  }

  return merged;
}

export function formatTemplatePackControls(options: {
  exportText: string;
  importText: string;
  statusMessage: string;
  importedTemplateCount?: number;
}): string {
  const clearDisabled = options.importedTemplateCount && options.importedTemplateCount > 0 ? '' : ' disabled';

  return `<div class="template-pack-controls" aria-labelledby="template-pack-controls-title">
    <h2 id="template-pack-controls-title">Template packs</h2>
    <p id="template-pack-help">Copy a portable local JSON pack, or paste a pack shared by a department or writing center.</p>
    <div class="template-pack-fields">
      <div>
        <label class="template-pack-field" for="template-pack-export-json">Exportable pack JSON</label>
        <textarea id="template-pack-export-json" rows="8" spellcheck="false" readonly aria-describedby="template-pack-help">${escapeHtml(options.exportText)}</textarea>
      </div>
      <button id="copy-template-pack" type="button">Copy template pack</button>
      <div>
        <label class="template-pack-field" for="template-pack-import-json">Paste/import pack JSON</label>
        <textarea id="template-pack-import-json" rows="8" spellcheck="false" aria-describedby="template-pack-help">${escapeHtml(options.importText)}</textarea>
      </div>
      <button id="import-template-pack" type="button">Import template pack</button>
      <button id="clear-imported-templates" type="button"${clearDisabled}>Clear imported templates</button>
    </div>
    <p id="template-pack-status" class="template-pack-status" role="status">${escapeHtml(options.statusMessage)}</p>
  </div>`;
}

function buildTemplatePack(input: TemplatePackInput): TemplatePack {
  const title = requireValidText(input.title, 'pack title', maxPackTitleLength);
  const notes = normalizeOptionalText(input.notes, maxPackNotesLength);
  if (!notes.ok) throw new Error(`Template pack notes must be ${maxPackNotesLength} characters or fewer.`);

  return {
    schema: templatePackSchema,
    version: templatePackVersion,
    title,
    ...(notes.value ? { notes: notes.value } : {}),
    templates: sortTemplates(normalizeTemplates(input.templates ?? [])),
    wordBankPresets: sortPresets(normalizePresets(input.wordBankPresets ?? [])),
  };
}

function normalizeTemplateArray(value: unknown): { ok: true; templates: ClassroomSessionTemplate[] } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, templates: [] };
  if (!Array.isArray(value)) return { ok: false, error: 'templates must be an array.' };
  if (value.length > maxTemplateCount) return { ok: false, error: `include ${maxTemplateCount} or fewer templates.` };

  const templates: ClassroomSessionTemplate[] = [];
  for (const [index, entry] of value.entries()) {
    const normalized = normalizeTemplate(entry, index + 1);
    if (!normalized.ok) return normalized;
    templates.push(normalized.template);
  }

  if (hasDuplicate(templates.map((template) => template.id))) {
    return { ok: false, error: 'template ids must be unique.' };
  }
  if (hasDuplicate(templates.map((template) => template.title))) {
    return { ok: false, error: 'template titles must be unique.' };
  }

  return { ok: true, templates };
}

function normalizePresetArray(
  value: unknown,
): { ok: true; wordBankPresets: TemplatePackWordBankPreset[] } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, wordBankPresets: [] };
  if (!Array.isArray(value)) return { ok: false, error: 'word-bank presets must be an array.' };
  if (value.length > maxPresetCount) return { ok: false, error: `include ${maxPresetCount} or fewer word-bank presets.` };

  const wordBankPresets: TemplatePackWordBankPreset[] = [];
  for (const [index, entry] of value.entries()) {
    const normalized = normalizePreset(entry, index + 1);
    if (!normalized.ok) return normalized;
    wordBankPresets.push(normalized.preset);
  }

  if (hasDuplicate(wordBankPresets.map((preset) => preset.name))) {
    return { ok: false, error: 'word-bank preset names must be unique.' };
  }

  return { ok: true, wordBankPresets };
}

function normalizeTemplates(templates: ClassroomSessionTemplate[]): ClassroomSessionTemplate[] {
  return templates.map((template, index) => {
    const normalized = normalizeTemplate(template, index + 1);
    if (!normalized.ok) throw new Error(`Template pack export failed: ${normalized.error}`);
    return normalized.template;
  });
}

function normalizePresets(presets: TemplatePackWordBankPreset[]): TemplatePackWordBankPreset[] {
  return presets.map((preset, index) => {
    const normalized = normalizePreset(preset, index + 1);
    if (!normalized.ok) throw new Error(`Template pack export failed: ${normalized.error}`);
    return normalized.preset;
  });
}

function normalizeTemplate(value: unknown, number: number): { ok: true; template: ClassroomSessionTemplate } | { ok: false; error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: `template ${number} must be an object.` };
  }

  const record = value as {
    id?: unknown;
    title?: unknown;
    description?: unknown;
    seed?: unknown;
    agendaTitle?: unknown;
    agendaTotalMinutes?: unknown;
    notes?: unknown;
    wordBank?: unknown;
  };
  const id = normalizeRequiredText(record.id, `template ${number} id`, maxShortTextLength);
  if (!id.ok) return { ok: false, error: id.error };
  if (!/^[a-z0-9-]+$/.test(id.value)) {
    return { ok: false, error: `template ${number} id must use lowercase letters, numbers, and hyphens.` };
  }

  const title = normalizeRequiredText(record.title, `template ${number} title`, maxShortTextLength);
  if (!title.ok) return { ok: false, error: title.error };
  const description = normalizeRequiredText(record.description, `template ${number} description`, maxLongTextLength);
  if (!description.ok) return { ok: false, error: description.error };
  const seed = normalizeRequiredText(record.seed, `template ${number} seed`, maxShortTextLength);
  if (!seed.ok) return { ok: false, error: seed.error };
  const agendaTitle = normalizeOptionalText(record.agendaTitle, maxShortTextLength);
  if (!agendaTitle.ok) return { ok: false, error: `template ${number} agenda title must be ${maxShortTextLength} characters or fewer.` };
  const notes = normalizeRequiredText(record.notes, `template ${number} notes`, maxLongTextLength);
  if (!notes.ok) return { ok: false, error: notes.error };

  const agendaTotalMinutes = Number(record.agendaTotalMinutes);
  if (!Number.isInteger(agendaTotalMinutes) || agendaTotalMinutes < 5 || agendaTotalMinutes > maxAgendaMinutes) {
    return { ok: false, error: `template ${number} agenda total minutes must be between 5 and ${maxAgendaMinutes}.` };
  }

  const wordBank = normalizePackWordBank(record.wordBank, `template ${number}`);
  if (!wordBank.ok) return wordBank;

  return {
    ok: true,
    template: {
      id: id.value,
      title: title.value,
      description: description.value,
      seed: seed.value,
      ...(agendaTitle.value ? { agendaTitle: agendaTitle.value } : {}),
      agendaTotalMinutes,
      notes: notes.value,
      wordBank: wordBank.wordBank,
    },
  };
}

function normalizePreset(
  value: unknown,
  number: number,
): { ok: true; preset: TemplatePackWordBankPreset } | { ok: false; error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: `word-bank preset ${number} must be an object.` };
  }

  const record = value as { name?: unknown; notes?: unknown; wordBank?: unknown };
  const name = normalizeRequiredText(record.name, `word-bank preset ${number} name`, maxShortTextLength);
  if (!name.ok) return { ok: false, error: name.error };
  const notes = normalizeOptionalText(record.notes, maxPackNotesLength);
  if (!notes.ok) return { ok: false, error: `word-bank preset ${number} notes must be ${maxPackNotesLength} characters or fewer.` };
  const wordBank = normalizePackWordBank(record.wordBank, `word-bank preset ${number}`);
  if (!wordBank.ok) return wordBank;

  return {
    ok: true,
    preset: {
      name: name.value,
      notes: notes.value,
      wordBank: wordBank.wordBank,
    },
  };
}

function normalizePackWordBank(
  value: unknown,
  label: string,
): { ok: true; wordBank: StoryDiceWordBank } | { ok: false; error: string } {
  let wordBank: StoryDiceWordBank;
  try {
    wordBank = normalizeWordBankJson(value);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'word bank is invalid.';
    return { ok: false, error: `${label} word bank is invalid: ${reason}` };
  }

  for (const category of storyDiceCategories) {
    if (wordBank[category].length > maxWordBankItemsPerCategory) {
      return {
        ok: false,
        error: `${label} ${category} can include ${maxWordBankItemsPerCategory} or fewer items.`,
      };
    }
  }

  return { ok: true, wordBank };
}

function requireValidText(value: unknown, label: string, maxLength: number): string {
  const normalized = normalizeRequiredText(value, label, maxLength);
  if (!normalized.ok) throw new Error(`Template pack export failed: ${normalized.error}`);
  return normalized.value;
}

function normalizeRequiredText(
  value: unknown,
  label: string,
  maxLength: number,
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== 'string') return { ok: false, error: `${label} is required.` };
  const normalized = collapseWhitespace(value);
  if (!normalized) return { ok: false, error: `${label} is required.` };
  if (normalized.length > maxLength) return { ok: false, error: `${label} must be ${maxLength} characters or fewer.` };
  return { ok: true, value: normalized };
}

function normalizeOptionalText(
  value: unknown,
  maxLength: number,
): { ok: true; value: string } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, value: '' };
  if (typeof value !== 'string') return { ok: false, error: 'text must be a string.' };
  const normalized = collapseWhitespace(value);
  if (normalized.length > maxLength) return { ok: false, error: `text must be ${maxLength} characters or fewer.` };
  return { ok: true, value: normalized };
}

function sortTemplates(templates: ClassroomSessionTemplate[]): ClassroomSessionTemplate[] {
  return [...templates]
    .sort((first, second) => compareStable(first.title, second.title) || compareStable(first.id, second.id))
    .map((template) => ({
      ...template,
      wordBank: cloneWordBank(template.wordBank),
    }));
}

function sortPresets(presets: TemplatePackWordBankPreset[]): TemplatePackWordBankPreset[] {
  return [...presets]
    .sort((first, second) => compareStable(first.name, second.name))
    .map((preset) => ({
      ...preset,
      wordBank: cloneWordBank(preset.wordBank),
    }));
}

function cloneTemplates(templates: ClassroomSessionTemplate[]): ClassroomSessionTemplate[] {
  return templates.map(cloneTemplate);
}

function cloneTemplate(template: ClassroomSessionTemplate): ClassroomSessionTemplate {
  return {
    ...template,
    wordBank: cloneWordBank(template.wordBank),
  };
}

function cloneWordBank(wordBank: StoryDiceWordBank): StoryDiceWordBank {
  return Object.fromEntries(storyDiceCategories.map((category) => [category, [...wordBank[category]]])) as Record<
    StoryDiceCategory,
    string[]
  >;
}

function hasDuplicate(values: string[]): boolean {
  const seen = new Set<string>();
  for (const value of values) {
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function compareStable(first: string, second: string): number {
  return first.localeCompare(second, 'en', { sensitivity: 'base' });
}

function isStoredImportedClassroomTemplates(value: unknown): value is StoredImportedClassroomTemplates {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (value as { version?: unknown }).version === 1 &&
    Array.isArray((value as { templates?: unknown }).templates)
  );
}

function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function importError(error: string): ParseTemplatePackResult {
  return { ok: false, error: `Template pack import failed: ${error}` };
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
