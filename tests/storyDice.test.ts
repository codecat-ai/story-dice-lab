import { describe, expect, it } from 'vitest';
import {
  decodeShareState,
  encodeShareState,
  formatActionPlanControls,
  formatFacilitatorAgenda,
  formatCopySource,
  formatExportActionControls,
  formatHandout,
  formatMarkdownPrompt,
  formatPeerRoleCardPrintLayout,
  formatPeerRoleCards,
  formatPeerRoleCardsControls,
  formatPrintSheet,
  formatPrompt,
  formatRevisionCardPrintLayout,
  formatRevisionCards,
  formatRevisionCardsControls,
  formatRevisionActionPlan,
  formatSceneBeatOutline,
  formatTimerCardPrintLayout,
  formatTimerCards,
  formatFacilitatorAgendaControls,
  formatFacilitatorTimerDisplay,
  normalizeActionPlanControls,
  normalizePeerRoleCardsControls,
  normalizeFacilitatorAgendaControls,
  normalizeRevisionCardsControls,
  resolveFacilitatorTimerPhase,
  normalizeWordBankJson,
  printCurrentPrompt,
  rerollDie,
  rollDice,
  serializeWordBank,
  type StoryDiceCategory,
  type StoryDiceWordBank,
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

  it('formats a deterministic printable workshop handout', () => {
    const result = rollDice('paper comet');

    expect(formatHandout(result, { title: 'Scene Sprint' })).toBe(`Scene Sprint
Seed: paper comet

Dice
1. Character: ${result.dice.character}
2. Want: ${result.dice.want}
3. Setting: ${result.dice.setting}
4. Obstacle: ${result.dice.obstacle}
5. Object: ${result.dice.object}
6. Twist: ${result.dice.twist}

Workshop prompts
1. What does the character do first to pursue the want?
2. How does the obstacle make the setting harder to navigate?
3. Where can the object or twist force a visible choice in the scene?`);

    expect(formatHandout(result)).toContain('Story Dice Lab\nSeed: paper comet');
  });

  it('formats a deterministic timed facilitator agenda from the current dice', () => {
    const result = rollDice('paper comet');

    expect(formatFacilitatorAgenda(result)).toBe(`Story Dice Lab facilitator agenda
Seed: paper comet

Dice
1. Character: ${result.dice.character}
2. Want: ${result.dice.want}
3. Setting: ${result.dice.setting}
4. Obstacle: ${result.dice.obstacle}
5. Object: ${result.dice.object}
6. Twist: ${result.dice.twist}

Timed scene sprint (25 minutes)
1. 3 min - Warm-up: Read all six dice aloud and ask everyone to choose one image that feels alive.
2. 5 min - Character choice: Pair the character with the want and name the first choice they will make.
3. 10 min - Draft: Write one scene in the setting while the obstacle pushes back.
4. 5 min - Share: Read a favorite moment and name where the object or twist changed the scene.
5. 2 min - Reflection: Capture one revision question before the next sprint.

Facilitator notes
- Character/want decision: ${result.dice.character} wants ${result.dice.want}; ask what action proves that want on the page.
- Obstacle/setting pressure: In the ${result.dice.setting}, ${result.dice.obstacle} should make the easy path harder.
- Object/twist turn: Use ${result.dice.object} when ${result.dice.twist} needs to force a visible choice.`);
  });

  it('formats a deterministic five-beat scene outline using all six dice', () => {
    const result = {
      seed: 'outline seed',
      dice: {
        character: 'runaway archivist',
        want: 'to return a borrowed name',
        setting: 'abandoned clock tower',
        obstacle: 'a deadline at sunrise',
        object: 'brass compass',
        twist: 'home has been following them',
      },
    };

    expect(formatSceneBeatOutline(result)).toBe(`Scene beat outline
Seed: outline seed

1. Opening image: In the abandoned clock tower, the runaway archivist notices the brass compass before the scene starts moving.
2. Desire: The runaway archivist wants to return a borrowed name badly enough to act now.
3. Complication: A deadline at sunrise turns the abandoned clock tower against that plan.
4. Turning point: When home has been following them, the brass compass forces the runaway archivist to choose a new tactic.
5. Ending hook: The choice changes what to return a borrowed name will cost next.`);
  });

  it('formats deterministic revision cards using all six current dice', () => {
    const result = {
      seed: 'revision seed',
      dice: {
        character: 'runaway archivist',
        want: 'to return a borrowed name',
        setting: 'abandoned clock tower',
        obstacle: 'a deadline at sunrise',
        object: 'brass compass',
        twist: 'home has been following them',
      },
    };

    expect(formatRevisionCards(result, { title: ' Peer revision pass ' })).toBe(`Peer revision pass
Seed: revision seed

1. Character: runaway archivist
Task: Give the character one agency-driven choice that changes how the scene unfolds.
Question: What does the character actively decide instead of only reacting?

2. Want: to return a borrowed name
Task: Raise the stakes so failing to get what they want would cost something specific.
Question: What becomes harder, riskier, or more personal if this want is delayed?

3. Setting: abandoned clock tower
Task: Add sensory detail from the setting that affects the action on the page.
Question: Which sight, sound, smell, texture, or temperature changes what someone does?

4. Obstacle: a deadline at sunrise
Task: Escalate the obstacle so the next attempt cannot use the same easy plan.
Question: How does the obstacle force a bigger risk or sharper choice?

5. Object: brass compass
Task: Make the object part of a concrete action instead of background decoration.
Question: Who touches, uses, hides, breaks, or trades the object?

6. Twist: home has been following them
Task: Show a consequence of the twist that changes the scene's next move.
Question: What new problem, cost, or opportunity appears because of the twist?`);
  });

  it('uses the default revision card title when a custom title is blank', () => {
    const result = rollDice('paper comet');

    expect(formatRevisionCards(result, { title: '   ' }).startsWith('Story Dice Lab revision cards\nSeed: paper comet')).toBe(
      true,
    );
  });

  it('formats a deterministic printable revision-card layout with cut lines', () => {
    const result = {
      seed: 'revision seed',
      dice: {
        character: 'runaway archivist',
        want: 'to return a borrowed name',
        setting: 'abandoned clock tower',
        obstacle: 'a deadline at sunrise',
        object: 'brass compass',
        twist: 'home has been following them',
      },
    };

    expect(formatRevisionCardPrintLayout(result, { title: ' Peer revision pass ' })).toEqual({
      title: 'Peer revision pass',
      seedLabel: 'Seed',
      seed: 'revision seed',
      cutLineLabel: 'Cut along dashed lines',
      cards: [
        {
          number: 'Card 1 of 6',
          category: 'Character',
          value: 'runaway archivist',
          task: 'Give the character one agency-driven choice that changes how the scene unfolds.',
          question: 'What does the character actively decide instead of only reacting?',
        },
        {
          number: 'Card 2 of 6',
          category: 'Want',
          value: 'to return a borrowed name',
          task: 'Raise the stakes so failing to get what they want would cost something specific.',
          question: 'What becomes harder, riskier, or more personal if this want is delayed?',
        },
        {
          number: 'Card 3 of 6',
          category: 'Setting',
          value: 'abandoned clock tower',
          task: 'Add sensory detail from the setting that affects the action on the page.',
          question: 'Which sight, sound, smell, texture, or temperature changes what someone does?',
        },
        {
          number: 'Card 4 of 6',
          category: 'Obstacle',
          value: 'a deadline at sunrise',
          task: 'Escalate the obstacle so the next attempt cannot use the same easy plan.',
          question: 'How does the obstacle force a bigger risk or sharper choice?',
        },
        {
          number: 'Card 5 of 6',
          category: 'Object',
          value: 'brass compass',
          task: 'Make the object part of a concrete action instead of background decoration.',
          question: 'Who touches, uses, hides, breaks, or trades the object?',
        },
        {
          number: 'Card 6 of 6',
          category: 'Twist',
          value: 'home has been following them',
          task: "Show a consequence of the twist that changes the scene's next move.",
          question: 'What new problem, cost, or opportunity appears because of the twist?',
        },
      ],
    });
  });

  it('normalizes revision card UI controls before copying', () => {
    expect(normalizeRevisionCardsControls(' Peer review pass ')).toEqual({
      title: 'Peer review pass',
    });

    expect(normalizeRevisionCardsControls('   ')).toEqual({});
  });

  it('renders accessible revision card controls before the copy button', () => {
    const controls = formatRevisionCardsControls({
      title: 'Peer <review> & "notes"',
    });

    expect(controls).toContain('<label class="revision-card-field" for="revision-card-title">Revision card title</label>');
    expect(controls).toContain(
      '<input id="revision-card-title" value="Peer &lt;review&gt; &amp; &quot;notes&quot;" aria-describedby="revision-card-help" />',
    );
    expect(controls).toContain(
      '<p id="revision-card-help">Set a class, activity, or peer-review pass title before copying revision cards.</p>',
    );
    expect(controls).toContain('<button id="copy-revision-cards" type="button">Copy revision cards</button>');
    expect(controls).toContain(
      '<button id="print-revision-cards" type="button" aria-describedby="revision-card-help">Print revision-card layout</button>',
    );
    expect(controls.indexOf('id="revision-card-title"')).toBeLessThan(
      controls.indexOf('id="copy-revision-cards"'),
    );
    expect(controls.indexOf('id="copy-revision-cards"')).toBeLessThan(
      controls.indexOf('id="print-revision-cards"'),
    );
  });

  it('scales facilitator agenda phase minutes to a custom total while summing exactly', () => {
    const result = rollDice('paper comet');
    const agenda = formatFacilitatorAgenda(result, {
      title: 'Middle school scene sprint',
      totalMinutes: 17,
    });

    expect(agenda).toContain('Middle school scene sprint\nSeed: paper comet');
    expect(agenda).toContain('Timed scene sprint (17 minutes)');
    expect(agenda).toContain('1. 2 min - Warm-up:');
    expect(agenda).toContain('2. 3 min - Character choice:');
    expect(agenda).toContain('3. 7 min - Draft:');
    expect(agenda).toContain('4. 3 min - Share:');
    expect(agenda).toContain('5. 2 min - Reflection:');
  });

  it('formats deterministic timer cards for each facilitator agenda phase', () => {
    const result = {
      seed: 'timer seed',
      dice: {
        character: 'runaway archivist',
        want: 'to return a borrowed name',
        setting: 'abandoned clock tower',
        obstacle: 'a deadline at sunrise',
        object: 'brass compass',
        twist: 'home has been following them',
      },
    };

    expect(formatTimerCards(result, { title: ' Scene sprint timers ', totalMinutes: 17 })).toBe(`Scene sprint timers
Seed: timer seed
Total: 17 minutes

[ ] Start 2-minute timer
Phase 1 of 5: Warm-up
Facilitator prompt: Read all six dice aloud and ask everyone to choose one image that feels alive.
Action: Check when the group has named one vivid image.

[ ] Start 3-minute timer
Phase 2 of 5: Character choice
Facilitator prompt: Pair the character with the want and name the first choice they will make.
Action: Check when runaway archivist wants to return a borrowed name has a visible first action.

[ ] Start 7-minute timer
Phase 3 of 5: Draft
Facilitator prompt: Write one scene in the setting while the obstacle pushes back.
Action: Check when the scene uses abandoned clock tower and a deadline at sunrise on the page.

[ ] Start 3-minute timer
Phase 4 of 5: Share
Facilitator prompt: Read a favorite moment and name where the object or twist changed the scene.
Action: Check when brass compass or home has been following them has changed a choice.

[ ] Start 2-minute timer
Phase 5 of 5: Reflection
Facilitator prompt: Capture one revision question before the next sprint.
Action: Check when each writer has one next revision question.`);
  });

  it('computes facilitator timer phase state with previous and next phase boundaries', () => {
    const result = {
      seed: 'timer seed',
      dice: {
        character: 'runaway archivist',
        want: 'to return a borrowed name',
        setting: 'abandoned clock tower',
        obstacle: 'a deadline at sunrise',
        object: 'brass compass',
        twist: 'home has been following them',
      },
    };

    expect(resolveFacilitatorTimerPhase(result, 0, { totalMinutes: 17 })).toEqual({
      currentIndex: 0,
      totalPhases: 5,
      phaseLabel: 'Phase 1 of 5',
      name: 'Warm-up',
      minutes: 2,
      prompt: 'Read all six dice aloud and ask everyone to choose one image that feels alive.',
      action: 'Check when the group has named one vivid image.',
      previousIndex: 0,
      nextIndex: 1,
      isFirst: true,
      isLast: false,
    });

    expect(resolveFacilitatorTimerPhase(result, 2, { totalMinutes: 17 })).toMatchObject({
      currentIndex: 2,
      phaseLabel: 'Phase 3 of 5',
      name: 'Draft',
      minutes: 7,
      previousIndex: 1,
      nextIndex: 3,
      isFirst: false,
      isLast: false,
    });

    expect(resolveFacilitatorTimerPhase(result, 99, { totalMinutes: 17 })).toMatchObject({
      currentIndex: 4,
      phaseLabel: 'Phase 5 of 5',
      name: 'Reflection',
      minutes: 2,
      previousIndex: 3,
      nextIndex: 4,
      isFirst: false,
      isLast: true,
    });
  });

  it('renders an accessible large-type facilitator timer display with manual controls', () => {
    const result = {
      seed: 'timer seed',
      dice: {
        character: 'runaway archivist',
        want: 'to return a borrowed name',
        setting: 'abandoned clock tower',
        obstacle: 'a deadline at sunrise',
        object: 'brass compass',
        twist: 'home has been following them',
      },
    };

    const display = formatFacilitatorTimerDisplay(result, 2, { title: ' Live sprint ', totalMinutes: 17 });

    expect(display).toContain('<section class="facilitator-timer-display" aria-labelledby="facilitator-timer-title">');
    expect(display).toContain('<h2 id="facilitator-timer-title">Live sprint</h2>');
    expect(display).toContain('<p class="timer-display-phase">Phase 3 of 5</p>');
    expect(display).toContain('<p class="timer-display-name">Draft</p>');
    expect(display).toContain('<p class="timer-display-minutes" aria-label="7 minutes">7<span>min</span></p>');
    expect(display).toContain('Write one scene in the setting while the obstacle pushes back.');
    expect(display).toContain('Check when the scene uses abandoned clock tower and a deadline at sunrise on the page.');
    expect(display).toContain('<button id="timer-prev" type="button" aria-label="Show previous timer phase">Previous</button>');
    expect(display).toContain('<button id="timer-reset" type="button" aria-label="Reset timer display to first phase">Reset</button>');
    expect(display).toContain('<button id="timer-next" type="button" aria-label="Show next timer phase">Next</button>');
  });

  it('formats deterministic small-group peer role cards using the current dice', () => {
    const result = {
      seed: 'peer seed',
      dice: {
        character: 'runaway archivist',
        want: 'to return a borrowed name',
        setting: 'abandoned clock tower',
        obstacle: 'a deadline at sunrise',
        object: 'brass compass',
        twist: 'home has been following them',
      },
    };

    expect(formatPeerRoleCards(result, { title: ' Peer critique roles ' })).toBe(`Peer critique roles
Seed: peer seed

1. Connector
Focus: Character and want
Task: Name where the runaway archivist's choice clearly serves the want: to return a borrowed name.
Question: Which sentence best proves the want on the page?

2. Detail Coach
Focus: Setting and object
Task: Find one place where abandoned clock tower or brass compass can become a concrete sensory detail.
Question: What can the writer add so readers can see, hear, or touch the moment?

3. Stakes Coach
Focus: Obstacle and want
Task: Check whether a deadline at sunrise makes to return a borrowed name harder, riskier, or more personal.
Question: What cost should increase before the scene ends?

4. Twist Tracker
Focus: Twist and next choice
Task: Track how home has been following them changes what the runaway archivist does next.
Question: Where should the writer show the consequence instead of explaining it?`);
  });

  it('formats a deterministic printable peer role-card layout with cut lines', () => {
    const result = {
      seed: 'peer seed',
      dice: {
        character: 'runaway archivist',
        want: 'to return a borrowed name',
        setting: 'abandoned clock tower',
        obstacle: 'a deadline at sunrise',
        object: 'brass compass',
        twist: 'home has been following them',
      },
    };

    expect(formatPeerRoleCardPrintLayout(result, { title: ' Peer critique roles ' })).toEqual({
      title: 'Peer critique roles',
      seedLabel: 'Seed',
      seed: 'peer seed',
      cutLineLabel: 'Cut along dashed lines',
      cards: [
        {
          number: 'Role 1 of 4',
          role: 'Connector',
          focus: 'Character and want',
          task: "Name where the runaway archivist's choice clearly serves the want: to return a borrowed name.",
          question: 'Which sentence best proves the want on the page?',
        },
        {
          number: 'Role 2 of 4',
          role: 'Detail Coach',
          focus: 'Setting and object',
          task: 'Find one place where abandoned clock tower or brass compass can become a concrete sensory detail.',
          question: 'What can the writer add so readers can see, hear, or touch the moment?',
        },
        {
          number: 'Role 3 of 4',
          role: 'Stakes Coach',
          focus: 'Obstacle and want',
          task: 'Check whether a deadline at sunrise makes to return a borrowed name harder, riskier, or more personal.',
          question: 'What cost should increase before the scene ends?',
        },
        {
          number: 'Role 4 of 4',
          role: 'Twist Tracker',
          focus: 'Twist and next choice',
          task: 'Track how home has been following them changes what the runaway archivist does next.',
          question: 'Where should the writer show the consequence instead of explaining it?',
        },
      ],
    });
  });

  it('formats a compact deterministic post-critique action plan with exactly three prioritized steps', () => {
    const result = {
      seed: 'action seed',
      dice: {
        character: 'runaway archivist',
        want: 'to return a borrowed name',
        setting: 'abandoned clock tower',
        obstacle: 'a deadline at sunrise',
        object: 'brass compass',
        twist: 'home has been following them',
      },
    };

    const plan = formatRevisionActionPlan(result, { title: ' Post-critique pass ' });

    expect(plan).toBe(`Post-critique pass
Seed: action seed

Prioritized next steps
1. Connector - Character/want: Revise one sentence so the runaway archivist makes a visible choice toward this want: to return a borrowed name.
2. Detail Coach - Setting/object: Add one concrete sensory beat where abandoned clock tower changes how brass compass is used.
3. Stakes Coach - Obstacle/twist: Raise the cost by showing how a deadline at sunrise or home has been following them changes the next decision.

Commit: I will revise the next draft using these three critique-backed steps.`);
    expect(plan.match(/^\d\. /gm)).toHaveLength(3);
  });

  it('uses the default action-plan title when a custom title is blank', () => {
    const result = rollDice('paper comet');

    expect(formatRevisionActionPlan(result, { title: '   ' }).startsWith('Story Dice Lab action plan\nSeed: paper comet')).toBe(
      true,
    );
  });

  it('normalizes and renders accessible action-plan controls before the copy button', () => {
    expect(normalizeActionPlanControls(' Critique next steps ')).toEqual({
      title: 'Critique next steps',
    });

    expect(normalizeActionPlanControls('   ')).toEqual({});

    const controls = formatActionPlanControls({
      title: 'Plan <round> & "commit"',
    });

    expect(controls).toContain('<label class="action-plan-field" for="action-plan-title">Action-plan title</label>');
    expect(controls).toContain(
      '<input id="action-plan-title" value="Plan &lt;round&gt; &amp; &quot;commit&quot;" aria-describedby="action-plan-help" />',
    );
    expect(controls).toContain(
      '<p id="action-plan-help">Set a post-critique title before copying a three-step revision action plan.</p>',
    );
    expect(controls).toContain('<button id="copy-action-plan" type="button">Copy action plan</button>');
    expect(controls.indexOf('id="action-plan-title"')).toBeLessThan(
      controls.indexOf('id="copy-action-plan"'),
    );
  });

  it('normalizes and renders accessible peer role-card controls before copy and print buttons', () => {
    expect(normalizePeerRoleCardsControls(' Critique round A ')).toEqual({
      title: 'Critique round A',
    });

    expect(normalizePeerRoleCardsControls('   ')).toEqual({});

    const controls = formatPeerRoleCardsControls({
      title: 'Peer <roles> & "jobs"',
    });

    expect(controls).toContain('<label class="peer-role-card-field" for="peer-role-card-title">Peer role-card title</label>');
    expect(controls).toContain(
      '<input id="peer-role-card-title" value="Peer &lt;roles&gt; &amp; &quot;jobs&quot;" aria-describedby="peer-role-card-help" />',
    );
    expect(controls).toContain(
      '<p id="peer-role-card-help">Set a small-group critique round title before copying or printing peer role cards.</p>',
    );
    expect(controls).toContain('<button id="copy-peer-role-cards" type="button">Copy peer role cards</button>');
    expect(controls).toContain(
      '<button id="print-peer-role-cards" type="button" aria-describedby="peer-role-card-help">Print peer role-card layout</button>',
    );
    expect(controls.indexOf('id="peer-role-card-title"')).toBeLessThan(
      controls.indexOf('id="copy-peer-role-cards"'),
    );
    expect(controls.indexOf('id="copy-peer-role-cards"')).toBeLessThan(
      controls.indexOf('id="print-peer-role-cards"'),
    );
  });

  it('formats a deterministic printable timer-card layout with cut lines', () => {
    const result = {
      seed: 'timer seed',
      dice: {
        character: 'runaway archivist',
        want: 'to return a borrowed name',
        setting: 'abandoned clock tower',
        obstacle: 'a deadline at sunrise',
        object: 'brass compass',
        twist: 'home has been following them',
      },
    };

    expect(formatTimerCardPrintLayout(result, { title: ' Scene sprint timers ', totalMinutes: 17 })).toEqual({
      title: 'Scene sprint timers',
      seedLabel: 'Seed',
      seed: 'timer seed',
      totalLabel: 'Total',
      totalMinutes: 17,
      cutLineLabel: 'Cut along dashed lines',
      cards: [
        {
          phase: 'Phase 1 of 5',
          name: 'Warm-up',
          timer: '2-minute timer',
          prompt: 'Read all six dice aloud and ask everyone to choose one image that feels alive.',
          action: 'Check when the group has named one vivid image.',
        },
        {
          phase: 'Phase 2 of 5',
          name: 'Character choice',
          timer: '3-minute timer',
          prompt: 'Pair the character with the want and name the first choice they will make.',
          action: 'Check when runaway archivist wants to return a borrowed name has a visible first action.',
        },
        {
          phase: 'Phase 3 of 5',
          name: 'Draft',
          timer: '7-minute timer',
          prompt: 'Write one scene in the setting while the obstacle pushes back.',
          action: 'Check when the scene uses abandoned clock tower and a deadline at sunrise on the page.',
        },
        {
          phase: 'Phase 4 of 5',
          name: 'Share',
          timer: '3-minute timer',
          prompt: 'Read a favorite moment and name where the object or twist changed the scene.',
          action: 'Check when brass compass or home has been following them has changed a choice.',
        },
        {
          phase: 'Phase 5 of 5',
          name: 'Reflection',
          timer: '2-minute timer',
          prompt: 'Capture one revision question before the next sprint.',
          action: 'Check when each writer has one next revision question.',
        },
      ],
    });
  });

  it('rejects facilitator agenda totals below the number of phases', () => {
    const result = rollDice('paper comet');

    expect(() => formatFacilitatorAgenda(result, { totalMinutes: 4 })).toThrow(
      'Facilitator agenda totalMinutes must be at least 5 minutes',
    );
  });

  it('normalizes facilitator agenda UI controls before copying', () => {
    expect(normalizeFacilitatorAgendaControls(' Middle school scene sprint ', '17')).toEqual({
      title: 'Middle school scene sprint',
      totalMinutes: 17,
    });

    expect(normalizeFacilitatorAgendaControls('   ', '4')).toEqual({
      totalMinutes: 25,
    });
  });

  it('renders accessible facilitator agenda controls before the copy button', () => {
    const controls = formatFacilitatorAgendaControls({
      title: 'Middle school scene sprint',
      totalMinutes: 17,
    });

    expect(controls).toContain('<label class="agenda-field" for="agenda-title">Agenda title</label>');
    expect(controls).toContain(
      '<input id="agenda-title" value="Middle school scene sprint" aria-describedby="agenda-help" />',
    );
    expect(controls).toContain('<label class="agenda-field" for="agenda-minutes">Total minutes</label>');
    expect(controls).toContain(
      '<input id="agenda-minutes" type="number" min="5" step="1" value="17" aria-describedby="agenda-help" />',
    );
    expect(controls).toContain('<button id="copy-timer-cards" type="button">Copy timer cards</button>');
    expect(controls).toContain(
      '<button id="print-timer-cards" type="button" aria-describedby="agenda-help">Print timer-card layout</button>',
    );
    expect(controls.indexOf('id="agenda-minutes"')).toBeLessThan(controls.indexOf('id="copy-agenda"'));
    expect(controls.indexOf('id="copy-agenda"')).toBeLessThan(controls.indexOf('id="copy-timer-cards"'));
    expect(controls.indexOf('id="copy-timer-cards"')).toBeLessThan(controls.indexOf('id="print-timer-cards"'));
  });

  it('provides export actions and clipboard copy sources for the UI', () => {
    const result = rollDice('moonlit workshop');
    const actions = formatExportActionControls();

    expect(actions).not.toContain('id="copy-revision-cards"');
    expect(actions.indexOf('id="copy-handout"')).toBeLessThan(actions.indexOf('id="copy-markdown"'));
    expect(formatCopySource(result, 'handout')).toBe(formatHandout(result));
    expect(formatCopySource(result, 'outline')).toBe(formatSceneBeatOutline(result));
    expect(formatCopySource(result, 'revisionCards')).toBe(formatRevisionCards(result));
    expect(formatCopySource(result, 'timerCards')).toBe(formatTimerCards(result));
    expect(formatCopySource(result, 'peerRoleCards')).toBe(formatPeerRoleCards(result));
    expect(formatCopySource(result, 'actionPlan')).toBe(formatRevisionActionPlan(result));
    expect(formatCopySource(result, 'compact')).toBe(formatPrompt(result));
  });

  it('formats a Markdown prompt with escaped dice values and workshop questions', () => {
    const result = {
      seed: 'paper comet',
      dice: {
        character: 'keeper *of* [doors]',
        want: 'to fix #1 promise',
        setting: 'market_under_glass',
        obstacle: 'a rule (hourly)',
        object: 'brass compass: north > east',
        twist: 'home follows them!',
      },
    };

    expect(formatMarkdownPrompt(result)).toBe(`# Story prompt

Seed: paper comet

- Character: keeper \\*of\\* \\[doors\\]
- Want: to fix \\#1 promise
- Setting: market\\_under\\_glass
- Obstacle: a rule \\(hourly\\)
- Object: brass compass: north \\> east
- Twist: home follows them\\!

## Workshop questions

1. What does the character do first to pursue the want?
2. How does the obstacle make the setting harder to navigate?
3. Where can the object or twist force a visible choice in the scene?`);
  });

  it('formats a workshop-friendly print sheet with seed, dice, and questions', () => {
    const result = rollDice('paper comet');

    expect(formatPrintSheet(result)).toEqual({
      title: 'Story Dice Lab',
      seedLabel: 'Seed',
      seed: 'paper comet',
      dice: [
        { category: 'Character', value: result.dice.character },
        { category: 'Want', value: result.dice.want },
        { category: 'Setting', value: result.dice.setting },
        { category: 'Obstacle', value: result.dice.obstacle },
        { category: 'Object', value: result.dice.object },
        { category: 'Twist', value: result.dice.twist },
      ],
      questions: [
        'What does the character do first to pursue the want?',
        'How does the obstacle make the setting harder to navigate?',
        'Where can the object or twist force a visible choice in the scene?',
      ],
    });
  });

  it('prints the current prompt through an injectable browser print helper', () => {
    let calls = 0;

    printCurrentPrompt({ print: () => calls += 1 });

    expect(calls).toBe(1);
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

  it('normalizes a JSON word bank by trimming entries and removing duplicates', () => {
    const bank = normalizeWordBankJson(`{
      "character": [" curious pilot ", "curious pilot", "quiet baker"],
      "want": ["to find dawn"],
      "setting": ["clock market"],
      "obstacle": ["a locked moon"],
      "object": ["silver key"],
      "twist": ["the map is alive"]
    }`);

    expect(bank).toEqual({
      character: ['curious pilot', 'quiet baker'],
      want: ['to find dawn'],
      setting: ['clock market'],
      obstacle: ['a locked moon'],
      object: ['silver key'],
      twist: ['the map is alive'],
    });
  });

  it('rejects incomplete or invalid word banks with useful category errors', () => {
    expect(() =>
      normalizeWordBankJson({
        character: ['curious pilot'],
        want: ['to find dawn'],
        setting: [],
        obstacle: ['a locked moon'],
        object: ['silver key'],
      }),
    ).toThrow(/setting must include at least one entry; twist must be an array/);

    expect(() =>
      normalizeWordBankJson({
        character: ['curious pilot'],
        want: ['to find dawn'],
        setting: ['clock market'],
        obstacle: ['a locked moon'],
        object: ['silver key'],
        twist: ['   '],
      }),
    ).toThrow(/twist must include at least one non-empty entry/);
  });

  it('serializes a normalized word bank for export', () => {
    const bank: StoryDiceWordBank = {
      character: ['curious pilot'],
      want: ['to find dawn'],
      setting: ['clock market'],
      obstacle: ['a locked moon'],
      object: ['silver key'],
      twist: ['the map is alive'],
    };

    expect(serializeWordBank(bank)).toBe(`{
  "character": [
    "curious pilot"
  ],
  "want": [
    "to find dawn"
  ],
  "setting": [
    "clock market"
  ],
  "obstacle": [
    "a locked moon"
  ],
  "object": [
    "silver key"
  ],
  "twist": [
    "the map is alive"
  ]
}`);
  });

  it('uses custom word-bank values in deterministic rolls without breaking locked dice', () => {
    const customBank: StoryDiceWordBank = {
      character: ['custom hero'],
      want: ['custom want'],
      setting: ['custom setting'],
      obstacle: ['custom obstacle'],
      object: ['custom object'],
      twist: ['custom twist'],
    };
    const first = rollDice('custom seed', {}, customBank);
    const second = rollDice('custom seed', {}, customBank);
    const locked = rollDice(
      'different seed',
      {
        character: 'locked character',
        object: first.dice.object,
      },
      customBank,
    );

    expect(first).toEqual(second);
    expect(first.dice).toEqual({
      character: 'custom hero',
      want: 'custom want',
      setting: 'custom setting',
      obstacle: 'custom obstacle',
      object: 'custom object',
      twist: 'custom twist',
    });
    expect(locked.dice.character).toBe('locked character');
    expect(locked.dice.object).toBe('custom object');
    expect(locked.dice.want).toBe('custom want');
  });
});
