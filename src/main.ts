import {
  decodeShareState,
  defaultWordBank,
  encodeShareState,
  formatActionPlanControls,
  formatCopySource,
  formatExportActionControls,
  formatFacilitatorAgendaControls,
  formatFacilitatorAgenda,
  formatFacilitatorTimerDisplay,
  formatHandout,
  formatMarkdownPrompt,
  formatPeerRoleCardPrintLayout,
  formatPeerRoleCards,
  formatPeerRoleCardsControls,
  formatPrintSheet,
  formatPrompt,
  formatRevisionCardPrintLayout,
  formatRevisionActionPlan,
  formatSceneBeatOutline,
  formatRevisionCards,
  formatRevisionCardsControls,
  formatTimerCards,
  formatTimerCardPrintLayout,
  normalizeActionPlanControls,
  normalizePeerRoleCardsControls,
  normalizeFacilitatorAgendaControls,
  normalizeRevisionCardsControls,
  normalizeWordBankJson,
  printCurrentPrompt,
  resolveFacilitatorTimerPhase,
  rerollDie,
  rollDice,
  serializeWordBank,
  storyDiceCategories,
  type StoryDiceCategory,
  type StoryDiceWordBank,
} from './storyDice';
import { getKeyboardShortcutHelp, resolveKeyboardShortcut, type KeyboardShortcutAction } from './keyboardShortcuts';
import {
  applyClassroomSessionTemplate,
  formatClassroomSessionTemplateControls,
  listClassroomSessionTemplates,
} from './classroomSessionTemplates';
import {
  deleteWordBankPreset,
  formatWordBankPresetControls,
  listWordBankPresets,
  loadWordBankPreset,
  saveWordBankPreset,
  type WordBankPreset,
} from './wordBankPresets';
import {
  formatSessionSnapshot,
  printSessionSnapshot,
  type SessionSnapshotArtifact,
  type SessionSnapshotOptions,
} from './sessionSnapshot';
import {
  clearSessionHistory,
  exportSessionHistoryJson,
  filterSessionHistory,
  formatSessionHistoryControls,
  formatSessionHistoryList,
  loadSessionHistory,
  replaceSessionHistoryFromJson,
  saveSessionSnapshotToHistory,
  type SessionHistoryArchiveLabel,
  type SessionHistoryItem,
} from './sessionHistory';
import './styles.css';

const appRoot = document.querySelector<HTMLDivElement>('#app');
if (!appRoot) throw new Error('App root not found');
const app = appRoot;

let seed = 'moonlit workshop';
const shared = decodeShareState(window.location.hash);
seed = shared.seed;
let currentWordBank: StoryDiceWordBank = defaultWordBank;
let wordBankText = serializeWordBank(currentWordBank);
let wordBankStatus = 'Using the built-in word bank.';
const classroomSessionTemplates = listClassroomSessionTemplates();
let selectedClassroomTemplateId = classroomSessionTemplates[0]?.id ?? '';
let classroomTemplateStatus = 'Choose a classroom template to prefill seed, word bank, and agenda timing.';
let wordBankPresetName = '';
let wordBankPresetNotes = '';
let selectedWordBankPresetName = '';
let wordBankPresets: WordBankPreset[] = readWordBankPresets();
let agendaTitle = '';
let agendaTotalMinutes = '25';
let revisionCardsTitle = '';
let peerRoleCardsTitle = '';
let actionPlanTitle = '';
let timerPhaseIndex = 0;
let result = rollDice(seed, {}, currentWordBank);
const locked = shared.locked;
let printTarget: 'prompt' | 'timer-cards' | 'revision-cards' | 'peer-role-cards' = 'prompt';
type SnapshotArtifactId = 'outline' | 'handout' | 'agenda' | 'timerCards' | 'revisionCards' | 'peerRoleCards' | 'actionPlan';
const selectedSnapshotArtifacts = new Set<SnapshotArtifactId>(['agenda', 'actionPlan']);
let shortcutHelpVisible = false;
let shortcutStatus = 'Keyboard shortcuts are available. Press ? or use the help button to view them.';
let sessionHistoryItems: SessionHistoryItem[] = [];
let sessionHistoryStatus = 'No local session snapshots saved yet.';
let sessionHistoryImportText = '';
let sessionHistoryTagInput = '';
let sessionHistoryArchiveLabel: SessionHistoryArchiveLabel = '';
let sessionHistoryTagFilter = '';
let sessionHistoryArchiveFilter: SessionHistoryArchiveLabel = '';
let sessionHistorySearchQuery = '';
let selectedSessionHistoryItemId = '';
refreshSessionHistory();

