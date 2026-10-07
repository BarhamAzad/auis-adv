/**
 * Reusable, deliberately simplified learning activities.
 * Academic facts and their official citations live in the content layer.
 * These scenarios, specimens, ingredients, and dialogue are fictional.
 */
export const activityDefinitions = {
  intro: {
    id: 'intro', title: 'A Question Worth Following', regionId: 'village',
    subject: 'Observation, critical thinking, and study skills',
    description: 'The village fountain has gone quiet. Arrange a sensible investigation before touching its mechanism.',
    reward: 'Explorer’s field journal',
    hint: 'First observe what happened, then ask a focused question, then test one idea.',
  },
  bridge: {
    id: 'bridge', title: 'The River Span', regionId: 'engineering',
    subject: 'Materials and engineering design',
    description: 'Build a three-section bridge. Choose a material, add supports, and test the model under a loaded cart.',
    reward: 'A repaired bridge and an engineering discovery',
    hint: 'Install all three sections. In this simplified model, steel with two supports holds the loaded cart.',
  },
  energy: {
    id: 'energy', title: 'Catch the Morning Light', regionId: 'engineering',
    subject: 'Renewable energy and system connections',
    description: 'Aim the solar collector and connect its three power nodes. Deliver at least 80% power to the beacon.',
    reward: 'Power restored to the engineering workshop',
    hint: 'The sun sits at 35°. Turn on the collector, converter, and beacon connections, then measure the output.',
  },
  commands: {
    id: 'commands', title: 'A Path for Pip', regionId: 'computing',
    subject: 'Algorithms, sequencing, and debugging',
    description: 'Pip faces north. Reorder the commands to reach the glowing tile without hitting a wall.',
    reward: 'A computing discovery and an awakened network',
    hint: 'The left edge and top row are clear. Move three steps north, turn right, then move three steps east.',
  },
  market: {
    id: 'market', title: 'The First Market Day', regionId: 'business',
    subject: 'Budgets, resource allocation, and teamwork',
    description: 'Spend a 60-coin budget on a fictional market stall. Meet the day’s inventory, team, and publicity needs.',
    reward: 'A business discovery and a thriving stall',
    hint: 'The demand board asks for 30 coins of supplies, 20 for the team, and 10 for the sign. That uses exactly 60.',
  },
  story: {
    id: 'story', title: 'Two Stories, One Waterwheel', regionId: 'english',
    subject: 'Reading, reporting, and evaluating sources',
    description: 'Two newspapers disagree. Compare their claims with the records, then choose a supported explanation.',
    reward: 'An English discovery and a corrected report',
    hint: 'Use the dated repair note and the keeper’s signed attendance log. A repeated rumor is not independent evidence.',
  },
  samples: {
    id: 'samples', title: 'Patterns in the Glass', regionId: 'medical',
    subject: 'Laboratory observation and comparing samples',
    description: 'Focus on three simulated samples, record their bright markers, and find the sample with the most.',
    reward: 'A laboratory discovery and a research record',
    hint: 'Set magnification to at least 3× and record each sample. Compare the counts instead of guessing from one view.',
  },
  council: {
    id: 'council', title: 'A River Shared', regionId: 'social',
    subject: 'Negotiation, cooperation, and social consequences',
    description: 'Two fictional villages share 100 water units. Negotiate a plan that meets both needs and builds cooperation.',
    reward: 'A civic discovery and a village agreement',
    hint: 'Each village needs at least 40 units. A share between 40 and 60, with a jointly managed reservoir, meets both needs.',
  },
  light: {
    id: 'light', title: 'The Observatory Ray', regionId: 'mathematics',
    subject: 'Angles, reflection, and measurement',
    description: 'Rotate two mirrors to guide a beam into the star receiver. Observe the ray as you change each angle.',
    reward: 'A science discovery and a lit observatory',
    hint: 'Start near −21° on mirror A and −6° on mirror B. Reflected direction changes by twice the mirror’s rotation.',
  },
  tooth: {
    id: 'tooth', title: 'The Dental Teaching Model', regionId: 'dentistry',
    subject: 'Tooth structure and oral-health education',
    description: 'Assemble an oversized teaching model by matching its four structures to the labelled regions.',
    reward: 'A dentistry discovery and a completed teaching model',
    hint: 'Enamel is the outer crown, dentin lies beneath it, pulp occupies the inner chamber, and the root sits below the gum.',
  },
  ingredients: {
    id: 'ingredients', title: 'A Formula for Lantern Ink', regionId: 'pharmacy',
    subject: 'Classification, formulation, and experimental observation',
    description: 'Classify three imaginary ingredients and test their proportions to make a stable batch of lantern ink.',
    reward: 'A pharmacy discovery and glowing lanterns',
    hint: 'Clear dew carries, moonpetal colors, and moss-silk binds. The recipe uses 2 portions of carrier, 1 of colorant, and 1 of binder.',
  },
};

const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const find = (root, selector) => root.querySelector(selector);
const all = (root, selector) => [...root.querySelectorAll(selector)];
const button = (label, attributes = '', className = 'btn btn-secondary') => `<button type="button" class="${className}" ${attributes}>${label}</button>`;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// AUIS interface colors and their diagram tints. Shapes, labels and dashed
// paths continue to distinguish materials, structures and model states.
const diagramPalette = {
  navy: '#182b55',
  gold: '#c89921',
  white: '#ffffff',
  deepNavy: '#101d3b',
  navyTint: '#2d426d',
  blue: '#35517d',
  blueMid: '#6f8eb5',
  blueLight: '#a7bbd8',
  bluePale: '#d8e4f2',
  goldDark: '#8e6612',
  goldLight: '#ebd395',
  colorant: '#9699c6',
};

/**
 * Mount an activity into an existing modal.
 * onComplete receives the definition object once, after a successful test.
 * completed marks a replay: it still tests and gives feedback, without awarding twice.
 * The returned cleanup function cancels animation and detaches this activity.
 */
