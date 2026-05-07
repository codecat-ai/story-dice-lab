export type StoryDiceCategory = 'character' | 'want' | 'setting' | 'obstacle' | 'object' | 'twist';

export type StoryDiceResult = {
  seed: string;
  dice: Record<StoryDiceCategory, string>;
};

export type StoryDiceWordBank = Record<StoryDiceCategory, string[]>;

export type CopySource = 'compact' | 'handout';

export type HandoutOptions = {
  title?: string;
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
  return source === 'handout' ? formatHandout(result) : formatPrompt(result);
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