function render(): void {
  const agendaOptions = normalizeFacilitatorAgendaControls(agendaTitle, agendaTotalMinutes);
  const revisionCardsOptions = normalizeRevisionCardsControls(revisionCardsTitle);
  const peerRoleCardsOptions = normalizePeerRoleCardsControls(peerRoleCardsTitle);
  const actionPlanOptions = normalizeActionPlanControls(actionPlanTitle);

  app.innerHTML = `
    <main class="shell print-${printTarget}">
      <section class="hero">
        <p class="eyebrow">Local-first creative prompt dice</p>
        <h1>Story Dice Lab</h1>
        <p>Roll six reproducible story prompts for workshops, classrooms, tabletop sessions, or solo writing warmups.</p>
        <label class="seed-label">Seed
          <input id="seed" value="${escapeHtml(seed)}" aria-label="Prompt seed" />
        </label>
        ${formatClassroomSessionTemplateControls(classroomSessionTemplates, {
          selectedId: selectedClassroomTemplateId,
          statusMessage: classroomTemplateStatus,
        })}
        ${formatExportActionControls()}
        ${snapshotControls()}
        ${formatSessionHistoryControls(
          visibleSessionHistoryItems(),
          sessionHistoryStatus,
          sessionHistoryImportText,
          sessionHistoryTagInput,
          sessionHistoryArchiveLabel,
          sessionHistoryTagFilter,
          sessionHistoryArchiveFilter,
          sessionHistorySearchQuery,
          selectedSessionHistoryItemId,
        )}
        ${formatRevisionCardsControls(revisionCardsOptions)}
        ${formatPeerRoleCardsControls(peerRoleCardsOptions)}
        ${formatActionPlanControls(actionPlanOptions)}
        ${formatFacilitatorAgendaControls(agendaOptions)}
        ${shortcutControls()}
      </section>
      <section class="dice-grid" aria-label="Story dice results">
        ${storyDiceCategories.map((category) => dieCard(category)).join('')}
      </section>
      <section class="prompt-card">
        <h2>Prompt text</h2>
        <pre>${escapeHtml(formatPrompt(result))}</pre>
      </section>
      <section class="prompt-card">
        <h2>Scene beat outline</h2>
        <pre>${escapeHtml(formatSceneBeatOutline(result))}</pre>
      </section>
      <section class="prompt-card word-bank-card">
        <h2>Custom word bank</h2>
        <label class="word-bank-label" for="word-bank-json">JSON word bank</label>
        <textarea id="word-bank-json" rows="12" spellcheck="false">${escapeHtml(wordBankText)}</textarea>
        <div class="actions">
          <button id="import-bank" type="button">Import word bank</button>
          <button id="export-bank" type="button">Copy/export word bank</button>
        </div>
        ${formatWordBankPresetControls(wordBankPresets, {
          currentName: wordBankPresetName,
          currentNote: wordBankPresetNotes,
          selectedName: selectedWordBankPresetName,
        })}
        <p class="status" role="status">${escapeHtml(wordBankStatus)}</p>
      </section>
      <section class="prompt-card">
        <h2>Workshop handout</h2>
        <pre>${escapeHtml(formatHandout(result))}</pre>
      </section>
      <section class="prompt-card">
        <h2>Facilitator agenda</h2>
        <pre id="agenda-preview">${escapeHtml(formatFacilitatorAgenda(result, agendaOptions))}</pre>
      </section>
      ${formatFacilitatorTimerDisplay(result, timerPhaseIndex, agendaOptions)}
      <section class="prompt-card">
        <h2>Action plan</h2>
        <pre id="action-plan-preview">${escapeHtml(formatRevisionActionPlan(result, actionPlanOptions))}</pre>
      </section>
      ${printSheet()}
      ${revisionCardPrintSheet(revisionCardsOptions)}
      ${peerRoleCardPrintSheet(peerRoleCardsOptions)}
      ${timerCardPrintSheet(agendaOptions)}
    </main>`;

  document.querySelector<HTMLInputElement>('#seed')?.addEventListener('input', (event) => {
    seed = (event.target as HTMLInputElement).value;
  });
  document.querySelector<HTMLSelectElement>('#template-select')?.addEventListener('change', (event) => {
    selectedClassroomTemplateId = (event.target as HTMLSelectElement).value;
  });
  document.querySelector<HTMLButtonElement>('#apply-template')?.addEventListener('click', () => {
    const applied = applyClassroomSessionTemplate(selectedClassroomTemplateId);
    classroomTemplateStatus = applied.statusMessage;
    if (applied.ok) {
      seed = applied.seed;
      currentWordBank = applied.wordBank;
      wordBankText = applied.wordBankText;
      agendaTitle = applied.agendaTitle;
      agendaTotalMinutes = applied.agendaTotalMinutes;
      timerPhaseIndex = applied.timerPhaseIndex;
      locked.clear();
      result = applied.result;
      wordBankStatus = 'Using the classroom template word bank.';
    }
    render();
  });
  document.querySelector<HTMLButtonElement>('#roll-all')?.addEventListener('click', () => {
    rerollUnlockedDice();
  });
  document.querySelector<HTMLButtonElement>('#copy')?.addEventListener('click', async () => {
    await copyText(formatCopySource(result, 'compact'));
  });
  document.querySelector<HTMLButtonElement>('#shortcut-help-toggle')?.addEventListener('click', () => {
    toggleShortcutHelp();
  });
  document.querySelector<HTMLButtonElement>('#copy-outline')?.addEventListener('click', async () => {
    await copyText(formatCopySource(result, 'outline'));
  });
  document.querySelector<HTMLButtonElement>('#copy-handout')?.addEventListener('click', async () => {
    await copyText(formatCopySource(result, 'handout'));
  });
  document.querySelector<HTMLButtonElement>('#copy-session-snapshot')?.addEventListener('click', async () => {
    await copyText(formatCurrentSessionSnapshot());
    shortcutStatus = 'Copied session snapshot.';
    render();
  });
  document.querySelector<HTMLButtonElement>('#print-session-snapshot')?.addEventListener('click', () => {
    const printWindow = window.open('', 'story-dice-lab-session-snapshot-print', 'popup,width=800,height=900');
    if (!printWindow) {
      shortcutStatus = 'Browser popup blocking prevented the session snapshot print view.';
      render();
      return;
    }

    printSessionSnapshot(printWindow, currentSessionSnapshotOptions());
    shortcutStatus = 'Opened session snapshot print view.';
    render();
  });
  document.querySelector<HTMLButtonElement>('#save-session-history')?.addEventListener('click', () => {
    const saveResult = saveSessionSnapshotToHistory(getSessionHistoryStorage(), {
      title: formatSessionHistoryTitle(),
      content: formatCurrentSessionSnapshot(),
      tags: sessionHistoryTagInput,
      archiveLabel: sessionHistoryArchiveLabel,
    });
    sessionHistoryItems = saveResult.items;
    if (saveResult.ok) {
      sessionHistoryTagFilter = '';
      selectedSessionHistoryItemId = saveResult.item.id;
    }
    sessionHistoryStatus = saveResult.ok
      ? `Saved "${saveResult.item.title}" to local session history.`
      : saveResult.warning;
    render();
  });
  document.querySelector<HTMLButtonElement>('#copy-session-history')?.addEventListener('click', async () => {
    await copyText(formatSessionHistoryList(visibleSessionHistoryItems()));
    sessionHistoryStatus = 'Copied local session history list.';
    render();
  });
  document.querySelector<HTMLButtonElement>('#copy-session-history-json')?.addEventListener('click', async () => {
    await copyText(exportSessionHistoryJson(visibleSessionHistoryItems()));
    sessionHistoryStatus = 'Copied local session history JSON.';
    render();
  });
  document.querySelector<HTMLInputElement>('#session-history-tags')?.addEventListener('input', (event) => {
    sessionHistoryTagInput = (event.target as HTMLInputElement).value;
  });
  document.querySelector<HTMLSelectElement>('#session-history-archive-label')?.addEventListener('change', (event) => {
    sessionHistoryArchiveLabel = normalizeSessionHistoryArchiveValue((event.target as HTMLSelectElement).value);
  });
  document.querySelector<HTMLSelectElement>('#session-history-tag-filter')?.addEventListener('change', (event) => {
    sessionHistoryTagFilter = (event.target as HTMLSelectElement).value;
    selectedSessionHistoryItemId = '';
    render();
  });
  document.querySelector<HTMLSelectElement>('#session-history-archive-filter')?.addEventListener('change', (event) => {
    sessionHistoryArchiveFilter = normalizeSessionHistoryArchiveValue((event.target as HTMLSelectElement).value);
    selectedSessionHistoryItemId = '';
    render();
  });
  document.querySelector<HTMLInputElement>('#session-history-search')?.addEventListener('input', (event) => {
    sessionHistorySearchQuery = (event.target as HTMLInputElement).value;
    selectedSessionHistoryItemId = '';
    render();
  });
  document.querySelectorAll<HTMLButtonElement>('[data-session-history-detail-id]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedSessionHistoryItemId = button.dataset.sessionHistoryDetailId ?? '';
      sessionHistoryStatus = selectedSessionHistoryItemId
        ? 'Selected saved snapshot details. The current roll was not changed.'
        : sessionHistoryStatus;
      render();
    });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-session-history-detail-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const item = findVisibleSessionHistoryItem(button.dataset.sessionHistoryDetailCopy);
      if (!item) {
        sessionHistoryStatus = 'That saved snapshot is not visible with the current history filter.';
        render();
        return;
      }

      await copyText(item.content);
      sessionHistoryStatus = `Copied saved snapshot "${item.title}". The current roll was not changed.`;
      render();
    });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-session-history-detail-print]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = findVisibleSessionHistoryItem(button.dataset.sessionHistoryDetailPrint);
      if (!item) {
        sessionHistoryStatus = 'That saved snapshot is not visible with the current history filter.';
        render();
        return;
      }

      const printWindow = window.open('', 'story-dice-lab-session-history-print', 'popup,width=800,height=900');
      if (!printWindow) {
        sessionHistoryStatus = 'Browser popup blocking prevented the saved snapshot print view.';
        render();
        return;
      }

      printSessionHistoryItem(printWindow, item);
      sessionHistoryStatus = `Opened saved snapshot "${item.title}" print view. The current roll was not changed.`;
      render();
    });
  });
  document.querySelector<HTMLTextAreaElement>('#session-history-import-json')?.addEventListener('input', (event) => {
    sessionHistoryImportText = (event.target as HTMLTextAreaElement).value;
  });
  document.querySelector<HTMLButtonElement>('#import-session-history')?.addEventListener('click', () => {
    const importResult = replaceSessionHistoryFromJson(getSessionHistoryStorage(), sessionHistoryImportText);
    if (importResult.ok) {
      sessionHistoryItems = importResult.items;
      sessionHistoryImportText = '';
      sessionHistoryTagFilter = '';
      sessionHistoryArchiveFilter = '';
      sessionHistorySearchQuery = '';
      selectedSessionHistoryItemId = '';
      sessionHistoryStatus = `Imported ${importResult.items.length} local session snapshots.`;
    } else {
      sessionHistoryStatus = importResult.warning;
    }
    render();
  });
  document.querySelector<HTMLButtonElement>('#clear-session-history')?.addEventListener('click', () => {
    const clearResult = clearSessionHistory(getSessionHistoryStorage());
    sessionHistoryItems = clearResult.items;
    sessionHistoryTagFilter = '';
    sessionHistoryArchiveFilter = '';
    sessionHistorySearchQuery = '';
    selectedSessionHistoryItemId = '';
    sessionHistoryStatus = clearResult.warning ?? 'Cleared local session history.';
    render();
  });
  document.querySelectorAll<HTMLInputElement>('[data-snapshot-artifact]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const artifactId = checkbox.dataset.snapshotArtifact as SnapshotArtifactId | undefined;
      if (!artifactId) return;
      if (checkbox.checked) selectedSnapshotArtifacts.add(artifactId);
      else selectedSnapshotArtifacts.delete(artifactId);
    });
  });
  document.querySelector<HTMLButtonElement>('#copy-revision-cards')?.addEventListener('click', async () => {
    await copyText(formatRevisionCards(result, normalizeRevisionCardsControls(revisionCardsTitle)));
  });
  document.querySelector<HTMLButtonElement>('#print-revision-cards')?.addEventListener('click', () => {
    printTarget = 'revision-cards';
    render();
    requestAnimationFrame(() => printCurrentPrompt(window));
  });
  document.querySelector<HTMLInputElement>('#revision-card-title')?.addEventListener('input', (event) => {
    revisionCardsTitle = (event.target as HTMLInputElement).value;
  });
  document.querySelector<HTMLButtonElement>('#copy-peer-role-cards')?.addEventListener('click', async () => {
    await copyText(formatPeerRoleCards(result, normalizePeerRoleCardsControls(peerRoleCardsTitle)));
  });
  document.querySelector<HTMLButtonElement>('#print-peer-role-cards')?.addEventListener('click', () => {
    printTarget = 'peer-role-cards';
    render();
    requestAnimationFrame(() => printCurrentPrompt(window));
  });
  document.querySelector<HTMLInputElement>('#peer-role-card-title')?.addEventListener('input', (event) => {
    peerRoleCardsTitle = (event.target as HTMLInputElement).value;
  });
  document.querySelector<HTMLInputElement>('#action-plan-title')?.addEventListener('input', (event) => {
    actionPlanTitle = (event.target as HTMLInputElement).value;
    updateActionPlanPreview();
  });
  document.querySelector<HTMLButtonElement>('#copy-action-plan')?.addEventListener('click', async () => {
    await copyText(formatRevisionActionPlan(result, normalizeActionPlanControls(actionPlanTitle)));
  });
  document.querySelector<HTMLInputElement>('#agenda-title')?.addEventListener('input', (event) => {
    agendaTitle = (event.target as HTMLInputElement).value;
    updateAgendaPreview();
    updateFacilitatorTimerDisplay();
  });
  document.querySelector<HTMLInputElement>('#agenda-minutes')?.addEventListener('input', (event) => {
    agendaTotalMinutes = (event.target as HTMLInputElement).value;
    updateAgendaPreview();
    updateFacilitatorTimerDisplay();
  });
  document.querySelector<HTMLButtonElement>('#copy-agenda')?.addEventListener('click', async () => {
    await copyText(
      formatFacilitatorAgenda(result, normalizeFacilitatorAgendaControls(agendaTitle, agendaTotalMinutes)),
    );
  });
  document.querySelector<HTMLButtonElement>('#copy-timer-cards')?.addEventListener('click', async () => {
    await copyText(formatTimerCards(result, normalizeFacilitatorAgendaControls(agendaTitle, agendaTotalMinutes)));
  });
  document.querySelector<HTMLButtonElement>('#print-timer-cards')?.addEventListener('click', () => {
    printTarget = 'timer-cards';
    render();
    requestAnimationFrame(() => printCurrentPrompt(window));
  });
  wireFacilitatorTimerControls();
  document.querySelector<HTMLButtonElement>('#copy-markdown')?.addEventListener('click', async () => {
    await copyText(formatMarkdownPrompt(result));
  });
  document.querySelector<HTMLButtonElement>('#print-prompt')?.addEventListener('click', () => {
    printTarget = 'prompt';
    setPrintTarget();
    printCurrentPrompt(window);
  });
  document.querySelector<HTMLButtonElement>('#share')?.addEventListener('click', async () => {
    syncLocationHash();
    await copyText(window.location.href);
  });
  document.querySelector<HTMLTextAreaElement>('#word-bank-json')?.addEventListener('input', (event) => {
    wordBankText = (event.target as HTMLTextAreaElement).value;
  });
  document.querySelector<HTMLInputElement>('#preset-name')?.addEventListener('input', (event) => {
    wordBankPresetName = (event.target as HTMLInputElement).value;
  });
  document.querySelector<HTMLTextAreaElement>('#preset-notes')?.addEventListener('input', (event) => {
    wordBankPresetNotes = (event.target as HTMLTextAreaElement).value;
  });
  document.querySelector<HTMLSelectElement>('#preset-select')?.addEventListener('change', (event) => {
    const select = event.target as HTMLSelectElement;
    selectedWordBankPresetName = select.value;
    wordBankPresetNotes = select.selectedOptions[0]?.dataset.notes ?? '';
    const notesInput = document.querySelector<HTMLTextAreaElement>('#preset-notes');
    if (notesInput) notesInput.value = wordBankPresetNotes;
  });
  document.querySelector<HTMLButtonElement>('#import-bank')?.addEventListener('click', () => {
    try {
      currentWordBank = normalizeWordBankJson(wordBankText);
      wordBankText = serializeWordBank(currentWordBank);
      const preserved = Object.fromEntries([...locked].map((category) => [category, result.dice[category]]));
      result = rollDice(seed, preserved, currentWordBank);
      timerPhaseIndex = 0;
      wordBankStatus = 'Imported custom word bank. Locked dice were preserved.';
    } catch (error) {
      wordBankStatus = error instanceof Error ? error.message : 'Word bank import failed.';
    }
    render();
  });
  document.querySelector<HTMLButtonElement>('#export-bank')?.addEventListener('click', async () => {
    wordBankText = serializeWordBank(currentWordBank);
    await copyText(wordBankText);
    wordBankStatus = 'Copied normalized word bank JSON.';
    render();
  });
  document.querySelector<HTMLButtonElement>('#save-preset')?.addEventListener('click', () => {
    const storage = getWordBankPresetStorage();
    if (!storage) {
      wordBankStatus = 'Local storage is unavailable, so the preset could not be saved.';
      render();
      return;
    }

    try {
      currentWordBank = normalizeWordBankJson(wordBankText);
      wordBankText = serializeWordBank(currentWordBank);
    } catch (error) {
      wordBankStatus = error instanceof Error ? error.message : 'Word bank preset save failed.';
      render();
      return;
    }

    const saveResult = saveWordBankPreset(storage, wordBankPresetName, currentWordBank, wordBankPresetNotes);
    if (saveResult.ok) {
      selectedWordBankPresetName = saveResult.name;
      wordBankPresetName = saveResult.name;
      wordBankPresets = listWordBankPresets(storage);
      wordBankPresetNotes = wordBankPresets.find((preset) => preset.name === saveResult.name)?.notes ?? '';
      const preserved = Object.fromEntries([...locked].map((category) => [category, result.dice[category]]));
      result = rollDice(seed, preserved, currentWordBank);
      timerPhaseIndex = 0;
      wordBankStatus = saveResult.overwritten
        ? `Updated local preset "${saveResult.name}". Locked dice were preserved.`
        : `Saved local preset "${saveResult.name}". Locked dice were preserved.`;
    } else {
      wordBankStatus = saveResult.reason;
    }
    render();
  });
  document.querySelector<HTMLButtonElement>('#load-preset')?.addEventListener('click', () => {
    const storage = getWordBankPresetStorage();
    if (!storage) {
      wordBankStatus = 'Local storage is unavailable, so presets cannot be loaded.';
      render();
      return;
    }

    const presetName = selectedWordBankPresetName || wordBankPresets[0]?.name || '';
    const loadResult = loadWordBankPreset(storage, presetName);
    if (loadResult.ok) {
      currentWordBank = loadResult.wordBank;
      wordBankText = serializeWordBank(currentWordBank);
      wordBankPresetName = loadResult.name;
      wordBankPresetNotes = loadResult.notes;
      selectedWordBankPresetName = loadResult.name;
      const preserved = Object.fromEntries([...locked].map((category) => [category, result.dice[category]]));
      result = rollDice(seed, preserved, currentWordBank);
      timerPhaseIndex = 0;
      wordBankStatus = `Loaded local preset "${loadResult.name}". Locked dice were preserved.`;
    } else {
      wordBankStatus = loadResult.reason;
      wordBankPresets = listWordBankPresets(storage);
    }
    render();
  });
  document.querySelector<HTMLButtonElement>('#delete-preset')?.addEventListener('click', () => {
    const storage = getWordBankPresetStorage();
    if (!storage) {
      wordBankStatus = 'Local storage is unavailable, so the preset could not be deleted.';
      render();
      return;
    }

    const presetName = selectedWordBankPresetName || wordBankPresets[0]?.name || '';
    const deleteResult = deleteWordBankPreset(storage, presetName);
    if (deleteResult.ok) {
      wordBankPresets = listWordBankPresets(storage);
      selectedWordBankPresetName = wordBankPresets[0]?.name ?? '';
      wordBankPresetNotes = wordBankPresets.find((preset) => preset.name === selectedWordBankPresetName)?.notes ?? '';
      if (wordBankPresetName === deleteResult.name) wordBankPresetName = '';
      wordBankStatus = `Deleted local preset "${deleteResult.name}". Current word bank was not changed.`;
    } else {
      wordBankStatus = deleteResult.reason;
    }
    render();
  });
  for (const category of storyDiceCategories) {
    document.querySelector<HTMLButtonElement>(`[data-reroll="${category}"]`)?.addEventListener('click', () => {
      result = rerollDie(result, category, `${seed}:${Date.now()}`, currentWordBank);
      timerPhaseIndex = 0;
      render();
    });
    document.querySelector<HTMLInputElement>(`[data-lock="${category}"]`)?.addEventListener('change', (event) => {
      if ((event.target as HTMLInputElement).checked) locked.add(category);
      else locked.delete(category);
      render();
    });
  }
}