export function mountActivity(id, container, { onComplete = () => {}, onClose = () => {}, completed = false, reducedMotion = false } = {}) {
  const definition = activityDefinitions[id];
  if (!definition) throw new Error(`Unknown activity: ${id}`);
  let disposed = false;
  let awarded = Boolean(completed);
  let testing = false;
  container.innerHTML = `<section class="activity-shell" aria-label="${escapeHTML(definition.title)}">
    <div class="activity-heading"><span class="activity-eyebrow">Interactive discovery</span><span class="pill">${completed ? 'Completed · replay' : 'Try, observe, improve'}</span></div>
    <p class="activity-description">${escapeHTML(definition.description)}</p>
    <div class="activity-workspace"></div>
    <div class="activity-feedback" role="status" aria-live="polite">Change the model, then test your idea.</div>
    <div class="activity-completion" hidden></div>
    <div class="activity-actions">${button('Test idea', 'data-action="test"', 'btn btn-primary')}${button('Get a hint', 'data-action="hint"')}${button('Reset model', 'data-action="reset"')}${button('Return to world', 'data-action="close"', 'btn activity-return')}</div>
    <p class="activity-model-note">A simplified learning model in an original fictional world. Academic information and official sources are available in the Archive.</p>
  </section>`;
  const shell = find(container, '.activity-shell');
  const workspace = find(shell, '.activity-workspace');
  const feedback = find(shell, '.activity-feedback');
  const testButton = find(shell, '[data-action="test"]');
  const setFeedback = (message, kind = 'info') => {
    if (disposed) return;
    feedback.className = `activity-feedback activity-feedback-${kind}`;
    feedback.textContent = message;
  };
  const activity = renderers[id](workspace, { feedback: setFeedback, reducedMotion });
  const resetButton = find(shell, '[data-action="reset"]');
  const hintButton = find(shell, '[data-action="hint"]');
  const handleTest = async () => {
    if (testing || disposed) return;
    testing = true;
    testButton.disabled = true;
    resetButton.disabled = true;
    hintButton.disabled = true;
    find(shell, '.activity-completion').hidden = true;
    shell.setAttribute('aria-busy', 'true');
    testButton.textContent = id === 'commands' ? 'Pip is following commands…' : 'Testing…';
    try {
      const result = await activity.test();
      if (disposed) return;
      setFeedback(result.message, result.success ? 'success' : 'retry');
      if (result.success) {
        const completion = find(shell, '.activity-completion');
        completion.hidden = false;
        completion.innerHTML = `<span class="activity-success-icon" aria-hidden="true">✓</span><div><strong>${awarded ? 'Discovery reviewed' : 'Discovery recorded'}</strong><p>${escapeHTML(definition.subject)} helps explain this activity.</p><span>${awarded ? 'Your earlier reward remains in the journal. Replays do not add another lantern.' : escapeHTML(definition.reward)}</span></div>`;
        if (!awarded) {
          awarded = true;
          onComplete({ ...definition });
        }
      }
    } catch (error) {
      if (!disposed) setFeedback('The model could not finish this test. Reset it and try again.', 'retry');
      console.error('Activity test failed:', error);
    } finally {
      testing = false;
      if (!disposed) {
        testButton.disabled = false;
        resetButton.disabled = false;
        hintButton.disabled = false;
        shell.removeAttribute('aria-busy');
        testButton.textContent = 'Test again';
        if (document.activeElement === document.body) testButton.focus({ preventScroll: true });
      }
    }
  };
  const handleHint = () => setFeedback(activity.hint?.() || definition.hint, 'hint');
  const handleReset = () => {
    if (testing) return;
    activity.reset();
    find(shell, '.activity-completion').hidden = true;
    testButton.textContent = 'Test idea';
    setFeedback('Model reset. Change one thing and observe what happens.');
  };
  testButton.addEventListener('click', handleTest);
  find(shell, '[data-action="hint"]').addEventListener('click', handleHint);
  find(shell, '[data-action="reset"]').addEventListener('click', handleReset);
  find(shell, '[data-action="close"]').addEventListener('click', onClose);
  return () => {
    disposed = true;
    activity.dispose?.();
    shell.remove();
  };
}

function renderIntro(root) {
  const steps = {
    observe: { title: 'Observe', detail: 'The wheel is still, but water reaches the channel.', icon: '◎' },
    question: { title: 'Ask a question', detail: 'Could a blocked axle stop the wheel?', icon: '?' },
    test: { title: 'Test an idea', detail: 'Remove one obstruction and watch the wheel.', icon: '↗' },
  };
  let order;
  const render = () => {
    root.innerHTML = `<div class="activity-note"><strong>Field note</strong><p>“Water reaches the fountain. A twig rests against its axle. The wheel does not turn.”</p></div><p class="activity-instruction">Use the arrows to arrange your investigation.</p><ol class="activity-sequence">${order.map((id, index) => `<li><span class="activity-step-number">${index + 1}</span><span class="activity-step-symbol" aria-hidden="true">${steps[id].icon}</span><div><strong>${steps[id].title}</strong><p>${steps[id].detail}</p></div><div class="activity-reorder">${button('↑', `data-index="${index}" data-direction="-1" aria-label="Move ${steps[id].title} earlier" ${index === 0 ? 'disabled' : ''}`)}${button('↓', `data-index="${index}" data-direction="1" aria-label="Move ${steps[id].title} later" ${index === order.length - 1 ? 'disabled' : ''}`)}</div></li>`).join('')}</ol>`;
    all(root, '[data-direction]').forEach((control) => control.addEventListener('click', () => {
      const index = Number(control.dataset.index), target = index + Number(control.dataset.direction);
      [order[index], order[target]] = [order[target], order[index]];
      render();
      const next = find(root, `[data-index="${target}"][data-direction="${control.dataset.direction}"]:not(:disabled)`)
        || find(root, `[data-index="${target}"][data-direction]:not(:disabled)`);
      next?.focus({ preventScroll: true });
    }));
  };
  const reset = () => { order = ['test', 'observe', 'question']; render(); };
  reset();
  return {
    reset,
    test: () => order.join(',') === 'observe,question,test'
      ? { success: true, message: 'Your test frees the wheel. You used a clear observation, a focused question, and a testable idea—useful habits for university study.' }
      : { success: false, message: 'Start with the evidence before choosing an explanation. Ask a focused question before testing it.' },
  };
}

