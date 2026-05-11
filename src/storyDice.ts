export type StoryDiceCategory = 'character' | 'want' | 'setting' | 'obstacle' | 'object' | 'twist';

export type StoryDiceResult = {
  seed: string;
  dice: Record<StoryDiceCategory, string>;
};

export type StoryDiceWordBank = Record<StoryDiceCategory, string[]>;

export type CopySource =
  | 'compact'
  | 'handout'
  | 'outline'
  | 'revisionCards'
  | 'timerCards'
  | 'peerRoleCards'
  | 'actionPlan';

export type HandoutOptions = {
  title?: string;
};

export type RevisionCardsOptions = {
  title?: string;
};

export type PeerRoleCardsOptions = {
  title?: string;
};

export type ActionPlanOptions = {
  title?: string;
};

export type FacilitatorAgendaOptions = {
  title?: string;
  totalMinutes?: number;
};

export type FacilitatorTimerPhaseState = {
  currentIndex: number;
  totalPhases: number;
  phaseLabel: string;
  name: string;
  minutes: number;
  prompt: string;
  action: string;
  previousIndex: number;
  nextIndex: number;
  isFirst: boolean;
  isLast: boolean;
};

export type TimerCardPrintLayout = {
  title: string;
  seedLabel: string;
  seed: string;
  totalLabel: string;
  totalMinutes: number;
  cutLineLabel: string;
  cards: {
    phase: string;
    name: string;
    timer: string;
    prompt: string;
    action: string;
  }[];
};

export type RevisionCardPrintLayout = {
  title: string;
  seedLabel: string;
  seed: string;
  cutLineLabel: string;
  cards: {
    number: string;
    category: string;
    value: string;
    task: string;
    question: string;
  }[];
};

export type PeerRoleCardPrintLayout = {
  title: string;
  seedLabel: string;
  seed: string;
  cutLineLabel: string;
  cards: {
    number: string;
    role: string;
    focus: string;
    task: string;
    question: string;
  }[];
};

export type PrintSheet = {
  title: string;
  seedLabel: string;
  seed: string;
  dice: { category: string; value: string }[];
  questions: string[];
};

export type BrowserPrintTarget = {
  print: () => void;
};

export type ShareState = {
  seed: string;
  locked: Set<StoryDiceCategory>;
};

export const storyDiceCategories: StoryDiceCategory[] = [
  'character',
  'want',
  'setting',
  'obstacle',
  'object',
  'twist',
];

const wordBank: StoryDiceWordBank = {
  character: ['retired cartographer', 'curious beekeeper', 'apprentice locksmith', 'night gardener', 'runaway archivist', 'soft-spoken inventor'],
  want: ['to repair a broken promise', 'to find a missing doorway', 'to win one impossible argument', 'to return a borrowed name', 'to protect a tiny festival', 'to decode a humming letter'],
  setting: ['floating library', 'rain-lit train station', 'market under glass', 'island observatory', 'abandoned clock tower', 'greenhouse on wheels'],
  obstacle: ['a rule that changes hourly', 'a rival with the same map', 'a bridge that remembers insults', 'a storm made of whispers', 'a key split into rumors', 'a deadline at sunrise'],
  object: ['brass compass', 'folded paper comet', 'jar of blue sparks', 'threadbare red scarf', 'singing teaspoon', 'mirror with no reflection'],
  twist: ['the villain is asking for help', 'the treasure wants to be lost', 'every lie becomes visible', 'the safest path moves backward', 'a stranger knows the ending', 'home has been following them'],
};

export const defaultWordBank: StoryDiceWordBank = normalizeWordBank(wordBank);

const workshopQuestions = [
  'What does the character do first to pursue the want?',
  'How does the obstacle make the setting harder to navigate?',
  'Where can the object or twist force a visible choice in the scene?',
];

const revisionCardGuidance: Record<StoryDiceCategory, { task: string; question: string }> = {
  character: {
    task: 'Give the character one agency-driven choice that changes how the scene unfolds.',
    question: 'What does the character actively decide instead of only reacting?',
  },
  want: {
    task: 'Raise the stakes so failing to get what they want would cost something specific.',
    question: 'What becomes harder, riskier, or more personal if this want is delayed?',
  },
  setting: {
    task: 'Add sensory detail from the setting that affects the action on the page.',
    question: 'Which sight, sound, smell, texture, or temperature changes what someone does?',
  },
  obstacle: {
    task: 'Escalate the obstacle so the next attempt cannot use the same easy plan.',
    question: 'How does the obstacle force a bigger risk or sharper choice?',
  },
  object: {
    task: 'Make the object part of a concrete action instead of background decoration.',
    question: 'Who touches, uses, hides, breaks, or trades the object?',
  },
  twist: {
    task: "Show a consequence of the twist that changes the scene's next move.",
    question: 'What new problem, cost, or opportunity appears because of the twist?',
  },
};

