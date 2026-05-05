import { describe, expect, it } from 'vitest';
import {
  decodeShareState,
  encodeShareState,
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
