export type BackupConfirmation = (message: string) => boolean;

export type LocalBackupReminderInput = {
  actionLabel: string;
  itemCount: number;
  itemLabel: string;
};

export type LocalDestructiveActionInput = LocalBackupReminderInput & {
  confirm?: BackupConfirmation;
};

export type LocalDestructiveActionDecision =
  | {
      proceed: true;
      reminderShown: false;
    }
  | {
      proceed: boolean;
      reminderShown: true;
      message: string;
    };

export function formatLocalBackupReminderMessage(input: LocalBackupReminderInput): string {
  const count = Math.max(0, Math.floor(input.itemCount));
  const itemLabel = count === 1 ? input.itemLabel : `${input.itemLabel}s`;

  return `This will ${input.actionLabel} and remove ${count} ${itemLabel} stored only in this browser. Export or copy a backup first if you may need it. Continue?`;
}

export function shouldProceedWithLocalDestructiveAction(
  input: LocalDestructiveActionInput,
): LocalDestructiveActionDecision {
  if (input.itemCount <= 0 || !input.confirm) {
    return { proceed: true, reminderShown: false };
  }

  const message = formatLocalBackupReminderMessage(input);
  return {
    proceed: input.confirm(message),
    reminderShown: true,
    message,
  };
}

export function createBrowserBackupConfirmation(target: { confirm?: (message: string) => boolean }): BackupConfirmation | undefined {
  return typeof target.confirm === 'function' ? target.confirm.bind(target) : undefined;
}