document.addEventListener('keydown', (event) => {
  const target = event.target instanceof HTMLElement ? event.target : null;
  const shortcut = resolveKeyboardShortcut({
    key: event.key,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    target: target
      ? {
          tagName: target.tagName,
          isContentEditable: target.isContentEditable || Boolean(target.closest('[contenteditable="true"]')),
        }
      : null,
  });
  if (!shortcut) return;

  event.preventDefault();
  void runKeyboardShortcut(shortcut.action);
});

async function runKeyboardShortcut(action: KeyboardShortcutAction): Promise<void> {
  if (action === 'rerollUnlockedDice') {
    rerollUnlockedDice('Rerolled unlocked dice with keyboard shortcut r.');
  } else if (action === 'toggleFocusedDieLock') {
    toggleFocusedDieLock();
  } else if (action === 'nextTimerPhase') {
    showNextTimerPhase();
  } else if (action === 'previousTimerPhase') {
    showPreviousTimerPhase();
  } else if (action === 'copyPrompt') {
    await copyText(formatCopySource(result, 'compact'));
    shortcutStatus = 'Copied current prompt with keyboard shortcut c.';
    render();
  } else {
    toggleShortcutHelp();
  }
}

function rerollUnlockedDice(status = 'Rerolled unlocked dice.'): void {
  const preserved = Object.fromEntries([...locked].map((category) => [category, result.dice[category]]));
  result = rollDice(`${seed}:${Date.now()}`, preserved, currentWordBank);
  timerPhaseIndex = 0;
  shortcutStatus = status;
  render();
}