function renderBridge(root) {
  let material, supports, segments, tested = false;
  const colors = { timber: diagramPalette.gold, stone: diagramPalette.blueLight, steel: diagramPalette.blueMid };
  root.innerHTML = `<div class="activity-two-column"><div class="activity-diagram activity-bridge-diagram" aria-label="Bridge building model"></div><div class="activity-controls"><fieldset><legend>Beam material</legend>${['timber', 'stone', 'steel'].map((value) => `<label class="activity-choice"><input type="radio" name="beam-material" value="${value}" ${value === 'timber' ? 'checked' : ''}><span>${value[0].toUpperCase() + value.slice(1)}</span></label>`).join('')}</fieldset><label class="activity-field">Support columns<select data-supports><option value="0">0 — unsupported span</option><option value="1">1 — central support</option><option value="2">2 — two supports</option></select></label><p class="activity-instruction">Place the three deck sections.</p><div class="activity-segment-controls">${[0, 1, 2].map((index) => button(`Section ${index + 1}`, `data-segment="${index}" aria-pressed="false"`)).join('')}</div><p class="activity-readout" data-bridge-output></p></div></div>`;
  const update = () => {
    find(root, '.activity-bridge-diagram').innerHTML = `<svg viewBox="0 0 430 265" role="img" aria-label="${segments.filter(Boolean).length} of three bridge sections placed with ${supports} supports">
      <rect x="0" y="178" width="430" height="80" fill="${diagramPalette.blue}" rx="12"/><path d="M20 201q25-14 50 0t50 0t50 0t50 0t50 0t50 0t50 0t50 0" fill="none" stroke="${diagramPalette.bluePale}" stroke-width="3" opacity=".5"/>
      <path d="M0 152H70V242H0M360 152H430V242H360" fill="${diagramPalette.navyTint}"/>
      ${supports === 1 ? `<rect x="208" y="148" width="16" height="95" rx="3" fill="${diagramPalette.bluePale}"/>` : supports === 2 ? `<rect x="153" y="148" width="15" height="95" rx="3" fill="${diagramPalette.bluePale}"/><rect x="263" y="148" width="15" height="95" rx="3" fill="${diagramPalette.bluePale}"/>` : ''}
      ${segments.map((placed, index) => placed ? `<g><rect x="${69 + index * 97}" y="133" width="99" height="16" rx="3" fill="${colors[material]}" stroke="${diagramPalette.white}" stroke-width="2"/>${material === 'steel' ? `<path d="M${70 + index * 97} 133l24-30 24 30 24-30 25 30M${70 + index * 97} 103h97" fill="none" stroke="${colors[material]}" stroke-width="4"/>` : ''}</g>` : `<rect x="${72 + index * 97}" y="132" width="89" height="17" fill="none" stroke="${diagramPalette.white}" stroke-width="2" stroke-dasharray="5 5" opacity=".5"/>`).join('')}
      <g transform="translate(${tested && segments.every(Boolean) ? 194 : 20},${tested && (material !== 'steel' || supports !== 2) ? 112 : 111})"><rect x="0" y="0" width="35" height="20" fill="${diagramPalette.gold}" rx="4"/><rect x="6" y="-12" width="23" height="13" fill="${diagramPalette.goldLight}" rx="3"/><circle cx="8" cy="24" r="6" fill="${diagramPalette.deepNavy}"/><circle cx="29" cy="24" r="6" fill="${diagramPalette.deepNavy}"/></g>
      <text x="215" y="28" text-anchor="middle" fill="${diagramPalette.white}" font-size="14" font-family="inherit">Loaded-cart structural model</text><text x="215" y="255" text-anchor="middle" fill="${diagramPalette.bluePale}" font-size="11" font-family="inherit">Shorter supported spans bend less in this model</text>
    </svg>`;
    all(root, '[data-segment]').forEach((control) => {
      const placed = segments[Number(control.dataset.segment)];
      control.setAttribute('aria-pressed', String(placed));
      control.classList.toggle('activity-selected', placed);
    });
    find(root, '[data-bridge-output]').textContent = `${segments.filter(Boolean).length}/3 sections · ${supports} supports · ${material} beams`;
  };
  all(root, '[name="beam-material"]').forEach((control) => control.addEventListener('change', () => { material = control.value; tested = false; update(); }));
  find(root, '[data-supports]').addEventListener('change', (event) => { supports = Number(event.target.value); tested = false; update(); });
  all(root, '[data-segment]').forEach((control) => control.addEventListener('click', () => { const index = Number(control.dataset.segment); segments[index] = !segments[index]; tested = false; update(); }));
  const reset = () => {
    material = 'timber'; supports = 0; segments = [false, false, false]; tested = false;
    find(root, '[value="timber"]').checked = true; find(root, '[data-supports]').value = '0'; update();
  };
  reset();
  return {
    reset,
    test: () => {
      tested = true; update();
      if (!segments.every(Boolean)) return { success: false, message: 'The cart cannot cross a gap. Place every deck section, then test again.' };
      if (supports < 2) return { success: false, message: 'The long deck bends under the cart. Add two support columns to shorten the unsupported spans.' };
      if (material !== 'steel') return { success: false, message: material === 'stone' ? 'These stone beams crack in this simplified load test. Try the steel truss and observe how the structure changes.' : 'The timber beams flex too much for this cart. Try the steel truss, keeping your two supports.' };
      return { success: true, message: 'The cart crosses safely! Your steel truss and two supports distribute the load. The river bridge is now open in the world.' };
    },
  };
}

function renderEnergy(root) {
  let angle, connections;
  root.innerHTML = `<div class="activity-two-column"><div class="activity-diagram" data-energy-diagram></div><div class="activity-controls"><label class="activity-field">Collector facing angle <output data-angle></output><input type="range" min="0" max="90" step="1" value="75" aria-label="Solar collector facing angle above the horizon" data-angle-control></label><p class="activity-instruction">Connect the power path.</p><div class="activity-switches">${['Collector', 'Converter', 'Beacon'].map((label, index) => `<label class="activity-choice"><input type="checkbox" data-node="${index}"><span>${label} connection</span></label>`).join('')}</div><div class="activity-meter"><span>Measured potential output</span><strong data-energy-output></strong><div><i data-energy-meter></i></div></div><p class="activity-instruction">Target: at least 80% output. Sun elevation: 35°. The facing angle measures the collector’s direction above the horizon.</p></div></div>`;
  const potential = () => Math.round(Math.pow(Math.cos((angle - 35) * Math.PI / 180), 4) * 100);
  const output = () => connections.every(Boolean) ? potential() : 0;
  const update = () => {
    const level = output();
    find(root, '[data-angle]').textContent = `${angle}°`;
    find(root, '[data-energy-output]').textContent = `${level}%`;
    find(root, '[data-energy-meter]').style.width = `${level}%`;
    find(root, '[data-energy-diagram]').innerHTML = `<svg viewBox="0 0 430 265" role="img" aria-label="Collector at ${angle} degrees, ${level} percent output">
      <circle cx="341" cy="49" r="22" fill="${diagramPalette.gold}"/><g stroke="${diagramPalette.gold}" stroke-width="3"><path d="M341 14V5M341 84v9M306 49h-9M376 49h9M316 24l-7-7M366 74l7 7M316 74l-7 7M366 24l7-7"/></g><path d="M315 65L160 131M326 74L176 148M302 51L147 114" stroke="${diagramPalette.goldLight}" stroke-width="2" stroke-dasharray="6 8" opacity=".5"/>
      <path d="M20 209H410" stroke="${diagramPalette.navyTint}" stroke-width="8"/><path d="M135 190v-35m-24 35h48" stroke="${diagramPalette.blueLight}" stroke-width="6"/>
      <g transform="translate(135 153) rotate(${90 - angle})"><rect x="-52" y="-8" width="104" height="16" rx="3" fill="${diagramPalette.blue}" stroke="${diagramPalette.bluePale}" stroke-width="3"/><path d="M-34-8V8M-16-8V8M2-8V8M20-8V8M38-8V8" stroke="${diagramPalette.blueLight}" stroke-width="2"/></g>
      <path d="M135 191H240V163H336" fill="none" stroke="${level > 0 ? diagramPalette.gold : diagramPalette.blueMid}" stroke-width="5" ${level ? '' : 'stroke-dasharray="6 6"'}/><rect x="220" y="138" width="40" height="48" rx="7" fill="${diagramPalette.blue}" stroke="${diagramPalette.bluePale}" stroke-width="2"/><text x="240" y="168" text-anchor="middle" fill="${diagramPalette.goldLight}" font-size="25">ϟ</text>
      <path d="M322 200V131L337 115l15 16v69" fill="${diagramPalette.blueMid}" stroke="${diagramPalette.bluePale}" stroke-width="2"/><circle cx="337" cy="139" r="9" fill="${level >= 80 ? diagramPalette.goldLight : diagramPalette.blue}"/>
      <text x="135" y="238" fill="${diagramPalette.white}" text-anchor="middle" font-size="12">Collector</text><text x="240" y="238" fill="${diagramPalette.white}" text-anchor="middle" font-size="12">Converter</text><text x="337" y="238" fill="${diagramPalette.white}" text-anchor="middle" font-size="12">Beacon</text>
    </svg>`;
  };
  find(root, '[data-angle-control]').addEventListener('input', (event) => { angle = Number(event.target.value); update(); });
  all(root, '[data-node]').forEach((control) => control.addEventListener('change', () => { connections[Number(control.dataset.node)] = control.checked; update(); }));
  const reset = () => { angle = 75; connections = [false, false, false]; find(root, '[data-angle-control]').value = '75'; all(root, '[data-node]').forEach((node) => { node.checked = false; }); update(); };
  reset();
  return {
    reset,
    test: () => {
      if (!connections.every(Boolean)) return { success: false, message: 'The power path is interrupted. All three connections must be active before energy reaches the beacon.' };
      if (output() < 80) return { success: false, message: `The beacon receives ${output()}%. Adjust the collector closer to the sun’s 35° elevation and measure again.` };
      return { success: true, message: `${output()}% power delivered! Orientation and a complete system both matter. The workshop lights now have power.` };
    },
  };
}

