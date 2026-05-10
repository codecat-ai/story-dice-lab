import {
  decodeShareState,
  defaultWordBank,
  encodeShareState,
  formatActionPlanControls,
  formatCopySource,
  formatExportActionControls,
  formatFacilitatorAgendaControls,
  formatFacilitatorAgenda,
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
  rerollDie,
  rollDice,
  serializeWordBank,
  storyDiceCategories,
  type StoryDiceCategory,
  type StoryDiceWordBank,
} from './storyDice';
import {
  deleteWordBankPreset,
  formatWordBankPresetControls,
  listWordBankPresets,
  loadWordBankPreset,
  saveWordBankPreset,
  type WordBankPreset,
} from './wordBankPresets';
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
let wordBankPresetName = '';
let wordBankPresetNotes = '';
let selectedWordBankPresetName = '';
let wordBankPresets: WordBankPreset[] = readWordBankPresets();
let agendaTitle = '';
let agendaTotalMinutes = '25';
let revisionCardsTitle = '';
let peerRoleCardsTitle = '';
let actionPlanTitle = '';
let result = rollDice(seed, {}, currentWordBank);
const locked = shared.locked;
let printTarget: 'prompt' | 'timer-cards' | 'revision-cards' | 'peer-role-cards' = 'prompt';

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
        ${formatExportActionControls()}
        ${formatRevisionCardsControls(revisionCardsOptions)}
        ${formatPeerRoleCardsControls(peerRoleCardsOptions)}
        ${formatActionPlanControls(actionPlanOptions)}
        ${formatFacilitatorAgendaControls(agendaOptions)}
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
  document.querySelector<HTMLButtonElement>('#roll-all')?.addEventListener('click', () => {
    const preserved = Object.fromEntries([...locked].map((category) => [category, result.dice[category]]));
    result = rollDice(`${seed}:${Date.now()}`, preserved, currentWordBank);
    render();
  });
  document.querySelector<HTMLButtonElement>('#copy')?.addEventListener('click', async () => {
    await copyText(formatCopySource(result, 'compact'));
  });
  document.querySelector<HTMLButtonElement>('#copy-outline')?.addEventListener('click', async () => {
    await copyText(formatCopySource(result, 'outline'));
  });
  document.querySelector<HTMLButtonElement>('#copy-handout')?.addEventListener('click', async () => {
    await copyText(formatCopySource(result, 'handout'));
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
  });
  document.querySelector<HTMLInputElement>('#agenda-minutes')?.addEventListener('input', (event) => {
    agendaTotalMinutes = (event.target as HTMLInputElement).value;
    updateAgendaPreview();
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
      render();
    });
    document.querySelector<HTMLInputElement>(`[data-lock="${category}"]`)?.addEventListener('change', (event) => {
      if ((event.target as HTMLInputElement).checked) locked.add(category);
      else locked.delete(category);
      render();
    });
  }
}

function setPrintTarget(): void {
  document.querySelector('.shell')?.classList.toggle('print-timer-cards', printTarget === 'timer-cards');
  document.querySelector('.shell')?.classList.toggle('print-revision-cards', printTarget === 'revision-cards');
  document.querySelector('.shell')?.classList.toggle('print-peer-role-cards', printTarget === 'peer-role-cards');
  document.querySelector('.shell')?.classList.toggle('print-prompt', printTarget === 'prompt');
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
  return `<article class="die-card">
    <p class="category">${category}</p>
    <h2>${escapeHtml(result.dice[category])}</h2>
    <div class="die-actions">
      <button type="button" data-reroll="${category}">Reroll ${category}</button>
      <label><input type="checkbox" data-lock="${category}" ${checked} /> Lock</label>
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

function updateActionPlanPreview(): void {
  const preview = document.querySelector<HTMLPreElement>('#action-plan-preview');
  if (preview) {
    preview.textContent = formatRevisionActionPlan(result, normalizeActionPlanControls(actionPlanTitle));
  }
}

function readWordBankPresets(): WordBankPreset[] {
  const storage = getWordBankPresetStorage();
  return storage ? listWordBankPresets(storage) : [];
}

function getWordBankPresetStorage(): Storage | null {
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
