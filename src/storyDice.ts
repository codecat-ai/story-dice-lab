export type StoryDiceCategory = 'character' | 'want' | 'setting' | 'obstacle' | 'object' | 'twist';

export type StoryDiceResult = {
  seed: string;
  dice: Record<StoryDiceCategory, string>;
};

export type StoryDiceWordBank = Record<StoryDiceCategory, string[]>;

export type CopySource = 'compact' | 'handout' | 'outline';

export type HandoutOptions = {
  title?: string;
};

export type FacilitatorAgendaOptions = {
  title?: string;
  totalMinutes?: number;
};

export type PrintSheet = {
  title: string;
  seedLabel: string;
  seed: string;
  dice: { category: string; value: string }[];
  questions: string[];
};

export type BrowserPrintTarget = {
  print: () => void;
};

export type ShareState = {
  seed: string;
  locked: Set<StoryDiceCategory>;
};

export const storyDiceCategories: StoryDiceCategory[] = [
  'character',
  'want',
  'setting',
  'obstacle',
  'object',
  'twist',
];

const wordBank: StoryDiceWordBank = {
  character: ['retired cartographer', 'curious beekeeper', 'apprentice locksmith', 'night gardener', 'runaway archivist', 'soft-spoken inventor'],
  want: ['to repair a broken promise', 'to find a missing doorway', 'to win one impossible argument', 'to return a borrowed name', 'to protect a tiny festival', 'to decode a humming letter'],
  setting: ['floating library', 'rain-lit train station', 'market under glass', 'island observatory', 'abandoned clock tower', 'greenhouse on wheels'],
  obstacle: ['a rule that changes hourly', 'a rival with the same map', 'a bridge that remembers insults', 'a storm made of whispers', 'a key split into rumors', 'a deadline at sunrise'],
  object: ['brass compass', 'folded paper comet', 'jar of blue sparks', 'threadbare red scarf', 'singing teaspoon', 'mirror with no reflection'],
  twist: ['the villain is asking for help', 'the treasure wants to be lost', 'every lie becomes visible', 'the safest path moves backward', 'a stranger knows the ending', 'home has been following them'],
};

export const defaultWordBank: StoryDiceWordBank = normalizeWordBank(wordBank);

const workshopQuestions = [
  'What does the character do first to pursue the want?',
  'How does the obstacle make the setting harder to navigate?',
  'Where can the object or twist force a visible choice in the scene?',
];

const agendaPhases = [
  {
    name: 'Warm-up',
    minutes: 3,
    prompt: 'Read all six dice aloud and ask everyone to choose one image that feels alive.',
  },
  {
    name: 'Character choice',
    minutes: 5,
    prompt: 'Pair the character with the want and name the first choice they will make.',
  },
  {
    name: 'Draft',
    minutes: 10,
    prompt: 'Write one scene in the setting while the obstacle pushes back.',
  },
  {
    name: 'Share',
    minutes: 5,
    prompt: 'Read a favorite moment and name where the object or twist changed the scene.',
  },
  {
    name: 'Reflection',
    minutes: 2,
    prompt: 'Capture one revision question before the next sprint.',
  },
];

