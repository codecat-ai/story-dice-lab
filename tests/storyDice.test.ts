import { describe, expect, it } from 'vitest';
import {
  decodeShareState,
  encodeShareState,
  formatCopySource,
  formatHandout,
  formatPrompt,
  rerollDie,
  rollDice,
  type StoryDiceCategory,
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
});