function toggleFocusedDieLock(): void {
  const category = getFocusedDieCategory();
  if (!category) {
    shortcutStatus = 'Focus a die card or one of its controls before pressing l to toggle lock.';
    render();
    return;
  }

  if (locked.has(category)) {
    locked.delete(category);
    shortcutStatus = `Unlocked ${category} die with keyboard shortcut l.`;
  } else {
    locked.add(category);
    shortcutStatus = `Locked ${category} die with keyboard shortcut l.`;
  }
  render();
  focusDie(category);
}

function showNextTimerPhase(): void {
  const phase = resolveFacilitatorTimerPhase(
    result,
    timerPhaseIndex,
    normalizeFacilitatorAgendaControls(agendaTitle, agendaTotalMinutes),
  );
  timerPhaseIndex = phase.nextIndex;
  const nextPhase = resolveFacilitatorTimerPhase(
    result,
    timerPhaseIndex,
    normalizeFacilitatorAgendaControls(agendaTitle, agendaTotalMinutes),
  );
  shortcutStatus = `Timer phase: ${nextPhase.phaseLabel}, ${nextPhase.name}.`;
  updateFacilitatorTimerDisplay();
  updateShortcutStatus();
}

function showPreviousTimerPhase(): void {
  const phase = resolveFacilitatorTimerPhase(
    result,
    timerPhaseIndex,
    normalizeFacilitatorAgendaControls(agendaTitle, agendaTotalMinutes),
  );
  timerPhaseIndex = phase.previousIndex;
  const previousPhase = resolveFacilitatorTimerPhase(
    result,
    timerPhaseIndex,
    normalizeFacilitatorAgendaControls(agendaTitle, agendaTotalMinutes),
  );
  shortcutStatus = `Timer phase: ${previousPhase.phaseLabel}, ${previousPhase.name}.`;
  updateFacilitatorTimerDisplay();
  updateShortcutStatus();
}