function renderCommands(root, { feedback, reducedMotion }) {
  const labels = { forward: 'Move', left: 'Turn left', right: 'Turn right' };
  const symbols = { forward: '↑', left: '↶', right: '↷' };
  const walls = [[1, 3], [2, 1]];
  const vectors = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  let sequence, position, direction, trail, running = false, disposed = false, pendingResolve;
  let timer;
  root.innerHTML = `<div class="activity-two-column"><div><div class="activity-robot-grid" role="img" aria-label="Pip’s four by four programming board" data-grid></div><p class="activity-instruction">Start: lower left, facing north ↑. Goal: upper right.</p></div><div><div class="activity-command-bank">${Object.keys(labels).map((key) => button(`${symbols[key]} ${labels[key]}`, `data-add="${key}"`)).join('')}</div><ol class="activity-command-list" data-sequence aria-label="Command sequence"></ol><p class="activity-instruction">Reorder with ↑ and ↓. Remove with ×. Maximum 14 commands.</p></div></div>`;
  const drawGrid = () => {
    find(root, '[data-grid]').innerHTML = Array.from({ length: 16 }, (_, index) => {
      const x = index % 4, y = Math.floor(index / 4);
      const blocked = walls.some(([wx, wy]) => wx === x && wy === y);
      const robot = position[0] === x && position[1] === y;
      const goal = x === 3 && y === 0;
      const visited = trail.some(([tx, ty]) => tx === x && ty === y);
      return `<span class="activity-grid-cell ${blocked ? 'activity-grid-wall' : ''} ${goal ? 'activity-grid-goal' : ''} ${visited ? 'activity-grid-trail' : ''}">${robot ? `<span class="activity-robot" aria-label="Pip faces ${['north', 'east', 'south', 'west'][direction]}" style="transform:rotate(${direction * 90}deg)">↑</span>` : blocked ? '▰' : goal ? '✦' : visited ? '·' : ''}</span>`;
    }).join('');
  };
  const renderSequence = (current = -1) => {
    all(root, '[data-add]').forEach(control => { control.disabled = running; });
    find(root, '[data-sequence]').innerHTML = sequence.map((command, index) => `<li class="${current === index ? 'activity-command-active' : ''}"><span>${index + 1}</span><strong>${symbols[command]} ${labels[command]}</strong><div>${button('↑', `data-index="${index}" data-shift="-1" aria-label="Move command ${index + 1} earlier" ${index === 0 || running ? 'disabled' : ''}`)}${button('↓', `data-index="${index}" data-shift="1" aria-label="Move command ${index + 1} later" ${index === sequence.length - 1 || running ? 'disabled' : ''}`)}${button('×', `data-remove="${index}" aria-label="Remove command ${index + 1}" ${running ? 'disabled' : ''}`)}</div></li>`).join('');
    all(root, '[data-shift]').forEach((control) => control.addEventListener('click', () => {
      if (running) return;
      const index = Number(control.dataset.index), target = index + Number(control.dataset.shift);
      [sequence[index], sequence[target]] = [sequence[target], sequence[index]];
      renderSequence();
      const next = find(root, `[data-index="${target}"][data-shift="${control.dataset.shift}"]:not(:disabled)`)
        || find(root, `[data-remove="${target}"]`);
      next?.focus({ preventScroll: true });
    }));
    all(root, '[data-remove]').forEach((control) => control.addEventListener('click', () => {
      if (running) return;
      const index = Number(control.dataset.remove);
      sequence.splice(index, 1); renderSequence();
      const next = find(root, `[data-remove="${Math.min(index,sequence.length-1)}"]`) || find(root, '[data-add="forward"]');
      next?.focus({ preventScroll: true });
    }));
  };
  all(root, '[data-add]').forEach((control) => control.addEventListener('click', () => {
    if (running) return;
    if (sequence.length >= 14) { feedback('The command buffer holds 14 steps. Remove a step before adding another.', 'hint'); return; }
    sequence.push(control.dataset.add); renderSequence();
  }));
  const startPosition = () => { position = [0, 3]; direction = 0; trail = [[0, 3]]; drawGrid(); };
  const reset = () => { sequence = ['forward', 'forward', 'right', 'forward', 'forward', 'forward', 'forward']; startPosition(); renderSequence(); };
  reset();
  return {
    reset,
    dispose: () => { disposed = true; clearTimeout(timer); pendingResolve?.({ success: false, message: '' }); },
    test: () => new Promise((resolve) => {
      pendingResolve = resolve; running = true; startPosition(); let index = 0;
      const finish = (result) => { running = false; pendingResolve = undefined; if (!disposed) renderSequence(); resolve(result); };
      const step = () => {
        if (disposed) return;
        if (index >= sequence.length) {
          const success = position[0] === 3 && position[1] === 0;
          finish({ success, message: success ? 'Pip reaches the network terminal! Testing a sequence reveals errors, and reordering its steps fixes the algorithm.' : 'Pip finished the commands but missed the glowing tile. Follow the clear left edge to the top row, then travel east.' }); return;
        }
        const command = sequence[index]; renderSequence(index);
        if (command === 'left') direction = (direction + 3) % 4;
        else if (command === 'right') direction = (direction + 1) % 4;
        else {
          const next = [position[0] + vectors[direction][0], position[1] + vectors[direction][1]];
          if (next.some((value) => value < 0 || value > 3) || walls.some(([x, y]) => next[0] === x && next[1] === y)) {
            finish({ success: false, message: `Command ${index + 1} hits a wall. Pip stopped safely. Change the sequence at that step and test again.` }); return;
          }
          position = next; trail.push([...position]);
        }
        drawGrid(); index++; timer = setTimeout(step, reducedMotion ? 0 : 260);
      };
      timer = setTimeout(step, reducedMotion ? 0 : 180);
    }),
  };
}

