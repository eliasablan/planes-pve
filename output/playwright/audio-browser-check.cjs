/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI function entry. */
// Requires the temporary bridge documented in docs/plans/2026-10-24-audio-continuidad.md.
async page => {
  const checks = [];
  const assert = (ok, message) => { if (!ok) throw new Error(message); checks.push(message); };
  const events = () => page.evaluate(() => window.__audioEvents.map(event => event.type));
  const count = (list, type) => list.filter(event => event === type).length;
  const parkEnemies = () => page.evaluate(() => window.__audioStore.setState({
    pveEnemies: { parked: { id: 'parked', role: 'scout', position: [3000, 250, 3000], heading: 0, hp: 35, maxHp: 35 } },
    pvePickups: { sentinel: { id: 'sentinel', kind: 'ammo', position: [9000, 9000, 9000] } },
    startTime: Date.now(),
  }));
  const ready = async () => {
    await page.waitForFunction(() => window.__audioStore?.getState().speed > 20);
    await parkEnemies();
    await page.keyboard.press('o', { delay: 80 });
  };
  try {
  page.setDefaultTimeout(6000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('http://localhost:3000');
  await page.evaluate(() => localStorage.removeItem('planes-pve:audio:v1'));
  await page.reload();
  await page.getByRole('button', { name: 'Play', exact: true }).waitFor();
  assert(await page.evaluate(() => !window.__audioDebug), 'Fresh reload does not create audio before a gesture');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await ready();
  assert(await page.evaluate(() => window.__audioDebug().context.state === 'running'), 'First Play gesture after reload unlocks the real AudioContext');
  await page.evaluate(() => {
    const debug = window.__audioDebug();
    window.__firstAudioContext = debug.context;
    window.__audioAnalyser = debug.context.createAnalyser();
    debug.master.connect(window.__audioAnalyser);
    window.__audioStore.setState({ ammo: 6 });
  });
  await page.keyboard.down('Space');
  await page.waitForFunction(() => {
    const samples = new Float32Array(window.__audioAnalyser.fftSize);
    window.__audioAnalyser.getFloatTimeDomainData(samples);
    return samples.some(value => Math.abs(value) > 0.001);
  });
  await page.waitForFunction(() => window.__audioStore.getState().ammo === 0);
  await page.waitForTimeout(450);
  let list = await events();
  assert(count(list, 'machine-gun') === 6 && count(list, 'ammo-depleted') === 1, 'Six continuous confirmed shots, including misses and the last round, each emit once');
  assert(count(list, 'weapon-empty') === 0, 'Holding after the last round does not repeat depletion or add an empty warning');
  assert(await page.evaluate(() => Object.values(window.__audioStore.getState().pveEnemies)[0].hp === 35), 'Missed shots still sound and preserve enemy health');
  await page.keyboard.up('Space');
  await page.waitForTimeout(60);
  await page.keyboard.down('Space');
  await page.waitForTimeout(600);
  list = await events();
  assert(count(list, 'weapon-empty') === 1, 'A new attempt on an empty gun emits one distinct warning during a hold');
  await page.evaluate(() => window.__audioStore.setState({ missiles: 1 }));
  await page.keyboard.press('2', { delay: 80 });
  await page.waitForFunction(() => window.__audioStore.getState().missiles === 0);
  await page.waitForTimeout(250);
  list = await events();
  assert(count(list, 'missile') === 1 && count(list, 'ammo-depleted') === 2, 'Switching weapons while firing launches one missile and announces its depletion');
  await page.keyboard.press('1', { delay: 80 });
  await page.waitForTimeout(200);
  assert(count(await events(), 'weapon-empty') === 1, 'Switching back to an already warned empty gun does not spam');
  await page.keyboard.up('Space');
  await page.waitForTimeout(60);
  await page.keyboard.down('Space');
  await page.waitForTimeout(100);
  await page.keyboard.up('Space');
  await page.waitForTimeout(60);
  assert(count(await events(), 'weapon-empty') === 2, 'Releasing and pressing fire re-arms the empty warning');
  await page.evaluate(() => {
    const store = window.__audioStore, s = store.getState(), [x, z] = s.localPlayerPosition;
    store.setState({ ammo: 179, missiles: 4, hp: 99, pvePickups: Object.fromEntries(['ammo', 'missile', 'repair'].map(kind => [kind, { id: kind, kind, position: [x, s.altitude - 5, z - 15] }])) });
  });
  await page.waitForFunction(() => window.__audioStore.getState().pvePickupReceipts.length === 3);
  const pickups = await page.evaluate(() => window.__audioStore.getState().pvePickupReceipts.map(({ kind, amount }) => ({ kind, amount })));
  list = await events();
  assert(pickups.every(receipt => receipt.amount === 1) && ['pickup-ammo', 'pickup-missile', 'pickup-repair'].every(type => count(list, type) === 1), 'Actual same-frame radius collection plays each supply identity once for real +1/+1/+1 gains');
  await page.evaluate(() => {
    const store = window.__audioStore, s = store.getState(), [x, z] = s.localPlayerPosition;
    s.spawnPvePickups([{ id: 'full', kind: 'ammo', position: [x, s.altitude - 5, z - 15] }]);
  });
  await page.waitForFunction(() => window.__audioStore.getState().pvePickupReceipts.length === 4);
  await page.evaluate(() => window.__audioStore.getState().collectPvePickup('full'));
  list = await events();
  assert(count(list, 'pickup-full') === 1 && count(list, 'pickup-ammo') === 1, 'Zero-gain collection uses neutral full feedback, and duplicate collection is silent');
  await page.evaluate(() => {
    const store = window.__audioStore, s = store.getState(), [x, z] = s.localPlayerPosition;
    store.setState({ hp: 100, startTime: Date.now() - 7000, pveEnemies: Object.fromEntries(['scout', 'fighter', 'bomber'].map(role => [role, { id: role, role, position: [x + 20, s.altitude - 5, z], heading: 0, hp: 120, maxHp: 120 }])) });
  });
  await page.waitForFunction(() => window.__audioStore.getState().hp === 84);
  list = await events();
  assert(count(list, 'enemy-hit') === 3, 'Three real PveDirector attacks in one frame apply 16 damage and retain three hit sounds');
  await parkEnemies();
  const beforeEnvironmental = count(list, 'enemy-hit');
  await page.evaluate(() => window.__applyAudioDamage(20));
  assert(count(await events(), 'enemy-hit') === beforeEnvironmental, 'Environmental damage does not impersonate an enemy impact');
  await page.getByRole('button', { name: 'Display settings', exact: true }).click();
  const resourcesBefore = await page.evaluate(() => [window.__audioStore.getState().ammo, window.__audioStore.getState().missiles]);
  await page.getByRole('slider', { name: 'Effects volume', exact: true }).fill('35');
  await page.getByRole('button', { name: 'Mute sound effects', exact: true }).click();
  assert(await page.getByRole('button', { name: 'Mute sound effects', exact: true }).getAttribute('aria-pressed') === 'true', 'Mute exposes its accessible pressed state');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Space', { delay: 80 });
  assert((await events()).length === 0, 'Muted confirmed gunfire creates no audio voice');
  await page.getByRole('button', { name: 'Display settings', exact: true }).click();
  await page.getByRole('button', { name: 'Mute sound effects', exact: true }).click();
  await page.keyboard.press('Escape');
  assert(await page.evaluate(() => window.__audioDebug().preferences.volume === 0.35), 'Effects volume updates the shared master preference');
  assert(JSON.stringify(resourcesBefore) === JSON.stringify([180, 5]), 'Audio controls do not consume weapon resources');
  await page.evaluate(() => {
    const store = window.__audioStore, s = store.getState(), [x, z] = s.localPlayerPosition;
    store.setState({ hp: 3, startTime: Date.now() - 7000, pveEnemies: { fatal: { id: 'fatal', role: 'scout', position: [x + 20, s.altitude - 5, z], heading: 0, hp: 35, maxHp: 35 } } });
  });
  await page.waitForFunction(() => window.__audioStore.getState().gameStatus === 'finished');
  await page.waitForFunction(() => !document.querySelector('canvas'));
  const fatal = await page.evaluate(() => ({ events: window.__audioEvents, voices: window.__audioDebug().voices, enabled: window.__audioDebug().enabled }));
  assert(fatal.events.filter(event => event.type === 'enemy-fatal').length === 1 && fatal.voices.some(voice => voice.type === 'enemy-fatal') && !fatal.enabled, 'Fatal enemy hit sounds exactly once and its three-layer tail survives Canvas removal');
  await page.getByRole('button', { name: 'Fly again', exact: true }).click();
  await ready();
  assert(await page.evaluate(() => window.__audioDebug().context === window.__firstAudioContext && window.__audioDebug().voices.length === 0 && window.__audioStore.getState().ammo === 120), 'Replay reuses the context and clears prior audio and resources');
  await page.keyboard.press('Space', { delay: 80 });
  assert(count(await events(), 'machine-gun') === 1, 'Second consecutive run still plays confirmed shots once');
  await page.evaluate(() => window.__applyAudioDamage(100, 'enemy'));
  await page.getByRole('button', { name: 'Start screen', exact: true }).click();
  assert(await page.evaluate(() => window.__audioDebug().voices.length === 0 && !window.__audioDebug().enabled), 'Exit immediately stops the fatal tail and pending sounds');
  await page.getByRole('button', { name: 'Mute sound effects', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Play', exact: true }).waitFor();
  assert(await page.getByRole('slider', { name: 'Effects volume', exact: true }).inputValue() === '35' && await page.getByRole('button', { name: 'Mute sound effects', exact: true }).getAttribute('aria-pressed') === 'true', 'Reload persists both effects volume and mute');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await ready();
  await page.keyboard.press('Space', { delay: 80 });
  assert((await events()).length === 0 && await page.evaluate(() => window.__audioStore.getState().ammo < 120), 'A muted fresh run after reload still consumes confirmed ammunition and remains silent');
  await page.getByRole('button', { name: 'Display settings', exact: true }).click();
  await page.getByRole('button', { name: 'Mute sound effects', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Space', { delay: 80 });
  assert(count(await events(), 'machine-gun') === 1, 'Unmuting after reload restores sound on the next confirmed shot');
  await page.getByRole('button', { name: 'Display settings', exact: true }).click();
  await page.screenshot({ path: 'output/playwright/audio-settings-fullhd.png' });
  return { status: 'passed', checks, pickups, fatal, listening: 'Real AudioContext and nonzero PCM verified; subjective listening remains human.' };
  } catch (error) { return { status: 'failed', checks, error: String(error) }; }
}
