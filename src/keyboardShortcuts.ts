export type KeyboardShortcutAction =
  | 'rerollUnlockedDice'
  | 'toggleFocusedDieLock'
  | 'nextTimerPhase'
  | 'previousTimerPhase'
  | 'copyPrompt'
  | 'toggleHelp';

export type KeyboardShortcutEvent = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  target?: KeyboardShortcutTarget | null;
};

export type KeyboardShortcutTarget = {
  tagName?: string;
  isContentEditable?: boolean;
};

export type KeyboardShortcut = {
  key: string;
  action: KeyboardShortcutAction;
  description: string;
};

const shortcuts: KeyboardShortcut[] = [
  { key: 'r', action: 'rerollUnlockedDice', description: 'Reroll unlocked dice' },
  { key: 'l', action: 'toggleFocusedDieLock', description: 'Toggle lock for the focused die' },
  { key: ']', action: 'nextTimerPhase', description: 'Advance timer phase' },
  { key: '[', action: 'previousTimerPhase', description: 'Return to previous timer phase' },
  { key: 'c', action: 'copyPrompt', description: 'Copy current prompt' },
  { key: '?', action: 'toggleHelp', description: 'Show or hide keyboard shortcuts' },
];

const typingTags = new Set(['input', 'textarea', 'select']);

export function getKeyboardShortcutHelp(): KeyboardShortcut[] {
  return shortcuts.map((shortcut) => ({ ...shortcut }));
}

export function resolveKeyboardShortcut(event: KeyboardShortcutEvent): KeyboardShortcut | null {
  if (shouldIgnoreKeyboardShortcut(event)) return null;

  const normalizedKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  return shortcuts.find((shortcut) => shortcut.key === normalizedKey) ?? null;
}

export function shouldIgnoreKeyboardShortcut(event: KeyboardShortcutEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return true;

  const target = event.target;
  if (!target) return false;
  if (target.isContentEditable) return true;

  const tagName = target.tagName?.toLowerCase();
  return tagName ? typingTags.has(tagName) : false;
}