function renderMarket(root) {
  let budget;
  const items = [{ key: 'inventory', label: 'Supplies', need: 30, icon: '▦' }, { key: 'team', label: 'Team', need: 20, icon: '♧' }, { key: 'sign', label: 'Sign', need: 10, icon: '⚑' }];
  root.innerHTML = `<div class="activity-note"><strong>Demand board · 60 coins available</strong><p>Six customers need 30 coins of supplies. Two assistants need 20 coins. A clear market sign costs 10 coins.</p></div><div class="activity-budget-controls">${items.map((item) => `<label class="activity-budget-row"><span class="activity-budget-icon" aria-hidden="true">${item.icon}</span><span><strong>${item.label}</strong><small>Need: ${item.need} coins</small></span><input type="range" min="0" max="60" step="1" data-budget="${item.key}" aria-label="${item.label} budget"><output data-budget-output="${item.key}"></output></label>`).join('')}</div><div class="activity-budget-summary"><span>Allocated <strong data-total></strong></span><span>Remaining <strong data-remaining></strong></span></div><div class="activity-allocation-bar" aria-hidden="true">${items.map((item) => `<span data-budget-bar="${item.key}"></span>`).join('')}</div><p class="activity-readout" data-market-status></p>`;
  const update = () => {
    const total = Object.values(budget).reduce((sum, value) => sum + value, 0);
    items.forEach((item) => {
      find(root, `[data-budget-output="${item.key}"]`).textContent = `${budget[item.key]}`;
      find(root, `[data-budget-bar="${item.key}"]`).style.width = `${budget[item.key] / Math.max(60, total) * 100}%`;
    });
    find(root, '[data-total]').textContent = `${total} / 60`;
    find(root, '[data-remaining]').textContent = `${60 - total} coins`;
    find(root, '[data-remaining]').classList.toggle('activity-over-budget', total > 60);
    const unmet = items.filter((item) => budget[item.key] < item.need).map((item) => item.label.toLowerCase());
    find(root, '[data-market-status]').textContent = total > 60 ? 'The stall cannot spend more than it owns.' : unmet.length ? `Still needed: ${unmet.join(', ')}.` : 'The stall has what it needs for market day.';
  };
  all(root, '[data-budget]').forEach((control) => control.addEventListener('input', () => { budget[control.dataset.budget] = Number(control.value); update(); }));
  const reset = () => { budget = { inventory: 20, team: 20, sign: 20 }; all(root, '[data-budget]').forEach((control) => { control.value = String(budget[control.dataset.budget]); }); update(); };
  reset();
  return {
    reset,
    test: () => {
      const total = Object.values(budget).reduce((sum, value) => sum + value, 0);
      if (total > 60) return { success: false, message: `Your plan spends ${total} coins, ${total - 60} more than the budget. Reduce one allocation and test again.` };
      const missing = items.find((item) => budget[item.key] < item.need);
      if (missing) return { success: false, message: `${missing.label} needs ${missing.need} coins to meet the day’s demand. Rebalance the budget while keeping the total at 60 or below.` };
      return { success: true, message: 'Market day runs smoothly: supplies, teamwork, and communication are all funded. You used a limited budget to meet competing needs.' };
    },
  };
}

function renderStory(root) {
  let evidence, conclusion;
  const cards = [
    { id: 'repair', label: 'Dated repair note', text: 'After last night’s storm, the mechanic found a bent axle and fresh impact marks.' },
    { id: 'log', label: 'Signed attendance log', text: 'The keeper signed the mill log this morning and reported the wheel was stuck.' },
    { id: 'rumor', label: 'Market rumor', text: 'A trader repeats that someone heard the keeper had left town.' },
  ];
  root.innerHTML = `<div class="activity-report-pair"><article><span>The Willow Gazette</span><h4>Storm stops the mill</h4><p>“The waterwheel stopped after the storm damaged its axle.”</p></article><article><span>The Harbor Herald</span><h4>Keeper abandons mill?</h4><p>“A market rumor says the absent keeper caused the stoppage.”</p></article></div><fieldset><legend>Select the evidence supporting your explanation</legend><div class="activity-evidence-cards">${cards.map((card) => `<label class="activity-evidence-card"><input type="checkbox" value="${card.id}" data-evidence><span><strong>${card.label}</strong><small>${card.text}</small></span></label>`).join('')}</div></fieldset><label class="activity-field">Your supported explanation<select data-conclusion><option value="">Choose an explanation…</option><option value="storm">Storm damage stopped the wheel</option><option value="absent">The keeper left town</option><option value="both">Both reports are equally supported</option></select></label>`;
  all(root, '[data-evidence]').forEach((control) => control.addEventListener('change', () => { if (control.checked) evidence.add(control.value); else evidence.delete(control.value); }));
  find(root, '[data-conclusion]').addEventListener('change', (event) => { conclusion = event.target.value; });
  const reset = () => { evidence = new Set(); conclusion = ''; all(root, '[data-evidence]').forEach((control) => { control.checked = false; }); find(root, '[data-conclusion]').value = ''; };
  reset();
  return {
    reset,
    test: () => {
      if (!conclusion) return { success: false, message: 'Choose an explanation and select the records that support it.' };
      if (evidence.has('rumor')) return { success: false, message: 'The rumor repeats an unnamed source. Remove it from your supporting evidence and compare the dated records.' };
      if (!evidence.has('repair') || !evidence.has('log')) return { success: false, message: 'One record shows physical damage; another checks whether the keeper was present. Use both to compare the competing claims.' };
      if (conclusion !== 'storm') return { success: false, message: 'The repair note describes storm damage, while the signed log places the keeper at the mill. Which explanation fits both records?' };
      return { success: true, message: 'Your corrected report follows the evidence. Comparing independent records helps readers separate a supported claim from a repeated rumor.' };
    },
  };
}

