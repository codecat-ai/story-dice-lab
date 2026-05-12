import { describe, expect, it } from 'vitest';
import {
  getKeyboardShortcutHelp,
  resolveKeyboardShortcut,
  shouldIgnoreKeyboardShortcut,
} from '../src/keyboardShortcuts';

describe('keyboard shortcuts', () => {
  it('maps live facilitation keys to explicit actions and help text', () => {
    expect(resolveKeyboardShortcut({ key: 'r' })?.action).toBe('rerollUnlockedDice');
    expect(resolveKeyboardShortcut({ key: 'R' })?.action).toBe('rerollUnlockedDice');
    expect(resolveKeyboardShortcut({ key: 'l' })?.action).toBe('toggleFocusedDieLock');
    expect(resolveKeyboardShortcut({ key: ']' })?.action).toBe('nextTimerPhase');
    expect(resolveKeyboardShortcut({ key: '[' })?.action).toBe('previousTimerPhase');
    expect(resolveKeyboardShortcut({ key: 'c' })?.action).toBe('copyPrompt');
    expect(resolveKeyboardShortcut({ key: '?' })?.action).toBe('toggleHelp');

    expect(getKeyboardShortcutHelp()).toEqual([
      { key: 'r', action: 'rerollUnlockedDice', description: 'Reroll unlocked dice' },
      { key: 'l', action: 'toggleFocusedDieLock', description: 'Toggle lock for the focused die' },
      { key: ']', action: 'nextTimerPhase', description: 'Advance timer phase' },
      { key: '[', action: 'previousTimerPhase', description: 'Return to previous timer phase' },
      { key: 'c', action: 'copyPrompt', description: 'Copy current prompt' },
      { key: '?', action: 'toggleHelp', description: 'Show or hide keyboard shortcuts' },
    ]);
  });

  it('ignores shortcuts from typing fields and editable content', () => {
    expect(shouldIgnoreKeyboardShortcut({ key: 'r', target: { tagName: 'input' } })).toBe(true);
    expect(shouldIgnoreKeyboardShortcut({ key: 'r', target: { tagName: 'TEXTAREA' } })).toBe(true);
    expect(shouldIgnoreKeyboardShortcut({ key: 'r', target: { tagName: 'select' } })).toBe(true);
    expect(shouldIgnoreKeyboardShortcut({ key: 'r', target: { tagName: 'div', isContentEditable: true } })).toBe(true);

    expect(resolveKeyboardShortcut({ key: 'r', target: { tagName: 'textarea' } })).toBeNull();
    expect(resolveKeyboardShortcut({ key: 'r', target: { tagName: 'button' } })?.action).toBe('rerollUnlockedDice');
  });

  it('ignores shortcuts when command modifiers are pressed', () => {
    expect(shouldIgnoreKeyboardShortcut({ key: 'c', ctrlKey: true })).toBe(true);
    expect(shouldIgnoreKeyboardShortcut({ key: 'c', metaKey: true })).toBe(true);
    expect(shouldIgnoreKeyboardShortcut({ key: 'c', altKey: true })).toBe(true);
    expect(shouldIgnoreKeyboardShortcut({ key: '?', shiftKey: true })).toBe(false);

    expect(resolveKeyboardShortcut({ key: 'c', ctrlKey: true })).toBeNull();
  });
});