function toggleShortcutHelp(): void {
  shortcutHelpVisible = !shortcutHelpVisible;
  shortcutStatus = shortcutHelpVisible ? 'Keyboard shortcuts help is visible.' : 'Keyboard shortcuts help is hidden.';
  render();
}

function getFocusedDieCategory(): StoryDiceCategory | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return null;

  const category = active.closest<HTMLElement>('[data-die-category]')?.dataset.dieCategory;
  return category && storyDiceCategories.includes(category as StoryDiceCategory) ? (category as StoryDiceCategory) : null;
}

function focusDie(category: StoryDiceCategory): void {
  document.querySelector<HTMLElement>(`[data-die-category="${category}"]`)?.focus();
}

function setPrintTarget(): void {
  document.querySelector('.shell')?.classList.toggle('print-timer-cards', printTarget === 'timer-cards');
  document.querySelector('.shell')?.classList.toggle('print-revision-cards', printTarget === 'revision-cards');
  document.querySelector('.shell')?.classList.toggle('print-peer-role-cards', printTarget === 'peer-role-cards');
  document.querySelector('.shell')?.classList.toggle('print-prompt', printTarget === 'prompt');
}

function wireFacilitatorTimerControls(): void {
  document.querySelector<HTMLButtonElement>('#timer-prev')?.addEventListener('click', () => {
    showPreviousTimerPhase();
  });
  document.querySelector<HTMLButtonElement>('#timer-reset')?.addEventListener('click', () => {
    timerPhaseIndex = 0;
    shortcutStatus = 'Timer phase reset to Phase 1 of 5, Warm-up.';
    updateFacilitatorTimerDisplay();
    updateShortcutStatus();
  });
  document.querySelector<HTMLButtonElement>('#timer-next')?.addEventListener('click', () => {
    showNextTimerPhase();
  });
}