export function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (const char of seed.trim() || 'story-dice-lab') {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick(category: StoryDiceCategory, seed: string, salt = 0, bank: StoryDiceWordBank = defaultWordBank): string {
  const options = bank[category];
  const index = (hashSeed(`${seed}:${category}:${salt}`) + salt) % options.length;
  return options[index];
}

export function rollDice(
  seed: string,
  locked: Partial<Record<StoryDiceCategory, string>> = {},
  bank: StoryDiceWordBank = defaultWordBank,
): StoryDiceResult {
  const dice = Object.fromEntries(
    storyDiceCategories.map((category) => [category, locked[category] ?? pick(category, seed, 0, bank)]),
  ) as Record<StoryDiceCategory, string>;
  return { seed, dice };
}

export function rerollDie(
  result: StoryDiceResult,
  category: StoryDiceCategory,
  seed: string,
  bank: StoryDiceWordBank = defaultWordBank,
): StoryDiceResult {
  let next = result.dice[category];
  let salt = 1;
  while (next === result.dice[category] && salt < 20) {
    next = pick(category, `${seed}:${result.seed}`, salt, bank);
    salt += 1;
  }
  return {
    seed: `${seed}:${category}:${salt}`,
    dice: { ...result.dice, [category]: next },
  };
}

export function formatPrompt(result: StoryDiceResult): string {
  return storyDiceCategories.map((category) => `${category}: ${result.dice[category]}`).join('\n');
}

export function formatHandout(result: StoryDiceResult, options: HandoutOptions = {}): string {
  const title = options.title?.trim() || 'Story Dice Lab';
  const diceLines = storyDiceCategories.map((category, index) => {
    const label = category[0].toUpperCase() + category.slice(1);
    return `${index + 1}. ${label}: ${result.dice[category]}`;
  });

  return [
    title,
    `Seed: ${result.seed}`,
    '',
    'Dice',
    ...diceLines,
    '',
    'Workshop prompts',
    ...workshopQuestions.map((question, index) => `${index + 1}. ${question}`),
  ].join('\n');
}

export function formatFacilitatorAgenda(result: StoryDiceResult, options: FacilitatorAgendaOptions = {}): string {
  const title = options.title?.trim() || 'Story Dice Lab facilitator agenda';
  const totalMinutes = options.totalMinutes ?? 25;
  const minutes = scaleAgendaMinutes(totalMinutes);
  const diceLines = storyDiceCategories.map((category, index) => {
    const label = category[0].toUpperCase() + category.slice(1);
    return `${index + 1}. ${label}: ${result.dice[category]}`;
  });
  const phaseLines = agendaPhases.map((phase, index) => {
    return `${index + 1}. ${minutes[index]} min - ${phase.name}: ${phase.prompt}`;
  });

  return [
    title,
    `Seed: ${result.seed}`,
    '',
    'Dice',
    ...diceLines,
    '',
    `Timed scene sprint (${totalMinutes} minutes)`,
    ...phaseLines,
    '',
    'Facilitator notes',
    `- Character/want decision: ${result.dice.character} wants ${result.dice.want}; ask what action proves that want on the page.`,
    `- Obstacle/setting pressure: In the ${result.dice.setting}, ${result.dice.obstacle} should make the easy path harder.`,
    `- Object/twist turn: Use ${result.dice.object} when ${result.dice.twist} needs to force a visible choice.`,
  ].join('\n');
}

export function formatSceneBeatOutline(result: StoryDiceResult): string {
  const { character, want, setting, obstacle, object, twist } = result.dice;

  return [
    'Scene beat outline',
    `Seed: ${result.seed}`,
    '',
    `1. Opening image: In the ${setting}, the ${character} notices the ${object} before the scene starts moving.`,
    `2. Desire: The ${character} wants ${want} badly enough to act now.`,
    `3. Complication: ${capitalizeFirst(obstacle)} turns the ${setting} against that plan.`,
    `4. Turning point: When ${twist}, the ${object} forces the ${character} to choose a new tactic.`,
    `5. Ending hook: The choice changes what ${want} will cost next.`,
  ].join('\n');
}

export function normalizeFacilitatorAgendaControls(title: string, totalMinutes: string): FacilitatorAgendaOptions {
  const normalizedTitle = title.trim();
  const parsedMinutes = Number(totalMinutes);
  const options: FacilitatorAgendaOptions = {
    totalMinutes: Number.isInteger(parsedMinutes) && parsedMinutes >= agendaPhases.length ? parsedMinutes : 25,
  };

  if (normalizedTitle) {
    options.title = normalizedTitle;
  }

  return options;
}

export function formatFacilitatorAgendaControls(options: FacilitatorAgendaOptions = {}): string {
  const title = options.title?.trim() ?? '';
  const totalMinutes = options.totalMinutes ?? 25;

  return `<div class="agenda-controls" aria-labelledby="agenda-controls-title">
    <h2 id="agenda-controls-title">Facilitator agenda</h2>
    <p id="agenda-help">Set the agenda title and sprint length before copying the facilitator agenda.</p>
    <div class="agenda-fields">
      <div>
        <label class="agenda-field" for="agenda-title">Agenda title</label>
        <input id="agenda-title" value="${escapeHtml(title)}" aria-describedby="agenda-help" />
      </div>
      <div>
        <label class="agenda-field" for="agenda-minutes">Total minutes</label>
        <input id="agenda-minutes" type="number" min="${agendaPhases.length}" step="1" value="${totalMinutes}" aria-describedby="agenda-help" />
      </div>
    </div>
    <button id="copy-agenda" type="button">Copy agenda</button>
  </div>`;
}

export function formatMarkdownPrompt(result: StoryDiceResult): string {
  const diceLines = storyDiceCategories.map((category) => {
    const label = category[0].toUpperCase() + category.slice(1);
    return `- ${label}: ${escapeMarkdown(result.dice[category])}`;
  });

  return [
    '# Story prompt',
    '',
    `Seed: ${result.seed}`,
    '',
    ...diceLines,
    '',
    '## Workshop questions',
    '',
    ...workshopQuestions.map((question, index) => `${index + 1}. ${question}`),
  ].join('\n');
}

export function formatCopySource(result: StoryDiceResult, source: CopySource): string {
  if (source === 'handout') return formatHandout(result);
  if (source === 'outline') return formatSceneBeatOutline(result);
  return formatPrompt(result);
}

export function formatPrintSheet(result: StoryDiceResult, options: HandoutOptions = {}): PrintSheet {
  const title = options.title?.trim() || 'Story Dice Lab';
  return {
    title,
    seedLabel: 'Seed',
    seed: result.seed,
    dice: storyDiceCategories.map((category) => ({
      category: category[0].toUpperCase() + category.slice(1),
      value: result.dice[category],
    })),
    questions: [...workshopQuestions],
  };
}

export function printCurrentPrompt(target: BrowserPrintTarget): void {
  target.print();
}

export function normalizeWordBankJson(source: unknown): StoryDiceWordBank {
  if (typeof source === 'string') {
    try {
      return normalizeWordBank(JSON.parse(source) as unknown);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Word bank JSON is invalid: ${error.message}`);
      }
      throw error;
    }
  }

  return normalizeWordBank(source);
}

export function serializeWordBank(bank: StoryDiceWordBank = defaultWordBank): string {
  return JSON.stringify(normalizeWordBank(bank), null, 2);
}

export function encodeShareState(state: ShareState): string {
  const params = new URLSearchParams();
  params.set('seed', state.seed);
  const locked = [...state.locked].filter(isStoryDiceCategory).sort();
  if (locked.length > 0) params.set('locked', locked.join(','));
  return params.toString();
}

export function decodeShareState(query: string): ShareState {
  const params = new URLSearchParams(query.startsWith('#') || query.startsWith('?') ? query.slice(1) : query);
  const seed = params.get('seed') ?? 'moonlit workshop';
  const locked = new Set(
    (params.get('locked') ?? '')
      .split(',')
      .filter(isStoryDiceCategory),
  );
  return { seed, locked };
}

function isStoryDiceCategory(value: string): value is StoryDiceCategory {
  return storyDiceCategories.includes(value as StoryDiceCategory);
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_[\]{}()#+\-.!|>]/g, '\\$&');
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

function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function scaleAgendaMinutes(totalMinutes: number): number[] {
  if (!Number.isInteger(totalMinutes) || totalMinutes < agendaPhases.length) {
    throw new Error(`Facilitator agenda totalMinutes must be at least ${agendaPhases.length} minutes`);
  }

  const baseTotal = agendaPhases.reduce((sum, phase) => sum + phase.minutes, 0);
  const scaled = agendaPhases.map((phase) => Math.max(1, Math.round((phase.minutes / baseTotal) * totalMinutes)));
  let difference = totalMinutes - scaled.reduce((sum, minutes) => sum + minutes, 0);

  while (difference !== 0) {
    const candidates = scaled
      .map((minutes, index) => ({
        index,
        distance: minutes / agendaPhases[index].minutes - totalMinutes / baseTotal,
      }))
      .filter((candidate) => difference > 0 || scaled[candidate.index] > 1)
      .sort((first, second) => {
        const distance = difference > 0 ? first.distance - second.distance : second.distance - first.distance;
        return distance || first.index - second.index;
      });

    const next = candidates[0]?.index;
    if (next === undefined) break;
    scaled[next] += difference > 0 ? 1 : -1;
    difference += difference > 0 ? -1 : 1;
  }

  return scaled;
}

function normalizeWordBank(source: unknown): StoryDiceWordBank {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('Word bank must be a JSON object with character, want, setting, obstacle, object, and twist arrays');
  }

  const record = source as Record<string, unknown>;
  const errors: string[] = [];
  const normalized = {} as StoryDiceWordBank;

  for (const category of storyDiceCategories) {
    const entries = record[category];
    if (!Array.isArray(entries)) {
      errors.push(`${category} must be an array`);
      continue;
    }

    const invalidIndex = entries.findIndex((entry) => typeof entry !== 'string');
    if (invalidIndex >= 0) {
      errors.push(`${category} entry ${invalidIndex + 1} must be a string`);
      continue;
    }

    const values = [...new Set(entries.map((entry) => entry.trim()).filter(Boolean))];
    if (values.length === 0) {
      errors.push(`${category} must include at least one ${entries.length > 0 ? 'non-empty ' : ''}entry`);
      continue;
    }

    normalized[category] = values;
  }

  const unknownCategories = Object.keys(record).filter((key) => !isStoryDiceCategory(key));
  if (unknownCategories.length > 0) {
    errors.push(`unknown categories: ${unknownCategories.join(', ')}`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  return normalized;
}