const agendaPhases = [
  {
    name: 'Warm-up',
    minutes: 3,
    prompt: 'Read all six dice aloud and ask everyone to choose one image that feels alive.',
  },
  {
    name: 'Character choice',
    minutes: 5,
    prompt: 'Pair the character with the want and name the first choice they will make.',
  },
  {
    name: 'Draft',
    minutes: 10,
    prompt: 'Write one scene in the setting while the obstacle pushes back.',
  },
  {
    name: 'Share',
    minutes: 5,
    prompt: 'Read a favorite moment and name where the object or twist changed the scene.',
  },
  {
    name: 'Reflection',
    minutes: 2,
    prompt: 'Capture one revision question before the next sprint.',
  },
];

const peerRoleCardGuidance = [
  {
    role: 'Connector',
    focus: 'Character and want',
    task: (result: StoryDiceResult) =>
      `Name where the ${result.dice.character}'s choice clearly serves the want: ${result.dice.want}.`,
    question: 'Which sentence best proves the want on the page?',
  },
  {
    role: 'Detail Coach',
    focus: 'Setting and object',
    task: (result: StoryDiceResult) =>
      `Find one place where ${result.dice.setting} or ${result.dice.object} can become a concrete sensory detail.`,
    question: 'What can the writer add so readers can see, hear, or touch the moment?',
  },
  {
    role: 'Stakes Coach',
    focus: 'Obstacle and want',
    task: (result: StoryDiceResult) =>
      `Check whether ${result.dice.obstacle} makes ${result.dice.want} harder, riskier, or more personal.`,
    question: 'What cost should increase before the scene ends?',
  },
  {
    role: 'Twist Tracker',
    focus: 'Twist and next choice',
    task: (result: StoryDiceResult) =>
      `Track how ${result.dice.twist} changes what the ${result.dice.character} does next.`,
    question: 'Where should the writer show the consequence instead of explaining it?',
  },
];