function renderSamples(root, { feedback }) {
  const counts = { A: 2, B: 5, C: 3 };
  const points = [[92, 83], [165, 57], [226, 97], [135, 136], [207, 160], [78, 180], [164, 208], [247, 212]];
  let current, magnification, recorded, selected;
  root.innerHTML = `<div class="activity-note"><strong>Simulated specimens</strong><p>These invented samples have no diagnostic meaning. Count the bright diamond markers; compare observations without assigning a disease.</p></div><div class="activity-two-column"><div class="activity-microscope" data-scope></div><div class="activity-controls"><fieldset><legend>Sample on the microscope</legend><div class="activity-inline-options">${['A', 'B', 'C'].map((id) => button(`Sample ${id}`, `data-sample="${id}" aria-pressed="false"`)).join('')}</div></fieldset><label class="activity-field">Magnification <output data-magnification></output><input type="range" min="1" max="4" step="1" value="1" data-focus aria-label="Microscope magnification"></label>${button('Record observation', 'data-record') }<div class="activity-observation-log" data-log></div><label class="activity-field">Most bright markers<select data-answer><option value="">Compare your records…</option><option value="A">Sample A</option><option value="B">Sample B</option><option value="C">Sample C</option></select></label></div></div>`;
  const update = () => {
    find(root, '[data-magnification]').textContent = `${magnification}×`;
    all(root, '[data-sample]').forEach((control) => { const active = control.dataset.sample === current; control.classList.toggle('activity-selected', active); control.setAttribute('aria-pressed', String(active)); });
    find(root, '[data-scope]').innerHTML = `<svg viewBox="0 0 320 295" role="img" aria-label="Simulated sample ${current} at ${magnification} times magnification${magnification >= 3 ? ` with ${counts[current]} bright diamond markers` : ', more magnification is needed to distinguish markers'}"><circle cx="160" cy="145" r="128" fill="${diagramPalette.navy}" stroke="${diagramPalette.blueLight}" stroke-width="7"/>${points.map(([x, y], index) => `<g transform="translate(${x},${y})"><circle r="${magnification >= 3 ? 22 : 16}" fill="${index < counts[current] ? diagramPalette.blue : diagramPalette.navyTint}" stroke="${diagramPalette.bluePale}" stroke-width="1" opacity=".85"/>${magnification >= 3 && index < counts[current] ? `<path d="M0-11L8 0 0 11-8 0Z" fill="${diagramPalette.goldLight}"/>` : `<circle r="5" fill="${diagramPalette.blueLight}" opacity="${magnification >= 3 ? '.8' : '.4'}"/>`}</g>`).join('')}<text x="160" y="288" text-anchor="middle" fill="${diagramPalette.bluePale}" font-size="13">Sample ${current} · ${magnification}×</text></svg>`;
    find(root, '[data-log]').innerHTML = `<strong>Observation notebook</strong>${['A', 'B', 'C'].map((id) => `<span>Sample ${id}<b>${recorded[id] ?? '—'}${recorded[id] !== undefined ? ' markers' : ''}</b></span>`).join('')}`;
  };
  all(root, '[data-sample]').forEach((control) => control.addEventListener('click', () => { current = control.dataset.sample; update(); }));
  find(root, '[data-focus]').addEventListener('input', (event) => { magnification = Number(event.target.value); update(); });
  find(root, '[data-record]').addEventListener('click', () => {
    if (magnification < 3) { feedback('The marker shapes are not clear yet. Increase magnification to at least 3× before recording.', 'hint'); return; }
    recorded[current] = counts[current]; update(); feedback(`Recorded sample ${current}: ${counts[current]} bright markers. Compare this with the other samples.`);
  });
  find(root, '[data-answer]').addEventListener('change', (event) => { selected = event.target.value; });
  const reset = () => { current = 'A'; magnification = 1; recorded = {}; selected = ''; find(root, '[data-focus]').value = '1'; find(root, '[data-answer]').value = ''; update(); };
  reset();
  return {
    reset,
    test: () => {
      if (Object.keys(recorded).length !== 3) return { success: false, message: 'Record all three samples at 3× magnification or higher. A comparison needs observations from each sample.' };
      if (selected !== 'B') return { success: false, message: 'Compare the notebook counts: A has 2, B has 5, and C has 3 bright markers. Select the largest observed count.' };
      return { success: true, message: 'Sample B has the most bright markers. You used a consistent observation method and recorded evidence before comparing the samples.' };
    },
  };
}

function renderCouncil(root) {
  let share, plan;
  root.innerHTML = `<div class="activity-note"><strong>The council’s constraints</strong><p>Upstream needs 40 water units for crops. Downstream needs 40 for its gardens. There are 100 units available; both communities ask to help manage the river.</p></div><div class="activity-village-pair"><article><span aria-hidden="true">♧</span><strong>Upstream</strong><output data-upstream></output><p data-upstream-status></p></article><article><span aria-hidden="true">⚘</span><strong>Downstream</strong><output data-downstream></output><p data-downstream-status></p></article></div><label class="activity-field">Water allocated upstream<input type="range" min="0" max="100" step="1" data-share aria-label="Upstream water allocation"><span class="activity-range-labels"><span>All downstream</span><span>All upstream</span></span></label><label class="activity-field">Management agreement<select data-plan><option value="">Choose a management plan…</option><option value="joint">Joint reservoir · shared maintenance and records</option><option value="private">Upstream control · private gates</option><option value="downstream">Downstream control · private gates</option></select></label><p class="activity-readout" data-cooperation></p>`;
  const update = () => {
    find(root, '[data-upstream]').textContent = `${share} units`;
    find(root, '[data-downstream]').textContent = `${100 - share} units`;
    find(root, '[data-upstream-status]').textContent = share >= 40 ? 'Crop needs met' : 'Crops lack water';
    find(root, '[data-downstream-status]').textContent = 100 - share >= 40 ? 'Garden needs met' : 'Gardens lack water';
    find(root, '[data-cooperation]').textContent = plan === 'joint' ? 'Both villages can inspect the records and maintain the reservoir.' : plan ? 'One village controls the gates; the other asks for a voice in decisions.' : 'A management agreement is still needed.';
  };
  find(root, '[data-share]').addEventListener('input', (event) => { share = Number(event.target.value); update(); });
  find(root, '[data-plan]').addEventListener('change', (event) => { plan = event.target.value; update(); });
  const reset = () => { share = 80; plan = ''; find(root, '[data-share]').value = '80'; find(root, '[data-plan]').value = ''; update(); };
  reset();
  return {
    reset,
    test: () => {
      if (share < 40 || share > 60) return { success: false, message: 'At least one village cannot meet its 40-unit need. Move the water share between 40 and 60 and observe both communities.' };
      if (plan !== 'joint') return { success: false, message: 'Both communities have water, but one still lacks a say. A jointly managed reservoir gives both a role in the agreement.' };
      return { success: true, message: `Agreement reached: ${share} units upstream and ${100 - share} downstream, with shared maintenance. The villages now cooperate in the world.` };
    },
  };
}