function shortcutControls(): string {
  const expanded = shortcutHelpVisible ? 'true' : 'false';
  const hidden = shortcutHelpVisible ? '' : ' hidden';
  const helpItems = getKeyboardShortcutHelp()
    .map(
      (shortcut) => `<li><kbd>${escapeHtml(shortcut.key)}</kbd><span>${escapeHtml(shortcut.description)}</span></li>`,
    )
    .join('');

  return `<div class="shortcut-controls" aria-labelledby="shortcut-controls-title">
    <h2 id="shortcut-controls-title">Keyboard shortcuts</h2>
    <button id="shortcut-help-toggle" type="button" aria-expanded="${expanded}" aria-controls="shortcut-help-panel">
      ${shortcutHelpVisible ? 'Hide shortcuts' : 'Show shortcuts'}
    </button>
    <p id="shortcut-status" class="shortcut-status" aria-live="polite">${escapeHtml(shortcutStatus)}</p>
    <div id="shortcut-help-panel" class="shortcut-help-panel"${hidden}>
      <ul>${helpItems}</ul>
    </div>
  </div>`;
}

function snapshotControls(): string {
  const artifactOptions: { id: SnapshotArtifactId; label: string }[] = [
    { id: 'outline', label: 'Outline' },
    { id: 'handout', label: 'Handout' },
    { id: 'agenda', label: 'Agenda' },
    { id: 'timerCards', label: 'Timer cards' },
    { id: 'revisionCards', label: 'Revision cards' },
    { id: 'peerRoleCards', label: 'Peer role cards' },
    { id: 'actionPlan', label: 'Action plan' },
  ];

  return `<div class="snapshot-controls" aria-labelledby="snapshot-controls-title">
    <h2 id="snapshot-controls-title">Session snapshot</h2>
    <p id="snapshot-help">Bundle the current dice, timer phase, preset notes, and selected classroom artifacts as Markdown or a compact print sheet.</p>
    <fieldset aria-describedby="snapshot-help">
      <legend>Artifact excerpts</legend>
      ${artifactOptions
        .map((option) => {
          const checked = selectedSnapshotArtifacts.has(option.id) ? ' checked' : '';
          return `<label><input type="checkbox" data-snapshot-artifact="${option.id}"${checked} /> ${escapeHtml(option.label)}</label>`;
        })
        .join('')}
    </fieldset>
    <button id="copy-session-snapshot" type="button">Copy session snapshot</button>
    <button id="print-session-snapshot" type="button">Print session snapshot</button>
  </div>`;
}