export function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (const char of seed.trim() || 'story-dice-lab') {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick(category: StoryDiceCategory, seed: string, salt = 0, bank: StoryDiceWordBank = defaultWordBank): string {
  const options = bank[category];
  const index = (hashSeed(`${seed}:${category}:${salt}`) + salt) % options.length;
  return options[index];
}

export function rollDice(
  seed: string,
  locked: Partial<Record<StoryDiceCategory, string>> = {},
  bank: StoryDiceWordBank = defaultWordBank,
): StoryDiceResult {
  const dice = Object.fromEntries(
    storyDiceCategories.map((category) => [category, locked[category] ?? pick(category, seed, 0, bank)]),
  ) as Record<StoryDiceCategory, string>;
  return { seed, dice };
}

export function rerollDie(
  result: StoryDiceResult,
  category: StoryDiceCategory,
  seed: string,
  bank: StoryDiceWordBank = defaultWordBank,
): StoryDiceResult {
  let next = result.dice[category];
  let salt = 1;
  while (next === result.dice[category] && salt < 20) {
    next = pick(category, `${seed}:${result.seed}`, salt, bank);
    salt += 1;
  }
  return {
    seed: `${seed}:${category}:${salt}`,
    dice: { ...result.dice, [category]: next },
  };
}

export function formatPrompt(result: StoryDiceResult): string {
  return storyDiceCategories.map((category) => `${category}: ${result.dice[category]}`).join('\n');
}

export function formatHandout(result: StoryDiceResult, options: HandoutOptions = {}): string {
  const title = options.title?.trim() || 'Story Dice Lab';
  const diceLines = storyDiceCategories.map((category, index) => {
    const label = category[0].toUpperCase() + category.slice(1);
    return `${index + 1}. ${label}: ${result.dice[category]}`;
  });

  return [
    title,
    `Seed: ${result.seed}`,
    '',
    'Dice',
    ...diceLines,
    '',
    'Workshop prompts',
    ...workshopQuestions.map((question, index) => `${index + 1}. ${question}`),
  ].join('\n');
}

export function formatFacilitatorAgenda(result: StoryDiceResult, options: FacilitatorAgendaOptions = {}): string {
  const title = options.title?.trim() || 'Story Dice Lab facilitator agenda';
  const totalMinutes = options.totalMinutes ?? 25;
  const minutes = scaleAgendaMinutes(totalMinutes);
  const diceLines = storyDiceCategories.map((category, index) => {
    const label = category[0].toUpperCase() + category.slice(1);
    return `${index + 1}. ${label}: ${result.dice[category]}`;
  });
  const phaseLines = agendaPhases.map((phase, index) => {
    return `${index + 1}. ${minutes[index]} min - ${phase.name}: ${phase.prompt}`;
  });

  return [
    title,
    `Seed: ${result.seed}`,
    '',
    'Dice',
    ...diceLines,
    '',
    `Timed scene sprint (${totalMinutes} minutes)`,
    ...phaseLines,
    '',
    'Facilitator notes',
    `- Character/want decision: ${result.dice.character} wants ${result.dice.want}; ask what action proves that want on the page.`,
    `- Obstacle/setting pressure: In the ${result.dice.setting}, ${result.dice.obstacle} should make the easy path harder.`,
    `- Object/twist turn: Use ${result.dice.object} when ${result.dice.twist} needs to force a visible choice.`,
  ].join('\n');
}

export function formatTimerCards(result: StoryDiceResult, options: FacilitatorAgendaOptions = {}): string {
  const title = options.title?.trim() || 'Story Dice Lab timer cards';
  const totalMinutes = options.totalMinutes ?? 25;
  const minutes = scaleAgendaMinutes(totalMinutes);
  const actionLines = timerCardActionLines(result);
  const cards = agendaPhases.flatMap((phase, index) => {
    const card = [
      `[ ] Start ${minutes[index]}-minute timer`,
      `Phase ${index + 1} of ${agendaPhases.length}: ${phase.name}`,
      `Facilitator prompt: ${phase.prompt}`,
      `Action: ${actionLines[index]}`,
    ];

    return index === agendaPhases.length - 1 ? card : [...card, ''];
  });

  return [title, `Seed: ${result.seed}`, `Total: ${totalMinutes} minutes`, '', ...cards].join('\n');
}

export function formatTimerCardPrintLayout(
  result: StoryDiceResult,
  options: FacilitatorAgendaOptions = {},
): TimerCardPrintLayout {
  const title = options.title?.trim() || 'Story Dice Lab timer cards';
  const totalMinutes = options.totalMinutes ?? 25;
  const minutes = scaleAgendaMinutes(totalMinutes);
  const actionLines = timerCardActionLines(result);

  return {
    title,
    seedLabel: 'Seed',
    seed: result.seed,
    totalLabel: 'Total',
    totalMinutes,
    cutLineLabel: 'Cut along dashed lines',
    cards: agendaPhases.map((phase, index) => ({
      phase: `Phase ${index + 1} of ${agendaPhases.length}`,
      name: phase.name,
      timer: `${minutes[index]}-minute timer`,
      prompt: phase.prompt,
      action: actionLines[index],
    })),
  };
}

export function resolveFacilitatorTimerPhase(
  result: StoryDiceResult,
  phaseIndex: number,
  options: FacilitatorAgendaOptions = {},
): FacilitatorTimerPhaseState {
  const totalMinutes = options.totalMinutes ?? 25;
  const minutes = scaleAgendaMinutes(totalMinutes);
  const currentIndex = clampInteger(phaseIndex, 0, agendaPhases.length - 1);
  const phase = agendaPhases[currentIndex];

  return {
    currentIndex,
    totalPhases: agendaPhases.length,
    phaseLabel: `Phase ${currentIndex + 1} of ${agendaPhases.length}`,
    name: phase.name,
    minutes: minutes[currentIndex],
    prompt: phase.prompt,
    action: timerCardActionLines(result)[currentIndex],
    previousIndex: Math.max(0, currentIndex - 1),
    nextIndex: Math.min(agendaPhases.length - 1, currentIndex + 1),
    isFirst: currentIndex === 0,
    isLast: currentIndex === agendaPhases.length - 1,
  };
}

export function formatFacilitatorTimerDisplay(
  result: StoryDiceResult,
  phaseIndex: number,
  options: FacilitatorAgendaOptions = {},
): string {
  const title = options.title?.trim() || 'Live facilitator timer';
  const phase = resolveFacilitatorTimerPhase(result, phaseIndex, options);
  const previousDisabled = phase.isFirst ? ' disabled' : '';
  const nextDisabled = phase.isLast ? ' disabled' : '';

  return `<section class="facilitator-timer-display" aria-labelledby="facilitator-timer-title">
    <div class="timer-display-header">
      <h2 id="facilitator-timer-title">${escapeHtml(title)}</h2>
      <p class="timer-display-seed">Seed: ${escapeHtml(result.seed)}</p>
    </div>
    <div class="timer-display-stage" aria-live="polite">
      <p class="timer-display-phase">${escapeHtml(phase.phaseLabel)}</p>
      <p class="timer-display-name">${escapeHtml(phase.name)}</p>
      <p class="timer-display-minutes" aria-label="${phase.minutes} minutes">${phase.minutes}<span>min</span></p>
      <p class="timer-display-prompt">${escapeHtml(phase.prompt)}</p>
      <p class="timer-display-action">${escapeHtml(phase.action)}</p>
    </div>
    <div class="timer-display-actions">
      <button id="timer-prev" type="button" aria-label="Show previous timer phase"${previousDisabled}>Previous</button>
      <button id="timer-reset" type="button" aria-label="Reset timer display to first phase">Reset</button>
      <button id="timer-next" type="button" aria-label="Show next timer phase"${nextDisabled}>Next</button>
    </div>
  </section>`;
}

export function formatSceneBeatOutline(result: StoryDiceResult): string {
  const { character, want, setting, obstacle, object, twist } = result.dice;

  return [
    'Scene beat outline',
    `Seed: ${result.seed}`,
    '',
    `1. Opening image: In the ${setting}, the ${character} notices the ${object} before the scene starts moving.`,
    `2. Desire: The ${character} wants ${want} badly enough to act now.`,
    `3. Complication: ${capitalizeFirst(obstacle)} turns the ${setting} against that plan.`,
    `4. Turning point: When ${twist}, the ${object} forces the ${character} to choose a new tactic.`,
    `5. Ending hook: The choice changes what ${want} will cost next.`,
  ].join('\n');
}

export function formatRevisionCards(result: StoryDiceResult, options: RevisionCardsOptions = {}): string {
  const title = options.title?.trim() || 'Story Dice Lab revision cards';
  const cards = storyDiceCategories.flatMap((category, index) => {
    const label = category[0].toUpperCase() + category.slice(1);
    const guidance = revisionCardGuidance[category];
    const card = [
      `${index + 1}. ${label}: ${result.dice[category]}`,
      `Task: ${guidance.task}`,
      `Question: ${guidance.question}`,
    ];

    return index === storyDiceCategories.length - 1 ? card : [...card, ''];
  });

  return [title, `Seed: ${result.seed}`, '', ...cards].join('\n');
}

export function formatRevisionCardPrintLayout(
  result: StoryDiceResult,
  options: RevisionCardsOptions = {},
): RevisionCardPrintLayout {
  const title = options.title?.trim() || 'Story Dice Lab revision cards';

  return {
    title,
    seedLabel: 'Seed',
    seed: result.seed,
    cutLineLabel: 'Cut along dashed lines',
    cards: revisionCardEntries(result),
  };
}

export function formatPeerRoleCards(result: StoryDiceResult, options: PeerRoleCardsOptions = {}): string {
  const title = options.title?.trim() || 'Story Dice Lab peer role cards';
  const cards = peerRoleCardEntries(result).flatMap((card, index) => {
    const lines = [
      `${index + 1}. ${card.role}`,
      `Focus: ${card.focus}`,
      `Task: ${card.task}`,
      `Question: ${card.question}`,
    ];

    return index === peerRoleCardGuidance.length - 1 ? lines : [...lines, ''];
  });

  return [title, `Seed: ${result.seed}`, '', ...cards].join('\n');
}

export function formatPeerRoleCardPrintLayout(
  result: StoryDiceResult,
  options: PeerRoleCardsOptions = {},
): PeerRoleCardPrintLayout {
  const title = options.title?.trim() || 'Story Dice Lab peer role cards';

  return {
    title,
    seedLabel: 'Seed',
    seed: result.seed,
    cutLineLabel: 'Cut along dashed lines',
    cards: peerRoleCardEntries(result),
  };
}

export function formatRevisionActionPlan(result: StoryDiceResult, options: ActionPlanOptions = {}): string {
  const title = options.title?.trim() || 'Story Dice Lab action plan';
  const { character, want, setting, obstacle, object, twist } = result.dice;

  return [
    title,
    `Seed: ${result.seed}`,
    '',
    'Prioritized next steps',
    `1. Connector - Character/want: Revise one sentence so the ${character} makes a visible choice toward this want: ${want}.`,
    `2. Detail Coach - Setting/object: Add one concrete sensory beat where ${setting} changes how ${object} is used.`,
    `3. Stakes Coach - Obstacle/twist: Raise the cost by showing how ${obstacle} or ${twist} changes the next decision.`,
    '',
    'Commit: I will revise the next draft using these three critique-backed steps.',
  ].join('\n');
}

export function formatExportActionControls(): string {
  return `<div class="actions">
          <button id="roll-all" type="button">Reroll all unlocked dice</button>
          <button id="copy" type="button">Copy prompt</button>
          <button id="copy-outline" type="button">Copy outline</button>
          <button id="copy-handout" type="button">Copy handout</button>
          <button id="copy-markdown" type="button">Copy Markdown</button>
          <button id="print-prompt" type="button">Print prompt sheet</button>
          <button id="share" type="button">Copy share link</button>
        </div>`;
}

export function normalizeRevisionCardsControls(title: string): RevisionCardsOptions {
  const normalizedTitle = title.trim();

  return normalizedTitle ? { title: normalizedTitle } : {};
}

export function normalizePeerRoleCardsControls(title: string): PeerRoleCardsOptions {
  const normalizedTitle = title.trim();

  return normalizedTitle ? { title: normalizedTitle } : {};
}

export function normalizeActionPlanControls(title: string): ActionPlanOptions {
  const normalizedTitle = title.trim();

  return normalizedTitle ? { title: normalizedTitle } : {};
}

export function normalizeFacilitatorAgendaControls(title: string, totalMinutes: string): FacilitatorAgendaOptions {
  const normalizedTitle = title.trim();
  const parsedMinutes = Number(totalMinutes);
  const options: FacilitatorAgendaOptions = {
    totalMinutes: Number.isInteger(parsedMinutes) && parsedMinutes >= agendaPhases.length ? parsedMinutes : 25,
  };

  if (normalizedTitle) {
    options.title = normalizedTitle;
  }

  return options;
}

export function formatPeerRoleCardsControls(options: PeerRoleCardsOptions = {}): string {
  const title = options.title?.trim() ?? '';

  return `<div class="peer-role-card-controls" aria-labelledby="peer-role-card-controls-title">
    <h2 id="peer-role-card-controls-title">Peer role cards</h2>
    <p id="peer-role-card-help">Set a small-group critique round title before copying or printing peer role cards.</p>
    <div class="peer-role-card-fields">
      <div>
        <label class="peer-role-card-field" for="peer-role-card-title">Peer role-card title</label>
        <input id="peer-role-card-title" value="${escapeHtml(title)}" aria-describedby="peer-role-card-help" />
      </div>
    </div>
    <button id="copy-peer-role-cards" type="button">Copy peer role cards</button>
    <button id="print-peer-role-cards" type="button" aria-describedby="peer-role-card-help">Print peer role-card layout</button>
  </div>`;
}

export function formatRevisionCardsControls(options: RevisionCardsOptions = {}): string {
  const title = options.title?.trim() ?? '';

  return `<div class="revision-card-controls" aria-labelledby="revision-card-controls-title">
    <h2 id="revision-card-controls-title">Revision cards</h2>
    <p id="revision-card-help">Set a class, activity, or peer-review pass title before copying revision cards.</p>
    <div class="revision-card-fields">
      <div>
        <label class="revision-card-field" for="revision-card-title">Revision card title</label>
        <input id="revision-card-title" value="${escapeHtml(title)}" aria-describedby="revision-card-help" />
      </div>
    </div>
    <button id="copy-revision-cards" type="button">Copy revision cards</button>
    <button id="print-revision-cards" type="button" aria-describedby="revision-card-help">Print revision-card layout</button>
  </div>`;
}

export function formatFacilitatorAgendaControls(options: FacilitatorAgendaOptions = {}): string {
  const title = options.title?.trim() ?? '';
  const totalMinutes = options.totalMinutes ?? 25;

  return `<div class="agenda-controls" aria-labelledby="agenda-controls-title">
    <h2 id="agenda-controls-title">Facilitator agenda</h2>
    <p id="agenda-help">Set the agenda title and sprint length before copying the facilitator agenda.</p>
    <div class="agenda-fields">
      <div>
        <label class="agenda-field" for="agenda-title">Agenda title</label>
        <input id="agenda-title" value="${escapeHtml(title)}" aria-describedby="agenda-help" />
      </div>
      <div>
        <label class="agenda-field" for="agenda-minutes">Total minutes</label>
        <input id="agenda-minutes" type="number" min="${agendaPhases.length}" step="1" value="${totalMinutes}" aria-describedby="agenda-help" />
      </div>
    </div>
    <button id="copy-agenda" type="button">Copy agenda</button>
    <button id="copy-timer-cards" type="button">Copy timer cards</button>
    <button id="print-timer-cards" type="button" aria-describedby="agenda-help">Print timer-card layout</button>
  </div>`;
}

export function formatActionPlanControls(options: ActionPlanOptions = {}): string {
  const title = options.title?.trim() ?? '';

  return `<div class="action-plan-controls" aria-labelledby="action-plan-controls-title">
    <h2 id="action-plan-controls-title">Action plan</h2>
    <p id="action-plan-help">Set a post-critique title before copying a three-step revision action plan.</p>
    <div class="action-plan-fields">
      <div>
        <label class="action-plan-field" for="action-plan-title">Action-plan title</label>
        <input id="action-plan-title" value="${escapeHtml(title)}" aria-describedby="action-plan-help" />
      </div>
    </div>
    <button id="copy-action-plan" type="button">Copy action plan</button>
  </div>`;
}

export function formatMarkdownPrompt(result: StoryDiceResult): string {
  const diceLines = storyDiceCategories.map((category) => {
    const label = category[0].toUpperCase() + category.slice(1);
    return `- ${label}: ${escapeMarkdown(result.dice[category])}`;
  });

  return [
    '# Story prompt',
    '',
    `Seed: ${result.seed}`,
    '',
    ...diceLines,
    '',
    '## Workshop questions',
    '',
    ...workshopQuestions.map((question, index) => `${index + 1}. ${question}`),
  ].join('\n');
}

export function formatCopySource(result: StoryDiceResult, source: CopySource): string {
  if (source === 'handout') return formatHandout(result);
  if (source === 'outline') return formatSceneBeatOutline(result);
  if (source === 'revisionCards') return formatRevisionCards(result);
  if (source === 'timerCards') return formatTimerCards(result);
  if (source === 'peerRoleCards') return formatPeerRoleCards(result);
  if (source === 'actionPlan') return formatRevisionActionPlan(result);
  return formatPrompt(result);
}

export function formatPrintSheet(result: StoryDiceResult, options: HandoutOptions = {}): PrintSheet {
  const title = options.title?.trim() || 'Story Dice Lab';
  return {
    title,
    seedLabel: 'Seed',
    seed: result.seed,
    dice: storyDiceCategories.map((category) => ({
      category: category[0].toUpperCase() + category.slice(1),
      value: result.dice[category],
    })),
    questions: [...workshopQuestions],
  };
}

export function printCurrentPrompt(target: BrowserPrintTarget): void {
  target.print();
}

export function normalizeWordBankJson(source: unknown): StoryDiceWordBank {
  if (typeof source === 'string') {
    try {
      return normalizeWordBank(JSON.parse(source) as unknown);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Word bank JSON is invalid: ${error.message}`);
      }
      throw error;
    }
  }

  return normalizeWordBank(source);
}

export function serializeWordBank(bank: StoryDiceWordBank = defaultWordBank): string {
  return JSON.stringify(normalizeWordBank(bank), null, 2);
}

export function encodeShareState(state: ShareState): string {
  const params = new URLSearchParams();
  params.set('seed', state.seed);
  const locked = [...state.locked].filter(isStoryDiceCategory).sort();
  if (locked.length > 0) params.set('locked', locked.join(','));
  return params.toString();
}

export function decodeShareState(query: string): ShareState {
  const params = new URLSearchParams(query.startsWith('#') || query.startsWith('?') ? query.slice(1) : query);
  const seed = params.get('seed') ?? 'moonlit workshop';
  const locked = new Set(
    (params.get('locked') ?? '')
      .split(',')
      .filter(isStoryDiceCategory),
  );
  return { seed, locked };
}

function isStoryDiceCategory(value: string): value is StoryDiceCategory {
  return storyDiceCategories.includes(value as StoryDiceCategory);
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_[\]{}()#+\-.!|>]/g, '\\$&');
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

function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function revisionCardEntries(result: StoryDiceResult): RevisionCardPrintLayout['cards'] {
  return storyDiceCategories.map((category, index) => {
    const guidance = revisionCardGuidance[category];
    return {
      number: `Card ${index + 1} of ${storyDiceCategories.length}`,
      category: category[0].toUpperCase() + category.slice(1),
      value: result.dice[category],
      task: guidance.task,
      question: guidance.question,
    };
  });
}

function peerRoleCardEntries(result: StoryDiceResult): PeerRoleCardPrintLayout['cards'] {
  return peerRoleCardGuidance.map((guidance, index) => ({
    number: `Role ${index + 1} of ${peerRoleCardGuidance.length}`,
    role: guidance.role,
    focus: guidance.focus,
    task: guidance.task(result),
    question: guidance.question,
  }));
}

function scaleAgendaMinutes(totalMinutes: number): number[] {
  if (!Number.isInteger(totalMinutes) || totalMinutes < agendaPhases.length) {
    throw new Error(`Facilitator agenda totalMinutes must be at least ${agendaPhases.length} minutes`);
  }

  const baseTotal = agendaPhases.reduce((sum, phase) => sum + phase.minutes, 0);
  const scaled = agendaPhases.map((phase) => Math.max(1, Math.round((phase.minutes / baseTotal) * totalMinutes)));
  let difference = totalMinutes - scaled.reduce((sum, minutes) => sum + minutes, 0);

  while (difference !== 0) {
    const candidates = scaled
      .map((minutes, index) => ({
        index,
        distance: minutes / agendaPhases[index].minutes - totalMinutes / baseTotal,
      }))
      .filter((candidate) => difference > 0 || scaled[candidate.index] > 1)
      .sort((first, second) => {
        const distance = difference > 0 ? first.distance - second.distance : second.distance - first.distance;
        return distance || first.index - second.index;
      });

    const next = candidates[0]?.index;
    if (next === undefined) break;
    scaled[next] += difference > 0 ? 1 : -1;
    difference += difference > 0 ? -1 : 1;
  }

  return scaled;
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function timerCardActionLines(result: StoryDiceResult): string[] {
  return [
    'Check when the group has named one vivid image.',
    `Check when ${result.dice.character} wants ${result.dice.want} has a visible first action.`,
    `Check when the scene uses ${result.dice.setting} and ${result.dice.obstacle} on the page.`,
    `Check when ${result.dice.object} or ${result.dice.twist} has changed a choice.`,
    'Check when each writer has one next revision question.',
  ];
}

function normalizeWordBank(source: unknown): StoryDiceWordBank {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('Word bank must be a JSON object with character, want, setting, obstacle, object, and twist arrays');
  }

  const record = source as Record<string, unknown>;
  const errors: string[] = [];
  const normalized = {} as StoryDiceWordBank;

  for (const category of storyDiceCategories) {
    const entries = record[category];
    if (!Array.isArray(entries)) {
      errors.push(`${category} must be an array`);
      continue;
    }

    const invalidIndex = entries.findIndex((entry) => typeof entry !== 'string');
    if (invalidIndex >= 0) {
      errors.push(`${category} entry ${invalidIndex + 1} must be a string`);
      continue;
    }

    const values = [...new Set(entries.map((entry) => entry.trim()).filter(Boolean))];
    if (values.length === 0) {
      errors.push(`${category} must include at least one ${entries.length > 0 ? 'non-empty ' : ''}entry`);
      continue;
    }

    normalized[category] = values;
  }

  const unknownCategories = Object.keys(record).filter((key) => !isStoryDiceCategory(key));
  if (unknownCategories.length > 0) {
    errors.push(`unknown categories: ${unknownCategories.join(', ')}`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  return normalized;
}
