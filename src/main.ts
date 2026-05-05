import { formatPrompt, rerollDie, rollDice, storyDiceCategories, type StoryDiceCategory } from './storyDice';
import './styles.css';

const appRoot = document.querySelector<HTMLDivElement>('#app');
if (!appRoot) throw new Error('App root not found');
const app = appRoot;

let seed = 'moonlit workshop';
let result = rollDice(seed);
const locked = new Set<StoryDiceCategory>();

function render(): void {
  app.innerHTML = `
    <main class="shell">
      <section class="hero">
        <p class="eyebrow">Local-first creative prompt dice</p>
        <h1>Story Dice Lab</h1>
        <p>Roll six reproducible story prompts for workshops, classrooms, tabletop sessions, or solo writing warmups.</p>
        <label class="seed-label">Seed
          <input id="seed" value="${seed}" aria-label="Prompt seed" />
        </label>
        <div class="actions">
          <button id="roll-all" type="button">Reroll all unlocked dice</button>
          <button id="copy" type="button">Copy prompt</button>
        </div>
      </section>
      <section class="dice-grid" aria-label="Story dice results">
        ${storyDiceCategories.map((category) => dieCard(category)).join('')}
      </section>
      <section class="prompt-card">
        <h2>Prompt text</h2>
        <pre>${formatPrompt(result)}</pre>
      </section>
    </main>`;

  document.querySelector<HTMLInputElement>('#seed')?.addEventListener('input', (event) => {
    seed = (event.target as HTMLInputElement).value;
  });
  document.querySelector<HTMLButtonElement>('#roll-all')?.addEventListener('click', () => {
    const preserved = Object.fromEntries([...locked].map((category) => [category, result.dice[category]]));
    result = rollDice(`${seed}:${Date.now()}`, preserved);
    render();
  });
  document.querySelector<HTMLButtonElement>('#copy')?.addEventListener('click', async () => {
    await navigator.clipboard?.writeText(formatPrompt(result));
  });
  for (const category of storyDiceCategories) {
    document.querySelector<HTMLButtonElement>(`[data-reroll="${category}"]`)?.addEventListener('click', () => {
      result = rerollDie(result, category, `${seed}:${Date.now()}`);
      render();
    });
    document.querySelector<HTMLInputElement>(`[data-lock="${category}"]`)?.addEventListener('change', (event) => {
      if ((event.target as HTMLInputElement).checked) locked.add(category);
      else locked.delete(category);
      render();
    });
  }
}

function dieCard(category: StoryDiceCategory): string {
  const checked = locked.has(category) ? 'checked' : '';
  return `<article class="die-card">
    <p class="category">${category}</p>
    <h2>${result.dice[category]}</h2>
    <div class="die-actions">
      <button type="button" data-reroll="${category}">Reroll ${category}</button>
      <label><input type="checkbox" data-lock="${category}" ${checked} /> Lock</label>
    </div>
  </article>`;
}

render();
