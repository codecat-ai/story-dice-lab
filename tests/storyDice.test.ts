import { describe, expect, it } from 'vitest';
import {
  decodeShareState,
  encodeShareState,
  formatCopySource,
  formatHandout,
  formatPrompt,
  normalizeWordBankJson,
  rerollDie,
  rollDice,
  serializeWordBank,
  type StoryDiceCategory,
  type StoryDiceWordBank,
} from '../src/storyDice';

const categories: StoryDiceCategory[] = [
  'character',
  'want',
  'setting',
  'obstacle',
  'object',
  'twist',
];

describe('story dice generation', () => {
  it('returns identical dice for the same seed', () => {
    expect(rollDice('moonlit workshop')).toEqual(rollDice('moonlit workshop'));
  });

  it('usually changes at least one die for a different seed', () => {
    const first = rollDice('moonlit workshop');
    const second = rollDice('rainy archive');

    expect(categories.some((category) => first.dice[category] !== second.dice[category])).toBe(true);
  });

  it('keeps locked dice stable during a reroll-all', () => {
    const first = rollDice('lantern map');
    const second = rollDice('lantern map next', {
      character: first.dice.character,
      object: first.dice.object,
    });

    expect(second.dice.character).toBe(first.dice.character);
    expect(second.dice.object).toBe(first.dice.object);
    expect(categories.some((category) => first.dice[category] !== second.dice[category])).toBe(true);
  });

  it('rerolls one die without changing other categories when possible', () => {
    const first = rollDice('clock tower');
    const second = rerollDie(first, 'twist', 'clock tower');

    expect(second.dice.twist).not.toBe(first.dice.twist);
    for (const category of categories.filter((category) => category !== 'twist')) {
      expect(second.dice[category]).toBe(first.dice[category]);
    }
  });

  it('formats a compact prompt with every category', () => {
    const result = rollDice('paper comet');
    const prompt = formatPrompt(result);

    for (const category of categories) {
      expect(prompt).toContain(`${category}: ${result.dice[category]}`);
    }
  });

  it('formats a deterministic printable workshop handout', () => {
    const result = rollDice('paper comet');

    expect(formatHandout(result, { title: 'Scene Sprint' })).toBe(`Scene Sprint
Seed: paper comet

Dice
1. Character: ${result.dice.character}
2. Want: ${result.dice.want}
3. Setting: ${result.dice.setting}
4. Obstacle: ${result.dice.obstacle}
5. Object: ${result.dice.object}
6. Twist: ${result.dice.twist}

Workshop prompts
1. What does the character do first to pursue the want?
2. How does the obstacle make the setting harder to navigate?
3. Where can the object or twist force a visible choice in the scene?`);

    expect(formatHandout(result)).toContain('Story Dice Lab\nSeed: paper comet');
  });

  it('provides the handout text as a clipboard copy source for the UI', () => {
    const result = rollDice('moonlit workshop');

    expect(formatCopySource(result, 'handout')).toBe(formatHandout(result));
    expect(formatCopySource(result, 'compact')).toBe(formatPrompt(result));
  });

  it('round-trips a shareable seed and locked category list', () => {
    const state = encodeShareState({
      seed: 'moonlit workshop',
      locked: new Set<StoryDiceCategory>(['setting', 'object']),
    });

    expect(state).toBe('seed=moonlit+workshop&locked=object%2Csetting');
    expect(decodeShareState(state)).toEqual({
      seed: 'moonlit workshop',
      locked: new Set<StoryDiceCategory>(['object', 'setting']),
    });
  });

  it('ignores unknown locked categories when reading a shared state', () => {
    expect(decodeShareState('seed=paper%20comet&locked=setting,theme,twist')).toEqual({
      seed: 'paper comet',
      locked: new Set<StoryDiceCategory>(['setting', 'twist']),
    });
  });

  it('normalizes a JSON word bank by trimming entries and removing duplicates', () => {
    const bank = normalizeWordBankJson(`{
      "character": [" curious pilot ", "curious pilot", "quiet baker"],
      "want": ["to find dawn"],
      "setting": ["clock market"],
      "obstacle": ["a locked moon"],
      "object": ["silver key"],
      "twist": ["the map is alive"]
    }`);

    expect(bank).toEqual({
      character: ['curious pilot', 'quiet baker'],
      want: ['to find dawn'],
      setting: ['clock market'],
      obstacle: ['a locked moon'],
      object: ['silver key'],
      twist: ['the map is alive'],
    });
  });

  it('rejects incomplete or invalid word banks with useful category errors', () => {
    expect(() =>
      normalizeWordBankJson({
        character: ['curious pilot'],
        want: ['to find dawn'],
        setting: [],
        obstacle: ['a locked moon'],
        object: ['silver key'],
      }),
    ).toThrow(/setting must include at least one entry; twist must be an array/);

    expect(() =>
      normalizeWordBankJson({
        character: ['curious pilot'],
        want: ['to find dawn'],
        setting: ['clock market'],
        obstacle: ['a locked moon'],
        object: ['silver key'],
        twist: ['   '],
      }),
    ).toThrow(/twist must include at least one non-empty entry/);
  });

  it('serializes a normalized word bank for export', () => {
    const bank: StoryDiceWordBank = {
      character: ['curious pilot'],
      want: ['to find dawn'],
      setting: ['clock market'],
      obstacle: ['a locked moon'],
      object: ['silver key'],
      twist: ['the map is alive'],
    };

    expect(serializeWordBank(bank)).toBe(`{
  "character": [
    "curious pilot"
  ],
  "want": [
    "to find dawn"
  ],
  "setting": [
    "clock market"
  ],
  "obstacle": [
    "a locked moon"
  ],
  "object": [
    "silver key"
  ],
  "twist": [
    "the map is alive"
  ]
}`);
  });

  it('uses custom word-bank values in deterministic rolls without breaking locked dice', () => {
    const customBank: StoryDiceWordBank = {
      character: ['custom hero'],
      want: ['custom want'],
      setting: ['custom setting'],
      obstacle: ['custom obstacle'],
      object: ['custom object'],
      twist: ['custom twist'],
    };
    const first = rollDice('custom seed', {}, customBank);
    const second = rollDice('custom seed', {}, customBank);
    const locked = rollDice(
      'different seed',
      {
        character: 'locked character',
        object: first.dice.object,
      },
      customBank,
    );

    expect(first).toEqual(second);
    expect(first.dice).toEqual({
      character: 'custom hero',
      want: 'custom want',
      setting: 'custom setting',
      obstacle: 'custom obstacle',
      object: 'custom object',
      twist: 'custom twist',
    });
    expect(locked.dice.character).toBe('locked character');
    expect(locked.dice.object).toBe('custom object');
    expect(locked.dice.want).toBe('custom want');
  });
});
