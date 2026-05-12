import { normalizeWordBankJson, rollDice, serializeWordBank, type StoryDiceResult, type StoryDiceWordBank } from './storyDice';

export type ClassroomSessionTemplate = {
  id: string;
  title: string;
  description: string;
  seed: string;
  agendaTitle?: string;
  agendaTotalMinutes: number;
  wordBank: StoryDiceWordBank;
  notes: string;
};

export type AppliedClassroomSessionTemplate =
  | {
      ok: true;
      template: ClassroomSessionTemplate;
      seed: string;
      wordBank: StoryDiceWordBank;
      wordBankText: string;
      agendaTitle: string;
      agendaTotalMinutes: string;
      timerPhaseIndex: 0;
      locked: Set<never>;
      result: StoryDiceResult;
      statusMessage: string;
    }
  | {
      ok: false;
      statusMessage: string;
    };

const classroomSessionTemplates: ClassroomSessionTemplate[] = [
  {
    id: 'first-scene-sprint',
    title: 'First Scene Sprint',
    description: 'A fast middle-grade or high-school warmup for drafting one vivid opening scene.',
    seed: 'first scene sprint',
    agendaTitle: 'First Scene Sprint',
    agendaTotalMinutes: 25,
    wordBank: {
      character: ['new student', 'secret-keeping cousin', 'tired team captain', 'museum volunteer'],
      want: ['to make one real friend', 'to return a borrowed jacket', 'to hide a family secret', 'to win back trust'],
      setting: ['after-school art room', 'rainy bus loop', 'quiet museum wing', 'gym during a power outage'],
      obstacle: ['a rumor spreads too quickly', 'the doors lock early', 'someone else claims credit', 'the clock skips ahead'],
      object: ['paint-splattered notebook', 'cracked phone charm', 'borrowed umbrella', 'envelope with no name'],
      twist: ['the apology arrives first', 'the quietest person saw everything', 'the prize is not what they promised', 'the room rearranges itself'],
    },
    notes: 'Use when writers need a low-stakes draft with clear character action and a shareable ending hook.',
  },
  {
    id: 'revision-peer-lab',
    title: 'Revision Peer Lab',
    description: 'A critique-ready session for turning rough drafts into focused revision choices.',
    seed: 'revision peer lab',
    agendaTitle: 'Revision Peer Lab',
    agendaTotalMinutes: 40,
    wordBank: {
      character: ['draft narrator', 'skeptical best friend', 'former rival', 'quiet witness'],
      want: ['to prove the memory is true', 'to fix the ending', 'to be believed by the group', 'to protect one fragile clue'],
      setting: ['circle of mismatched desks', 'library basement', 'empty theater aisle', 'cafeteria after cleanup'],
      obstacle: ['feedback contradicts itself', 'one scene is missing', 'the strongest detail appears too late', 'a promise was cut from the draft'],
      object: ['marked-up page', 'green sticky note', 'index card question', 'half-erased timeline'],
      twist: ['the side character has the best motive', 'the draft starts in the wrong place', 'the object belongs to the antagonist', 'the ending asks a better question'],
    },
    notes: 'Pair with revision cards and peer role cards so groups can name one concrete next step before leaving.',
  },
  {
    id: 'speculative-worldbuilding',
    title: 'Speculative Worldbuilding',
    description: 'A workshop template for fantasy, sci-fi, and fabulist stories with rules and consequences.',
    seed: 'speculative worldbuilding',
    agendaTitle: 'Speculative Worldbuilding Sprint',
    agendaTotalMinutes: 30,
    wordBank: {
      character: ['junior sky mechanic', 'mapmaker of forbidden roads', 'apprentice weather judge', 'messenger from the moon market'],
      want: ['to repair the city engine', 'to cross the unmapped border', 'to bargain for tomorrow', 'to free a trapped signal'],
      setting: ['city built on sleeping giants', 'market that opens during eclipses', 'train crossing a glass desert', 'archive under the sea'],
      obstacle: ['gravity changes with every lie', 'the old treaty wakes up', 'machines refuse spoken commands', 'the map edits itself'],
      object: ['clockwork seed', 'lantern full of borrowed voices', 'silver transit token', 'compass that points to trouble'],
      twist: ['the rule was invented by a child', 'the monster is enforcing safety', 'the border follows them home', 'tomorrow has already voted'],
    },
    notes: 'Ask writers to make the world rule visible through action instead of explaining the whole setting first.',
  },
];

export function listClassroomSessionTemplates(): ClassroomSessionTemplate[] {
  return classroomSessionTemplates.map(cloneTemplate);
}

export function findClassroomSessionTemplate(id: string): ClassroomSessionTemplate | null {
  const normalizedId = id.trim();
  const template = classroomSessionTemplates.find((candidate) => candidate.id === normalizedId);
  return template ? cloneTemplate(template) : null;
}

export function applyClassroomSessionTemplate(id: string): AppliedClassroomSessionTemplate {
  const template = findClassroomSessionTemplate(id);
  if (!template) {
    return {
      ok: false,
      statusMessage: 'Choose a classroom template before applying.',
    };
  }

  const wordBank = normalizeWordBankJson(template.wordBank);

  return {
    ok: true,
    template,
    seed: template.seed,
    wordBank,
    wordBankText: serializeWordBank(wordBank),
    agendaTitle: template.agendaTitle ?? '',
    agendaTotalMinutes: String(template.agendaTotalMinutes),
    timerPhaseIndex: 0,
    locked: new Set(),
    result: rollDice(template.seed, {}, wordBank),
    statusMessage: `Applied classroom template: ${template.title}.`,
  };
}

export function formatClassroomSessionTemplateControls(
  templates: ClassroomSessionTemplate[] = listClassroomSessionTemplates(),
  options: { selectedId?: string; statusMessage?: string } = {},
): string {
  const selectedId = options.selectedId ?? templates[0]?.id ?? '';
  const statusMessage = options.statusMessage ?? 'Choose a classroom template to prefill seed, word bank, and agenda timing.';
  const optionHtml = templates
    .map((template) => {
      const selected = template.id === selectedId ? ' selected' : '';
      return `<option value="${escapeHtml(template.id)}"${selected}>${escapeHtml(template.title)} - ${template.agendaTotalMinutes} min</option>`;
    })
    .join('');
  const templateSummaries = templates
    .map(
      (template) => `<li><strong>${escapeHtml(template.title)}:</strong> ${escapeHtml(template.description)} <span>${escapeHtml(template.notes)}</span></li>`,
    )
    .join('');

  return `<div class="template-controls" aria-labelledby="template-controls-title">
    <h2 id="template-controls-title">Classroom templates</h2>
    <p id="template-help">Prefill a repeatable workshop setup for common classroom sessions.</p>
    <div class="template-fields">
      <div>
        <label class="template-field" for="template-select">Classroom template</label>
        <select id="template-select" aria-describedby="template-help">
          ${optionHtml}
        </select>
      </div>
      <button id="apply-template" type="button">Apply template</button>
    </div>
    <ul class="template-list">${templateSummaries}</ul>
    <p id="template-status" class="template-status" role="status">${escapeHtml(statusMessage)}</p>
  </div>`;
}

function cloneTemplate(template: ClassroomSessionTemplate): ClassroomSessionTemplate {
  return {
    ...template,
    wordBank: normalizeWordBankJson(template.wordBank),
  };
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
