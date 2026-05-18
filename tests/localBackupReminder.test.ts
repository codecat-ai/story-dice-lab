import { describe, expect, it } from 'vitest';
import {
  createBrowserBackupConfirmation,
  formatLocalBackupReminderMessage,
  shouldProceedWithLocalDestructiveAction,
} from '../src/localBackupReminder';

describe('local backup reminders', () => {
  it('formats a concise browser-only reminder before deleting local data', () => {
    expect(
      formatLocalBackupReminderMessage({
        actionLabel: 'clear local session history',
        itemCount: 2,
        itemLabel: 'saved snapshot',
      }),
    ).toBe(
      'This will clear local session history and remove 2 saved snapshots stored only in this browser. Export or copy a backup first if you may need it. Continue?',
    );
  });

  it('asks for confirmation only when relevant local data may be lost', () => {
    const messages: string[] = [];
    const expectedMessage =
      'This will delete this word-bank preset and remove 1 word-bank preset stored only in this browser. Export or copy a backup first if you may need it. Continue?';

    const result = shouldProceedWithLocalDestructiveAction({
      actionLabel: 'delete this word-bank preset',
      itemCount: 1,
      itemLabel: 'word-bank preset',
      confirm: (message) => {
        messages.push(message);
        return false;
      },
    });

    expect(result).toEqual({
      proceed: false,
      reminderShown: true,
      message: expectedMessage,
    });
    expect(messages).toEqual([expectedMessage]);
  });

  it('allows destructive actions without prompting when there is no relevant local data', () => {
    const result = shouldProceedWithLocalDestructiveAction({
      actionLabel: 'clear imported templates',
      itemCount: 0,
      itemLabel: 'imported template',
      confirm: () => {
        throw new Error('confirm should not be called');
      },
    });

    expect(result).toEqual({ proceed: true, reminderShown: false });
  });

  it('allows destructive actions gracefully when confirmation is unavailable', () => {
    expect(
      shouldProceedWithLocalDestructiveAction({
        actionLabel: 'clear local session history',
        itemCount: 3,
        itemLabel: 'saved snapshot',
      }),
    ).toEqual({ proceed: true, reminderShown: false });
  });

  it('wraps browser confirm only when available', () => {
    const calls: string[] = [];
    const wrapped = createBrowserBackupConfirmation({
      confirm: (message: string) => {
        calls.push(message);
        return true;
      },
    });

    expect(wrapped?.('Back up first?')).toBe(true);
    expect(calls).toEqual(['Back up first?']);
    expect(createBrowserBackupConfirmation({})).toBeUndefined();
  });
});