function visibleSessionHistoryItems(): SessionHistoryItem[] {
  return filterSessionHistory(sessionHistoryItems, {
    tag: sessionHistoryTagFilter,
    archiveLabel: sessionHistoryArchiveFilter,
    searchQuery: sessionHistorySearchQuery,
  });
}

function normalizeSessionHistoryArchiveValue(value: string): SessionHistoryArchiveLabel {
  if (
    value === 'classroom' ||
    value === 'event' ||
    value === 'draft' ||
    value === 'assessment-follow-up'
  ) {
    return value;
  }
  return '';
}

function printSheet(): string {
  const sheet = formatPrintSheet(result);

  return `<section class="print-sheet" aria-label="Printable workshop prompt sheet">
    <h2>${escapeHtml(sheet.title)}</h2>
    <p class="print-seed"><strong>${escapeHtml(sheet.seedLabel)}:</strong> ${escapeHtml(sheet.seed)}</p>
    <section class="print-dice" aria-label="Printable dice values">
      ${sheet.dice.map((die) => `<article><h3>${escapeHtml(die.category)}</h3><p>${escapeHtml(die.value)}</p></article>`).join('')}
    </section>
    <section class="print-questions" aria-label="Workshop questions">
      <h3>Workshop questions</h3>
      <ol>
        ${sheet.questions.map((question) => `<li>${escapeHtml(question)}</li>`).join('')}
      </ol>
    </section>
  </section>`;
}

function timerCardPrintSheet(options = normalizeFacilitatorAgendaControls(agendaTitle, agendaTotalMinutes)): string {
  const layout = formatTimerCardPrintLayout(result, options);

  return `<section class="timer-card-print-sheet" aria-label="Printable facilitator timer cards with cut lines">
    <h2>${escapeHtml(layout.title)}</h2>
    <p class="print-seed">
      <strong>${escapeHtml(layout.seedLabel)}:</strong> ${escapeHtml(layout.seed)}
      <span><strong>${escapeHtml(layout.totalLabel)}:</strong> ${layout.totalMinutes} minutes</span>
    </p>
    <p class="cut-line-note">${escapeHtml(layout.cutLineLabel)}</p>
    <section class="timer-card-grid" aria-label="Timer cards">
      ${layout.cards
        .map(
          (card) => `<article class="timer-card">
            <p class="timer-card-meta">${escapeHtml(card.phase)}</p>
            <h3>${escapeHtml(card.name)}</h3>
            <p class="timer-card-duration">${escapeHtml(card.timer)}</p>
            <p><strong>Prompt:</strong> ${escapeHtml(card.prompt)}</p>
            <p><strong>Action:</strong> ${escapeHtml(card.action)}</p>
          </article>`,
        )
        .join('')}
    </section>
  </section>`;
}

function revisionCardPrintSheet(options = normalizeRevisionCardsControls(revisionCardsTitle)): string {
  const layout = formatRevisionCardPrintLayout(result, options);

  return `<section class="revision-card-print-sheet" aria-label="Printable revision cards with cut lines">
    <h2>${escapeHtml(layout.title)}</h2>
    <p class="print-seed"><strong>${escapeHtml(layout.seedLabel)}:</strong> ${escapeHtml(layout.seed)}</p>
    <p class="cut-line-note">${escapeHtml(layout.cutLineLabel)}</p>
    <section class="revision-card-grid" aria-label="Revision cards">
      ${layout.cards
        .map(
          (card) => `<article class="revision-card">
            <p class="revision-card-meta">${escapeHtml(card.number)}</p>
            <h3>${escapeHtml(card.category)}</h3>
            <p class="revision-card-value">${escapeHtml(card.value)}</p>
            <p><strong>Task:</strong> ${escapeHtml(card.task)}</p>
            <p><strong>Question:</strong> ${escapeHtml(card.question)}</p>
          </article>`,
        )
        .join('')}
    </section>
  </section>`;
}

function peerRoleCardPrintSheet(options = normalizePeerRoleCardsControls(peerRoleCardsTitle)): string {
  const layout = formatPeerRoleCardPrintLayout(result, options);

  return `<section class="peer-role-card-print-sheet" aria-label="Printable peer role cards with cut lines">
    <h2>${escapeHtml(layout.title)}</h2>
    <p class="print-seed"><strong>${escapeHtml(layout.seedLabel)}:</strong> ${escapeHtml(layout.seed)}</p>
    <p class="cut-line-note">${escapeHtml(layout.cutLineLabel)}</p>
    <section class="peer-role-card-grid" aria-label="Peer role cards">
      ${layout.cards
        .map(
          (card) => `<article class="peer-role-card">
            <p class="peer-role-card-meta">${escapeHtml(card.number)}</p>
            <h3>${escapeHtml(card.role)}</h3>
            <p class="peer-role-card-focus">${escapeHtml(card.focus)}</p>
            <p><strong>Task:</strong> ${escapeHtml(card.task)}</p>
            <p><strong>Question:</strong> ${escapeHtml(card.question)}</p>
          </article>`,
        )
        .join('')}
    </section>
  </section>`;
}

function dieCard(category: StoryDiceCategory): string {
  const checked = locked.has(category) ? 'checked' : '';
  return `<article class="die-card" data-die-category="${category}" tabindex="0" aria-label="${category} die: ${escapeHtml(result.dice[category])}">
    <p class="category">${category}</p>
    <h2>${escapeHtml(result.dice[category])}</h2>
    <div class="die-actions">
      <button type="button" data-reroll="${category}" data-die-category="${category}">Reroll ${category}</button>
      <label><input type="checkbox" data-lock="${category}" data-die-category="${category}" ${checked} /> Lock</label>
    </div>
  </article>`;
}