function renderLight(root) {
  let angles;
  const mirrorA = [125, 175], mirrorB = [235, 75], target = [340, 135];
  const radians = (angle) => angle * Math.PI / 180;
  const hit = (origin, destination, angle, radius) => {
    const direction = [Math.cos(radians(angle)), Math.sin(radians(angle))];
    const vector = [destination[0] - origin[0], destination[1] - origin[1]];
    return vector[0] * direction[0] + vector[1] * direction[1] > 0 && Math.abs(vector[0] * direction[1] - vector[1] * direction[0]) <= radius;
  };
  const ray = (origin, angle) => [origin[0] + Math.cos(radians(angle)) * 460, origin[1] + Math.sin(radians(angle)) * 460];
  const model = () => {
    const firstAngle = 2 * angles[0], secondAngle = 2 * angles[1] - firstAngle;
    const firstHit = hit(mirrorA, mirrorB, firstAngle, 12);
    const targetHit = firstHit && hit(mirrorB, target, secondAngle, 16);
    return { firstAngle, secondAngle, firstHit, targetHit };
  };
  root.innerHTML = `<div class="activity-diagram activity-light-diagram" data-light-diagram></div><div class="activity-mirror-controls">${['A', 'B'].map((id, index) => `<label class="activity-field">Mirror ${id} angle <output data-mirror-output="${index}"></output><input type="range" min="-60" max="60" step="1" data-mirror="${index}" aria-label="Mirror ${id} angle in degrees"></label>`).join('')}</div><p class="activity-readout" data-ray-status></p>`;
  const update = () => {
    const { firstAngle, secondAngle, firstHit, targetHit } = model();
    const firstEnd = firstHit ? mirrorB : ray(mirrorA, firstAngle), secondEnd = targetHit ? target : ray(mirrorB, secondAngle);
    all(root, '[data-mirror-output]').forEach((output) => { output.textContent = `${angles[Number(output.dataset.mirrorOutput)]}°`; });
    find(root, '[data-light-diagram]').innerHTML = `<svg viewBox="0 0 400 250" role="img" aria-label="Light beam ${targetHit ? 'reaches the star receiver' : firstHit ? 'reaches mirror B but misses the receiver' : 'misses mirror B'}">
      <path d="M125 175L235 75 340 135" fill="none" stroke="${diagramPalette.blueLight}" stroke-width="1" stroke-dasharray="4 7" opacity=".6"/>
      <path d="M25 175H125L${firstEnd[0].toFixed(1)} ${firstEnd[1].toFixed(1)}${firstHit ? `M235 75L${secondEnd[0].toFixed(1)} ${secondEnd[1].toFixed(1)}` : ''}" fill="none" stroke="${diagramPalette.goldLight}" stroke-width="4" stroke-linecap="round"/>
      <rect x="13" y="159" width="28" height="32" rx="5" fill="${diagramPalette.blue}" stroke="${diagramPalette.bluePale}" stroke-width="2"/>
      ${[mirrorA, mirrorB].map(([x, y], index) => `<g transform="translate(${x} ${y})"><circle r="24" fill="${diagramPalette.navy}" stroke="${diagramPalette.blueMid}"/><g transform="rotate(${angles[index]})"><path d="M-22 0H22" stroke="${diagramPalette.bluePale}" stroke-width="7" stroke-linecap="round"/><path d="M-22 5H22" stroke="${diagramPalette.blueMid}" stroke-width="3"/></g><text x="0" y="42" text-anchor="middle" fill="${diagramPalette.white}" font-size="14">${index === 0 ? 'A' : 'B'}</text></g>`).join('')}
      <circle cx="340" cy="135" r="22" fill="${targetHit ? diagramPalette.goldDark : diagramPalette.navyTint}" stroke="${targetHit ? diagramPalette.goldLight : diagramPalette.blueLight}" stroke-width="2"/><text x="340" y="146" text-anchor="middle" fill="${targetHit ? diagramPalette.white : diagramPalette.blueLight}" font-size="32">✦</text>
      <text x="30" y="221" fill="${diagramPalette.white}" font-size="12">Source</text><text x="340" y="193" text-anchor="middle" fill="${diagramPalette.white}" font-size="12">Star receiver</text><text x="200" y="26" text-anchor="middle" fill="${diagramPalette.white}" font-size="13">Observe the reflected ray</text>
    </svg>`;
    find(root, '[data-ray-status]').textContent = targetHit ? 'Receiver illuminated. Test your alignment.' : firstHit ? 'Mirror B catches the ray. Now aim it toward the receiver.' : 'Mirror A sends the ray past mirror B. Follow the diagonal guide.';
  };
  all(root, '[data-mirror]').forEach((control) => control.addEventListener('input', () => { angles[Number(control.dataset.mirror)] = Number(control.value); update(); }));
  const reset = () => { angles = [5, -35]; all(root, '[data-mirror]').forEach((control) => { control.value = String(angles[Number(control.dataset.mirror)]); }); update(); };
  reset();
  return {
    reset,
    test: () => {
      const { firstHit, targetHit } = model();
      if (!firstHit) return { success: false, message: 'The first reflected ray misses mirror B. Rotate mirror A toward the diagonal guide and watch the beam move.' };
      if (!targetHit) return { success: false, message: 'Mirror B receives light, but the receiver stays dark. Adjust mirror B while keeping mirror A aligned.' };
      return { success: true, message: 'The observatory receiver lights up! You used angles, measurement, and reflection to guide light through a system.' };
    },
  };
}

function renderTooth(root) {
  const parts = { enamel: 'Enamel', dentin: 'Dentin', pulp: 'Pulp', root: 'Root' };
  const slots = [{ key: 'enamel', label: 'Outer crown', x: 258, y: 54 }, { key: 'dentin', label: 'Middle layer', x: 271, y: 111 }, { key: 'pulp', label: 'Inner chamber', x: 273, y: 165 }, { key: 'root', label: 'Below the gum', x: 267, y: 222 }];
  let selected, assigned;
  root.innerHTML = `<p class="activity-instruction">Choose a part, then choose its numbered region. You can change any placement before testing.</p><div class="activity-part-bank">${Object.entries(parts).map(([key, label]) => button(label, `data-part="${key}" aria-pressed="false"`)).join('')}</div><div class="activity-two-column"><div class="activity-diagram activity-tooth-diagram" data-tooth-model></div><div class="activity-tooth-slots">${slots.map((slot, index) => `<button type="button" class="activity-tooth-slot" data-slot="${slot.key}" aria-label="Place selected part in ${slot.label}"><span>${index + 1}</span><div><strong>${slot.label}</strong><small data-slot-label="${slot.key}">Select a part to place</small></div></button>`).join('')}</div></div><div class="activity-note"><strong>Teaching model</strong><p>The model represents basic structures for education. It does not represent a clinical assessment.</p></div>`;
  const update = () => {
    all(root, '[data-part]').forEach((control) => { const active = control.dataset.part === selected; control.classList.toggle('activity-selected', active); control.setAttribute('aria-pressed', String(active)); });
    slots.forEach((slot) => { find(root, `[data-slot-label="${slot.key}"]`).textContent = assigned[slot.key] ? parts[assigned[slot.key]] : 'Select a part to place'; find(root, `[data-slot="${slot.key}"]`).classList.toggle('activity-slot-filled', Boolean(assigned[slot.key])); });
    find(root, '[data-tooth-model]').innerHTML = `<svg viewBox="0 0 350 275" role="img" aria-label="Four-region tooth teaching model"><path d="M77 29Q107 6 133 26Q160 9 187 27Q220 7 237 37Q252 68 229 116L212 231Q207 254 193 234L163 167 139 237Q127 257 118 230L99 125Q60 67 77 29Z" fill="${diagramPalette.white}" stroke="${diagramPalette.blueLight}" stroke-width="3"/><path d="M92 44Q111 25 135 44Q165 25 187 45Q217 27 223 53Q232 77 212 116L199 203 167 140 137 207 116 118Q80 72 92 44Z" fill="${diagramPalette.goldLight}" stroke="${diagramPalette.gold}" stroke-width="2"/><path d="M125 62Q142 52 157 62Q176 50 193 65L181 112 167 132 150 116Z" fill="${diagramPalette.blueMid}" stroke="${diagramPalette.navyTint}" stroke-width="2"/><path d="M152 112L139 177M174 112L196 174" stroke="${diagramPalette.blueMid}" stroke-width="8" stroke-linecap="round"/><path d="M61 127H112M217 127H260" stroke="${diagramPalette.blueLight}" stroke-width="8" stroke-linecap="round"/>${slots.map((slot, index) => `<path d="M${index === 0 ? 218 : index === 1 ? 204 : index === 2 ? 165 : 199} ${index === 0 ? 41 : index === 1 ? 85 : index === 2 ? 91 : 195}L${slot.x} ${slot.y}" fill="none" stroke="${diagramPalette.bluePale}" stroke-width="1.5"/><circle cx="${slot.x}" cy="${slot.y}" r="13" fill="${assigned[slot.key] ? diagramPalette.gold : diagramPalette.blue}" stroke="${diagramPalette.bluePale}"/><text x="${slot.x}" y="${slot.y + 5}" text-anchor="middle" fill="${assigned[slot.key] ? diagramPalette.navy : diagramPalette.white}" font-size="13">${index + 1}</text>`).join('')}</svg>`;
  };
  all(root, '[data-part]').forEach((control) => control.addEventListener('click', () => { selected = control.dataset.part; update(); }));
  all(root, '[data-slot]').forEach((control) => control.addEventListener('click', () => {
    if (!selected) return;
    Object.keys(assigned).forEach((key) => { if (assigned[key] === selected) delete assigned[key]; });
    assigned[control.dataset.slot] = selected; selected = ''; update();
  }));
  const reset = () => { selected = ''; assigned = {}; update(); };
  reset();
  return {
    reset,
    test: () => {
      const count = slots.filter((slot) => assigned[slot.key] === slot.key).length;
      if (count !== 4) return { success: false, message: `${count} of 4 structures are correctly placed. Enamel covers the crown; dentin supports it; pulp fills the inner chamber; the root extends below the gum.` };
      return { success: true, message: 'Teaching model assembled! Linking a structure to its location is a first step toward explaining how tooth anatomy supports function.' };
    },
  };
}

