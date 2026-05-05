export type StoryDiceCategory = 'character' | 'want' | 'setting' | 'obstacle' | 'object' | 'twist';

export type StoryDiceResult = {
  seed: string;
  dice: Record<StoryDiceCategory, string>;
};

export type CopySource = 'compact' | 'handout';

export type HandoutOptions = {
  title?: string;
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

const wordBank: Record<StoryDiceCategory, string[]> = {
  character: ['retired cartographer', 'curious beekeeper', 'apprentice locksmith', 'night gardener', 'runaway archivist', 'soft-spoken inventor'],
  want: ['to repair a broken promise', 'to find a missing doorway', 'to win one impossible argument', 'to return a borrowed name', 'to protect a tiny festival', 'to decode a humming letter'],
  setting: ['floating library', 'rain-lit train station', 'market under glass', 'island observatory', 'abandoned clock tower', 'greenhouse on wheels'],
  obstacle: ['a rule that changes hourly', 'a rival with the same map', 'a bridge that remembers insults', 'a storm made of whispers', 'a key split into rumors', 'a deadline at sunrise'],
  object: ['brass compass', 'folded paper comet', 'jar of blue sparks', 'threadbare red scarf', 'singing teaspoon', 'mirror with no reflection'],
  twist: ['the villain is asking for help', 'the treasure wants to be lost', 'every lie becomes visible', 'the safest path moves backward', 'a stranger knows the ending', 'home has been following them'],
};

export function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (const char of seed.trim() || 'story-dice-lab') {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick(category: StoryDiceCategory, seed: string, salt = 0): string {
  const options = wordBank[category];
  const index = (hashSeed(`${seed}:${category}:${salt}`) + salt) % options.length;
  return options[index];
}

export function rollDice(seed: string, locked: Partial<Record<StoryDiceCategory, string>> = {}): StoryDiceResult {
  const dice = Object.fromEntries(
    storyDiceCategories.map((category) => [category, locked[category] ?? pick(category, seed)]),
  ) as Record<StoryDiceCategory, string>;
  return { seed, dice };
}

export function rerollDie(result: StoryDiceResult, category: StoryDiceCategory, seed: string): StoryDiceResult {
  let next = result.dice[category];
  let salt = 1;
  while (next === result.dice[category] && salt < 20) {
    next = pick(category, `${seed}:${result.seed}`, salt);
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
    '1. What does the character do first to pursue the want?',
    '2. How does the obstacle make the setting harder to navigate?',
    '3. Where can the object or twist force a visible choice in the scene?',
  ].join('\n');
}

export function formatCopySource(result: StoryDiceResult, source: CopySource): string {
  return source === 'handout' ? formatHandout(result) : formatPrompt(result);
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
