import {
  decodeShareState,
  defaultWordBank,
  encodeShareState,
  formatCopySource,
  formatFacilitatorAgendaControls,
  formatFacilitatorAgenda,
  formatHandout,
  formatMarkdownPrompt,
  formatPrintSheet,
  formatPrompt,
  formatSceneBeatOutline,
  normalizeFacilitatorAgendaControls,
  normalizeWordBankJson,
  printCurrentPrompt,
  rerollDie,
  rollDice,
  serializeWordBank,
  storyDiceCategories,
  type StoryDiceCategory,
  type StoryDiceWordBank,
} from './storyDice';
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
let agendaTitle = '';
let agendaTotalMinutes = '25';
let result = rollDice(seed, {}, currentWordBank);
const locked = shared.locked;

function render(): void {
  const agendaOptions = normalizeFacilitatorAgendaControls(agendaTitle, agendaTotalMinutes);

  app.innerHTML = `
    <main class="shell">
      <section class="hero">
        <p class="eyebrow">Local-first creative prompt dice</p>
        <h1>Story Dice Lab</h1>
        <p>Roll six reproducible story prompts for workshops, classrooms, tabletop sessions, or solo writing warmups.</p>
        <label class="seed-label">Seed
          <input id="seed" value="${escapeHtml(seed)}" aria-label="Prompt seed" />
        </label>
        <div class="actions">
          <button id="roll-all" type="button">Reroll all unlocked dice</button>
          <button id="copy" type="button">Copy prompt</button>
          <button id="copy-outline" type="button">Copy outline</button>
          <button id="copy-handout" type="button">Copy handout</button>
          <button id="copy-markdown" type="button">Copy Markdown</button>
          <button id="print-prompt" type="button">Print prompt sheet</button>
          <button id="share" type="button">Copy share link</button>
        </div>
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
      ${printSheet()}
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
    await navigator.clipboard?.writeText(formatCopySource(result, 'compact'));
  });
  document.querySelector<HTMLButtonElement>('#copy-outline')?.addEventListener('click', async () => {
    await navigator.clipboard?.writeText(formatCopySource(result, 'outline'));
  });
  document.querySelector<HTMLButtonElement>('#copy-handout')?.addEventListener('click', async () => {
    await navigator.clipboard?.writeText(formatCopySource(result, 'handout'));
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
    await navigator.clipboard?.writeText(
      formatFacilitatorAgenda(result, normalizeFacilitatorAgendaControls(agendaTitle, agendaTotalMinutes)),
    );
  });
  document.querySelector<HTMLButtonElement>('#copy-markdown')?.addEventListener('click', async () => {
    await navigator.clipboard?.writeText(formatMarkdownPrompt(result));
  });
  document.querySelector<HTMLButtonElement>('#print-prompt')?.addEventListener('click', () => {
    printCurrentPrompt(window);
  });
  document.querySelector<HTMLButtonElement>('#share')?.addEventListener('click', async () => {
    syncLocationHash();
    await navigator.clipboard?.writeText(window.location.href);
  });
  document.querySelector<HTMLTextAreaElement>('#word-bank-json')?.addEventListener('input', (event) => {
    wordBankText = (event.target as HTMLTextAreaElement).value;
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
    await navigator.clipboard?.writeText(wordBankText);
    wordBankStatus = 'Copied normalized word bank JSON.';
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