function renderIngredients(root) {
  const ingredients = [
    { id: 'dew', name: 'Clear dew', clue: 'Flows freely and carries other ingredients.', category: 'carrier', icon: '◒' },
    { id: 'petal', name: 'Moonpetal', clue: 'Adds a violet glow when scattered in clear dew.', category: 'colorant', icon: '✿' },
    { id: 'silk', name: 'Moss-silk', clue: 'Helps the mixture cling evenly to lantern paper.', category: 'binder', icon: '≈' },
  ];
  const categories = ['carrier', 'colorant', 'binder'];
  let classifications, portions;
  root.innerHTML = `<div class="activity-fictional-banner"><strong>Entirely fictional ingredients and lantern ink</strong><span>This is a fantasy formulation puzzle. It provides no medicines, recipes for real substances, or health guidance.</span></div><div class="activity-ingredient-cards">${ingredients.map((item) => `<label class="activity-ingredient-card"><span class="activity-ingredient-symbol" aria-hidden="true">${item.icon}</span><strong>${item.name}</strong><small>${item.clue}</small><select data-ingredient="${item.id}" aria-label="Classify ${item.name}"><option value="">Choose a role…</option>${categories.map((category) => `<option value="${category}">${category[0].toUpperCase() + category.slice(1)}</option>`).join('')}</select></label>`).join('')}</div><div class="activity-note"><strong>Lantern-ink recipe</strong><p>2 portions carrier + 1 portion colorant + 1 portion binder. Test one change at a time and observe its effect.</p></div><div class="activity-two-column"><div class="activity-diagram activity-formula-diagram" data-formula></div><div class="activity-controls">${categories.map((category) => `<div class="activity-portion-row"><strong>${category[0].toUpperCase() + category.slice(1)}</strong><div>${button('−', `data-portion="${category}" data-change="-1" aria-label="Remove one portion of ${category}"`)}<output data-portion-output="${category}"></output>${button('+', `data-portion="${category}" data-change="1" aria-label="Add one portion of ${category}"`)}</div></div>`).join('')}<p class="activity-readout" data-formula-status></p></div></div>`;
  const update = () => {
    categories.forEach((category) => { find(root, `[data-portion-output="${category}"]`).textContent = String(portions[category]); });
    const correctRatio = portions.carrier === 2 && portions.colorant === 1 && portions.binder === 1;
    const liquidHeight = clamp((portions.carrier + portions.colorant + portions.binder) * 20, 0, 130);
    const color = portions.colorant ? diagramPalette.colorant : diagramPalette.blueLight;
    find(root, '[data-formula]').innerHTML = `<svg viewBox="0 0 310 245" role="img" aria-label="Fictional formulation: ${portions.carrier} carrier, ${portions.colorant} colorant, ${portions.binder} binder portions"><path d="M93 38V174Q93 208 155 208T217 174V38" fill="none" stroke="${diagramPalette.bluePale}" stroke-width="5"/><path d="M95 ${203 - liquidHeight}H215V174Q215 205 155 205T95 174Z" fill="${color}" opacity=".75"/>${Array.from({ length: Math.min(12, portions.colorant * 3) }, (_, index) => `<circle cx="${113 + (index * 23 % 86)}" cy="${Math.max(203 - liquidHeight + 10, 200 - index * 9)}" r="${correctRatio ? 3 : 6}" fill="${diagramPalette.goldLight}" opacity=".8"/>`).join('')}<path d="M110 76h14M110 101h14M110 126h14M110 151h14" stroke="${diagramPalette.bluePale}" stroke-width="2"/><text x="155" y="24" text-anchor="middle" fill="${diagramPalette.white}" font-size="13">Fictional lantern ink</text><text x="155" y="234" text-anchor="middle" fill="${diagramPalette.white}" font-size="12">${correctRatio ? 'Even glow · stable coating' : 'Change portions and observe'}</text></svg>`;
    find(root, '[data-formula-status]').textContent = correctRatio ? 'The recipe gives an even fictional glow.' : portions.carrier === 0 ? 'No carrier: the ingredients cannot spread.' : portions.binder > 1 ? 'Too much binder: the coating clumps in this model.' : portions.colorant > 1 ? 'Too much colorant: bright particles collect unevenly.' : 'Compare your portions with the lantern-ink recipe.';
  };
  all(root, '[data-ingredient]').forEach((control) => control.addEventListener('change', () => { classifications[control.dataset.ingredient] = control.value; }));
  all(root, '[data-portion]').forEach((control) => control.addEventListener('click', () => { const category = control.dataset.portion; portions[category] = clamp(portions[category] + Number(control.dataset.change), 0, 4); update(); }));
  const reset = () => { classifications = {}; portions = { carrier: 1, colorant: 2, binder: 0 }; all(root, '[data-ingredient]').forEach((control) => { control.value = ''; }); update(); };
  reset();
  return {
    reset,
    test: () => {
      const wrong = ingredients.find((item) => classifications[item.id] !== item.category);
      if (wrong) return { success: false, message: `Check the role of ${wrong.name}. Its observation clue tells you whether it carries the mixture, adds color, or binds the coating.` };
      if (portions.carrier !== 2 || portions.colorant !== 1 || portions.binder !== 1) return { success: false, message: 'The roles are correct, but the proportions differ from the fictional recipe. Try 2 carrier, 1 colorant, and 1 binder, then observe the coating.' };
      return { success: true, message: 'The lantern ink spreads with an even glow! Classifying ingredients, changing proportions, and observing results are foundations of formulation experiments. Every ingredient here is imaginary.' };
    },
  };
}

const renderers = {
  intro: renderIntro, bridge: renderBridge, energy: renderEnergy,
  commands: renderCommands, market: renderMarket, story: renderStory,
  samples: renderSamples, council: renderCouncil, light: renderLight,
  tooth: renderTooth, ingredients: renderIngredients,
};