function syncLocationHash(): void {
  const nextHash = `#${encodeShareState({ seed, locked })}`;
  if (window.location.hash !== nextHash) {
    window.history.replaceState(null, '', nextHash);
  }
}

function updateAgendaPreview(): void {
  const preview = document.querySelector<HTMLPreElement>('#agenda-preview');
  if (preview) {
    preview.textContent = formatFacilitatorAgenda(
      result,
      normalizeFacilitatorAgendaControls(agendaTitle, agendaTotalMinutes),
    );
  }
}

function updateFacilitatorTimerDisplay(): void {
  const display = document.querySelector<HTMLElement>('.facilitator-timer-display');
  if (!display) return;

  display.outerHTML = formatFacilitatorTimerDisplay(
    result,
    timerPhaseIndex,
    normalizeFacilitatorAgendaControls(agendaTitle, agendaTotalMinutes),
  );
  wireFacilitatorTimerControls();
}

function updateShortcutStatus(): void {
  const status = document.querySelector<HTMLElement>('#shortcut-status');
  if (status) status.textContent = shortcutStatus;
}

function updateActionPlanPreview(): void {
  const preview = document.querySelector<HTMLPreElement>('#action-plan-preview');
  if (preview) {
    preview.textContent = formatRevisionActionPlan(result, normalizeActionPlanControls(actionPlanTitle));
  }
}

function formatCurrentSessionSnapshot(): string {
  return formatSessionSnapshot(currentSessionSnapshotOptions());
}

function currentSessionSnapshotOptions(): SessionSnapshotOptions {
  const agendaOptions = normalizeFacilitatorAgendaControls(agendaTitle, agendaTotalMinutes);
  const timer = resolveFacilitatorTimerPhase(result, timerPhaseIndex, agendaOptions);
  const presetName = wordBankPresetName || selectedWordBankPresetName;

  return {
    dateLabel: new Date().toLocaleString(),
    result,
    timer: {
      phaseLabel: timer.phaseLabel,
      name: timer.name,
      minutes: timer.minutes,
      action: timer.action,
    },
    preset: {
      name: presetName,
      notes: wordBankPresetNotes,
    },
    artifacts: selectedSessionSnapshotArtifacts(agendaOptions),
  };
}

function selectedSessionSnapshotArtifacts(
  agendaOptions = normalizeFacilitatorAgendaControls(agendaTitle, agendaTotalMinutes),
): SessionSnapshotArtifact[] {
  const revisionOptions = normalizeRevisionCardsControls(revisionCardsTitle);
  const peerRoleOptions = normalizePeerRoleCardsControls(peerRoleCardsTitle);
  const actionPlanOptions = normalizeActionPlanControls(actionPlanTitle);
  const artifacts: Record<SnapshotArtifactId, SessionSnapshotArtifact> = {
    outline: { label: 'Scene beat outline', content: formatSceneBeatOutline(result) },
    handout: { label: 'Workshop handout', content: formatHandout(result) },
    agenda: { label: 'Facilitator agenda', content: formatFacilitatorAgenda(result, agendaOptions) },
    timerCards: { label: 'Timer cards', content: formatTimerCards(result, agendaOptions) },
    revisionCards: { label: 'Revision cards', content: formatRevisionCards(result, revisionOptions) },
    peerRoleCards: { label: 'Peer role cards', content: formatPeerRoleCards(result, peerRoleOptions) },
    actionPlan: { label: 'Action plan', content: formatRevisionActionPlan(result, actionPlanOptions) },
  };

  return [...selectedSnapshotArtifacts].map((artifactId) => artifacts[artifactId]);
}

function readWordBankPresets(): WordBankPreset[] {
  const storage = getWordBankPresetStorage();
  return storage ? listWordBankPresets(storage) : [];
}

function refreshSessionHistory(): void {
  const result = loadSessionHistory(getSessionHistoryStorage());
  sessionHistoryItems = result.items;
  sessionHistoryStatus =
    result.warning ?? (result.items.length > 0 ? `${result.items.length} local session snapshots saved.` : sessionHistoryStatus);
}

function formatSessionHistoryTitle(): string {
  const firstLine = formatPrompt(result).split(/\r?\n/)[0] ?? '';
  return firstLine ? `${firstLine} (${seed || 'untitled seed'})` : `Story Dice Lab session (${seed || 'untitled seed'})`;
}

function findVisibleSessionHistoryItem(itemId: string | undefined): SessionHistoryItem | null {
  if (!itemId) return null;
  return visibleSessionHistoryItems().find((item) => item.id === itemId) ?? null;
}

function printSessionHistoryItem(target: Window, item: SessionHistoryItem): void {
  const tags = item.tags.length > 0 ? item.tags.map(escapeHtml).join(', ') : 'No tags';
  target.document.open();
  target.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(item.title)} - Story Dice Lab saved snapshot</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #1f2933; }
    h1 { margin-bottom: 0.35rem; }
    .meta { color: #52616b; margin: 0.25rem 0; }
    pre { white-space: pre-wrap; border-top: 1px solid #d9e2ec; padding-top: 1rem; }
  </style>
</head>
<body>
  <h1>${escapeHtml(item.title)}</h1>
  <p class="meta">${escapeHtml(item.createdAt)}</p>
  <p class="meta">Tags: ${tags}</p>
  <pre>${escapeHtml(item.content)}</pre>
</body>
</html>`);
  target.document.close();
  target.focus?.();
  target.print();
}

function getWordBankPresetStorage(): Storage | null {
  return getLocalStorage();
}

function getSessionHistoryStorage(): Storage | null {
  return getLocalStorage();
}

function getLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.append(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
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

render();
