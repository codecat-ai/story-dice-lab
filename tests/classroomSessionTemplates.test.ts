import { describe, expect, it } from 'vitest';
import {
  applyClassroomSessionTemplate,
  findClassroomSessionTemplate,
  formatClassroomSessionTemplateControls,
  listClassroomSessionTemplates,
} from '../src/classroomSessionTemplates';
import { normalizeWordBankJson, rollDice, storyDiceCategories, type StoryDiceWordBank } from '../src/storyDice';

describe('classroom session templates', () => {
  it('lists at least three complete built-in templates with valid word banks', () => {
    const templates = listClassroomSessionTemplates();

    expect(templates.length).toBeGreaterThanOrEqual(3);
    expect(new Set(templates.map((template) => template.id)).size).toBe(templates.length);

    for (const template of templates) {
      expect(template.id).toMatch(/^[a-z0-9-]+$/);
      expect(template.title.trim()).toBe(template.title);
      expect(template.description.length).toBeGreaterThan(12);
      expect(template.seed.length).toBeGreaterThan(3);
      expect(template.agendaTotalMinutes).toBeGreaterThanOrEqual(5);
      expect(template.notes.length).toBeGreaterThan(12);

      const normalized = normalizeWordBankJson(template.wordBank);
      for (const category of storyDiceCategories) {
        expect(normalized[category].filter(Boolean).length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('clones built-in template data so callers cannot mutate shared templates', () => {
    const first = listClassroomSessionTemplates()[0];
    const originalTitle = first.title;
    const originalCharacter = first.wordBank.character[0];

    first.title = 'Mutated title';
    first.wordBank.character[0] = 'mutated character';

    const next = findClassroomSessionTemplate(first.id);
    expect(next?.title).toBe(originalTitle);
    expect(next?.wordBank.character[0]).toBe(originalCharacter);
    expect(next).not.toBe(first);
    expect(next?.wordBank).not.toBe(first.wordBank);
  });

  it('applies a template into UI-ready state and rolls dice from that template word bank', () => {
    const template = listClassroomSessionTemplates()[0];
    const applied = applyClassroomSessionTemplate(template.id);

    expect(applied.ok).toBe(true);
    if (!applied.ok) throw new Error('expected template to apply');

    expect(applied.seed).toBe(template.seed);
    expect(applied.wordBank).toEqual(template.wordBank);
    expect(applied.wordBank).not.toBe(template.wordBank);
    expect(applied.wordBankText).toBe(JSON.stringify(template.wordBank, null, 2));
    expect(applied.agendaTitle).toBe(template.agendaTitle ?? '');
    expect(applied.agendaTotalMinutes).toBe(String(template.agendaTotalMinutes));
    expect(applied.timerPhaseIndex).toBe(0);
    expect(applied.locked).toEqual(new Set());
    expect(applied.result).toEqual(rollDice(template.seed, {}, template.wordBank));
    expect(applied.statusMessage).toBe(`Applied classroom template: ${template.title}.`);
  });

  it('handles missing template ids without throwing in the UI helper path', () => {
    expect(findClassroomSessionTemplate('missing-template')).toBeNull();
    expect(applyClassroomSessionTemplate('missing-template')).toEqual({
      ok: false,
      statusMessage: 'Choose a classroom template before applying.',
    });
    expect(applyClassroomSessionTemplate('   ')).toEqual({
      ok: false,
      statusMessage: 'Choose a classroom template before applying.',
    });
  });

  it('applies caller-provided imported templates without requiring source changes', () => {
    const importedTemplate = {
      ...listClassroomSessionTemplates()[0],
      id: 'writing-center-import',
      title: 'Writing Center Import',
      seed: 'writing center import',
      agendaTitle: 'Writing Center Import',
      wordBank: {
        character: ['tutor'],
        want: ['to find the draft question'],
        setting: ['writing center table'],
        obstacle: ['the assignment prompt is vague'],
        object: ['annotated paragraph'],
        twist: ['the thesis appears in the last line'],
      },
    };

    const applied = applyClassroomSessionTemplate('writing-center-import', [importedTemplate]);

    expect(applied.ok).toBe(true);
    if (!applied.ok) throw new Error('expected imported template to apply');
    expect(applied.template.title).toBe('Writing Center Import');
    expect(applied.seed).toBe('writing center import');
    expect(applied.wordBank.character).toEqual(['tutor']);
  });

  it('renders escaped selector controls with template descriptions and notes', () => {
    const customBank: StoryDiceWordBank = {
      character: ['one', 'two'],
      want: ['one', 'two'],
      setting: ['one', 'two'],
      obstacle: ['one', 'two'],
      object: ['one', 'two'],
      twist: ['one', 'two'],
    };
    const controls = formatClassroomSessionTemplateControls(
      [
        {
          id: 'safe-template',
          title: 'Safe <Template>',
          description: 'Use & adapt this prompt.',
          seed: 'safe seed',
          agendaTitle: 'Safe agenda',
          agendaTotalMinutes: 35,
          wordBank: customBank,
          notes: 'Pair writers before drafting.',
        },
      ],
      {
        selectedId: 'safe-template',
        statusMessage: 'Applied <today> & ready.',
      },
    );

    expect(controls).toContain('<label class="template-field" for="template-select">Classroom template</label>');
    expect(controls).toContain('<option value="safe-template" selected>Safe &lt;Template&gt; - 35 min</option>');
    expect(controls).toContain('Use &amp; adapt this prompt.');
    expect(controls).toContain('Pair writers before drafting.');
    expect(controls).toContain('<button id="apply-template" type="button">Apply template</button>');
    expect(controls).toContain('Applied &lt;today&gt; &amp; ready.');
  });
});
