import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const url = process.env.GAME_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
const checks = [], failures = [], errors = [], screenshots = [];
const officialNames = [
  'Academic Preparatory Program',
  'Department of Engineering',
  'Department of Computing and Informatics',
  'Department of Business Administration',
  'Department of English',
  'Department of Medical & Health Sciences',
  'Department of Social Sciences and Law',
  'Department of Mathematics and Natural Sciences',
  'College of Dentistry',
  'College of Pharmacy',
];

async function check(name, action) {
  try { await action(); checks.push(name); console.log('PASS', name); }
  catch (error) { failures.push({ name, error: error.message }); console.log('FAIL', name, error.message); }
}
async function start(context) {
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__AUIS_GAME__?.world);
  if (await page.locator('#begin').isVisible()) await page.locator('#begin').click();
  return page;
}
const close = page => page.evaluate(() => window.__AUIS_GAME__.closeModal());
const state = page => page.evaluate(() => window.__AUIS_GAME__.state);
const position = page => page.evaluate(() => window.__AUIS_GAME__.world.getPosition());
const range = (page, selector, value) => page.locator(selector).evaluate((node, value) => { node.value = String(value); node.dispatchEvent(new Event('input', { bubbles: true })); }, value);
async function capture(page, name) {
  const path = `public/screenshots/${name}`;
  await page.screenshot({ path }); screenshots.push(path);
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    const NativeAudio = window.AudioContext;
    window.AudioContext = class extends NativeAudio {
      constructor(...args) { super(...args); window.__auditAudio = this; window.__auditOutputConnections = 0; window.__auditVoiceCount = 0; }
      async resume() { await super.resume(); if (window.__auditDelayResume) await new Promise(resolve => setTimeout(resolve, 150)); }
      createOscillator() { window.__auditVoiceCount++; return super.createOscillator(); }
      createGain() {
        const gain = super.createGain(), connect = gain.connect.bind(gain);
        gain.connect = (node, ...args) => {
          if (node instanceof AudioDestinationNode) { window.__auditOutputConnections++; window.__auditMasterGain = gain; }
          return connect(node, ...args);
        };
        return gain;
      }
    };
  });
  const page = await start(context);

  await check('Exact official academic names in HUD, map and archive', async () => {
    assert.equal(await page.locator('#region-title').innerText(), officialNames[0]);
    await page.locator('[data-menu="map"]').click();
    const names = await page.locator('[data-region]').evaluateAll(nodes => nodes.map(node => node.children[1].textContent));
    assert.deepEqual(names, officialNames);
    await close(page);
    await page.locator('[data-menu="archive"]').click();
    for (const name of officialNames) assert.ok((await page.locator('.archive-nav').innerText()).includes(name), name);
    await close(page);
  });
  await check('Dialog restores opener focus and keeps keyboard focus inside', async () => {
    await page.locator('[data-menu="journal"]').first().click();
    assert.equal(await page.evaluate(() => document.querySelector('#game').inert), true);
    await page.keyboard.press('Shift+Tab');
    assert.ok(await page.evaluate(() => !!document.activeElement.closest('.modal')));
    const before = await position(page);
    await page.keyboard.down('w'); await page.waitForTimeout(200); await page.keyboard.up('w');
    assert.deepEqual(await position(page), before);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.menu), 'journal');
    await page.keyboard.press('Space');
    assert.ok(await page.getByRole('dialog').count());
    await close(page);
  });
  await check('Native map buttons select with Space and preserve long names', async () => {
    await page.locator('[data-menu="map"]').click();
    await page.locator('[data-region="mathematics"]').focus(); await page.keyboard.press('Space');
    assert.equal(await page.locator('.map-detail h3').innerText(), officialNames[7]);
    assert.equal(await page.locator('[data-region="mathematics"]').getAttribute('aria-pressed'), 'true');
    await capture(page, '09-official-world-map.png'); await close(page);
  });
  await check('Music connects output once and stops immediately', async () => {
    await page.locator('#audio-toggle').click();
    await page.waitForFunction(() => window.__auditAudio?.state === 'running');
    await page.locator('[data-menu="settings"]').click();
    await page.locator('#quality').selectOption('balanced');
    await page.locator('#sensitivity').fill('1.7');
    assert.equal(await page.evaluate(() => window.__auditOutputConnections), 1);
    await close(page); await page.locator('#audio-toggle').click();
    // Observe scheduled gain cancellation after the audio thread processes it.
    await page.waitForFunction(() => window.__auditMasterGain.gain.value === 0, null, {timeout:500});
    assert.equal(await page.evaluate(() => window.__AUIS_GAME__.state.settings.music), false);
  });
  await check('Disabling music while resume is pending cannot start later notes', async () => {
    await page.evaluate(() => { window.__auditDelayResume = true; });
    const before = await page.evaluate(() => window.__auditVoiceCount);
    await page.locator('#audio-toggle').click();
    await page.evaluate(() => document.querySelector('#audio-toggle').click());
    await page.waitForTimeout(850);
    assert.equal((await state(page)).settings.music, false);
    // Observe scheduled gain cancellation after the audio thread processes it.
    await page.waitForFunction(() => window.__auditMasterGain.gain.value === 0, null, {timeout:500});
    assert.equal(await page.evaluate(() => window.__AUIS_GAME__.state.settings.music), false);
    assert.equal(await page.evaluate(() => window.__auditVoiceCount), before);
    await page.evaluate(() => { window.__auditDelayResume = false; });
  });
  await check('Saved music resumes after a keyboard gesture on reload', async () => {
    await page.locator('#audio-toggle').click();
    await page.waitForFunction(() => window.__auditAudio?.state === 'running');
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForFunction(() => window.__AUIS_GAME__?.world);
    assert.equal(await page.evaluate(() => window.__auditAudio === undefined), true);
    await page.keyboard.press('w');
    await page.waitForFunction(() => window.__auditAudio?.state === 'running');
    await page.locator('#audio-toggle').click();
  });
  await check('Failed retest clears success panel; replay does not award twice', async () => {
    await page.evaluate(() => window.__AUIS_GAME__.openActivity('energy'));
    await range(page, '[data-angle-control]', 35);
    for (let i = 0; i < 3; i++) await page.locator(`[data-node="${i}"]`).check();
    await page.locator('[data-action="test"]').click(); await page.locator('.activity-feedback-success').waitFor();
    assert.ok(await page.locator('.activity-completion').isVisible());
    const count = (await state(page)).completed.length;
    await page.locator('[data-node="0"]').uncheck(); await page.locator('[data-action="test"]').click();
    await page.locator('.activity-feedback-retry').waitFor(); assert.equal(await page.locator('.activity-completion').isVisible(), false);
    await close(page); await page.evaluate(() => window.__AUIS_GAME__.openActivity('energy'));
    await range(page, '[data-angle-control]', 35);
    for (let i = 0; i < 3; i++) await page.locator(`[data-node="${i}"]`).check();
    await page.locator('[data-action="test"]').click(); await page.locator('.activity-feedback-success').waitFor();
    assert.equal(await page.locator('.activity-completion strong').innerText(), 'Discovery reviewed');
    assert.equal((await state(page)).completed.length, count); await close(page);
  });
  await check('Reordering activity steps retains keyboard focus', async () => {
    await page.evaluate(() => window.__AUIS_GAME__.openActivity('intro'));
    await page.locator('[data-index="0"][data-direction="1"]').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.index), '1'); await close(page);
  });
  await check('Long-name dialogs fit five viewport sizes', async () => {
    for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [1024, 768], [1440, 900]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => window.__AUIS_GAME__.world.teleport('mathematics'));
      assert.equal(await page.locator('#mini-region').innerText(), officialNames[7]);
      for (const menu of ['map', 'archive', 'journal', 'settings']) {
        await page.locator(`[data-menu="${menu}"]`).first().click();
        assert.equal(await page.evaluate(() => document.querySelector('.modal').scrollWidth > document.querySelector('.modal').clientWidth), false, `${menu} at ${width}px`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if (menu === 'archive') {
          await page.locator('[data-entry="mathematics"]').click();
          assert.equal(await page.locator('#archive-entry h3').innerText(), officialNames[7]);
        }
        await close(page);
      }
    }
  });
  await check('Every academic archive keeps its full name and content within 390px', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-menu="archive"]').click();
    const ids = ['engineering', 'computing', 'business', 'english', 'medical', 'social', 'mathematics', 'dentistry', 'pharmacy'];
    for (let index = 0; index < ids.length; index++) {
      await page.locator(`[data-entry="${ids[index]}"]`).click();
      assert.equal(await page.locator('#archive-entry h3').innerText(), officialNames[index + 1]);
      assert.equal(await page.evaluate(() => document.querySelector('#archive-entry').scrollWidth > document.querySelector('#archive-entry').clientWidth), false, ids[index]);
    }
    await close(page);
  });
  await check('All activity and faculty conversation panels fit 390px', async () => {
    for (const id of ['intro', 'bridge', 'energy', 'commands', 'market', 'story', 'samples', 'council', 'light', 'tooth', 'ingredients']) {
      await page.evaluate(id => window.__AUIS_GAME__.openActivity(id), id);
      assert.equal(await page.evaluate(() => document.querySelector('.activity-shell').scrollWidth > document.querySelector('.activity-shell').clientWidth), false, id);
      await close(page);
    }
    const guides = await page.evaluate(() => window.__AUIS_GAME__.world.debug.targets.filter(target => target.type === 'faculty'));
    for (const guide of guides) {
      await page.evaluate(target => window.__AUIS_GAME__.openConversation(target), guide);
      await page.locator('#ask-field').click();
      assert.equal(await page.evaluate(() => document.querySelector('.modal-content').scrollWidth > document.querySelector('.modal-content').clientWidth), false, guide.id);
      await close(page);
    }
  });
  await context.close();

  await check('Touch controls clear long names and release movement on lost capture', async () => {
    const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    try {
      const screen = await start(touch);
      await screen.evaluate(() => window.__AUIS_GAME__.world.teleport('mathematics'));
      const overlap = await screen.evaluate(() => document.querySelector('#touch-controls').getBoundingClientRect().bottom >= document.querySelector('.region-card').getBoundingClientRect().top);
      assert.equal(overlap, false);
      const soundOverlap = await screen.evaluate(() => {
        const sound = document.querySelector('#audio-toggle').getBoundingClientRect(), interact = document.querySelector('#touch-interact').getBoundingClientRect();
        return sound.left < interact.right && sound.right > interact.left && sound.top < interact.bottom && sound.bottom > interact.top;
      });
      assert.equal(soundOverlap, false, 'Music button overlaps the touch interaction button');
      const promptOverlap = await screen.evaluate(() => {
        const prompt=document.querySelector('#interaction').getBoundingClientRect();
        return [...document.querySelectorAll('[data-key],#touch-interact,#audio-toggle')].some(button=>{
          const b=button.getBoundingClientRect();return prompt.left<b.right-.5&&prompt.right>b.left+.5&&prompt.top<b.bottom-.5&&prompt.bottom>b.top+.5;
        });
      });
      assert.equal(promptOverlap,false,'Interaction prompt overlaps a touch control');
      await screen.waitForTimeout(4500); await capture(screen, '10-mobile-official-region.png');
      await screen.locator('[data-menu="map"]').click(); await screen.locator('[data-region="mathematics"]').click();
      assert.ok(await screen.locator('#travel').isVisible()); await capture(screen, '11-mobile-official-map.png'); await close(screen);
      await screen.evaluate(() => window.__AUIS_GAME__.world.teleport('village'));
      const before = await position(screen);
      await screen.locator('[data-key="KeyW"]').hover(); await screen.mouse.down(); await screen.waitForTimeout(250);
      const moved = await position(screen); assert.ok(Math.hypot(moved.x - before.x, moved.z - before.z) > .1);
      await screen.locator('[data-key="KeyW"]').dispatchEvent('lostpointercapture');
      const released = await position(screen); await screen.waitForTimeout(220);
      assert.ok(Math.hypot((await position(screen)).x - released.x, (await position(screen)).z - released.z) < .05);
      await screen.mouse.up();
    } finally { await touch.close(); }
  });
  await check('Blocked storage reports failure without changing saved timestamp', async () => {
    const blocked = await browser.newContext();
    try {
      const screen = await start(blocked); const before = (await state(screen)).savedAt;
      await screen.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Audit: storage blocked'); }; });
      await screen.locator('[data-menu="settings"]').click(); await screen.locator('#save-now').click();
      assert.match(await screen.locator('#toast').innerText(), /could not save/);
      assert.match(await screen.locator('#save-status').innerText(), /unavailable/);
      assert.equal((await state(screen)).savedAt, before);
    } finally { await blocked.close(); }
  });
  await check('Unavailable audio gives feedback and returns music setting to off', async () => {
    const unsupported = await browser.newContext();
    try {
      await unsupported.addInitScript(() => { window.AudioContext = undefined; window.webkitAudioContext = undefined; });
      const screen = await start(unsupported); await screen.locator('#audio-toggle').click();
      await screen.waitForFunction(() => window.__AUIS_GAME__.state.settings.music === false);
      assert.match(await screen.locator('#toast').innerText(), /Music could not start/);
    } finally { await unsupported.close(); }
  });
  await check('OS reduced motion applies to new journey and programming animation', async () => {
    const reduced = await browser.newContext({ reducedMotion: 'reduce' });
    try {
      const screen = await start(reduced);
      assert.equal((await state(screen)).settings.reducedMotion, true);
      assert.equal(await screen.evaluate(() => document.body.classList.contains('reduced-motion')), true);
      await screen.evaluate(() => window.__AUIS_GAME__.openActivity('commands'));
      while (await screen.locator('[data-remove]').count()) await screen.locator('[data-remove]').first().click();
      for (const command of ['forward', 'forward', 'forward', 'right', 'forward', 'forward', 'forward']) await screen.locator(`[data-add="${command}"]`).click();
      const started = Date.now(); await screen.locator('[data-action="test"]').click(); await screen.locator('.activity-feedback-success').waitFor();
      assert.ok(Date.now() - started < 1000, 'Reduced-motion replay still uses the long animated delays');
    } finally { await reduced.close(); }
  });
  await check('UI audit has no browser runtime errors', async () => assert.deepEqual(errors, []));
} finally {
  const report = { testedAt: new Date().toISOString(), browser: `Google Chrome ${browser.version()}`, url, checks, failures, errors, screenshots };
  await writeFile('docs/ui-audit-results.json', JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
if (failures.length) process.exitCode = 1;
