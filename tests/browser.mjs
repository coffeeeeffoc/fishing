// Isolated browser regression runner; never connects to the user's browser profile.
/* global window, document, Event, EventTarget, innerWidth, innerHeight, localStorage, setInterval, clearInterval */
import { chromium, webkit } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.TEST_URL ?? 'http://localhost:43210';
const output = new URL('../artifacts/', import.meta.url);
await mkdir(output, { recursive: true });
const report = { url: base, checkedAt: new Date().toISOString(), browsers: [] };

for (const [name, type] of [
  ['chromium', chromium],
  ['webkit', webkit],
]) {
  if (process.env.TEST_BROWSER && process.env.TEST_BROWSER !== name) continue;
  const browser = await type.launch({ headless: true });
  // Windows WebKit's software compositor is slow at DPR 3 even with an empty scene.
  // Chromium exercises DPR 3 -> canvas <= 2; WebKit performance uses logical DPR 1.
  const deviceDpr = name === 'webkit' ? 1 : 3;
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: deviceDpr,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const errors = [];
  const assertions = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.addInitScript(() => {
    const add = EventTarget.prototype.addEventListener;
    const remove = EventTarget.prototype.removeEventListener;
    const watched = new Set([
      'pointerdown',
      'pointermove',
      'pointerup',
      'pointercancel',
      'lostpointercapture',
      'visibilitychange',
      'blur',
      'resize',
      'keydown',
    ]);
    const registrations = new WeakMap();
    window.__listenerAudit = 0;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (watched.has(type) && listener) {
        if (!registrations.has(this)) registrations.set(this, new Map());
        const entries = registrations.get(this),
          key = type + Boolean(typeof options === 'boolean' ? options : options?.capture);
        if (!entries.has(key)) entries.set(key, new Set());
        if (!entries.get(key).has(listener)) {
          entries.get(key).add(listener);
          window.__listenerAudit++;
        }
      }
      return add.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function (type, listener, options) {
      const key = type + Boolean(typeof options === 'boolean' ? options : options?.capture);
      if (registrations.get(this)?.get(key)?.delete(listener)) window.__listenerAudit--;
      return remove.call(this, type, listener, options);
    };
    window.__audioAudit = [];
    for (const key of ['AudioContext', 'webkitAudioContext'])
      if (window[key])
        window[key] = new Proxy(window[key], {
          construct(target, args) {
            const context = Reflect.construct(target, args);
            window.__audioAudit.push(context);
            return context;
          },
        });
    const original = window.requestAnimationFrame.bind(window),
      cancel = window.cancelAnimationFrame.bind(window);
    const pending = new Set();
    window.__rafAudit = pending;
    window.requestAnimationFrame = (callback) => {
      const id = original((t) => {
        pending.delete(id);
        callback(t);
      });
      pending.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      pending.delete(id);
      cancel(id);
    };
    window.addEventListener('unhandledrejection', (e) => {
      window.__rejection = String(e.reason);
    });
  });
  try {
    await page.goto(base);
    await page.getByRole('button', { name: '开始航行' }).click();
    await page.waitForTimeout(250);
    const state = () => page.evaluate(() => window.__tidebreak.snapshot());
    const fixture = () =>
      page.evaluate(() => {
        const g = window.__tidebreak;
        g.fish.clear();
        g.bullets.clear();
        g.energy = 80;
      });
    assert.equal((await state()).mode, 'playing');
    assert.ok(await page.locator('canvas').evaluate((c) => c.width <= c.clientWidth * 2 + 1));
    await fixture();
    await page.mouse.click(420, 160);
    assert.ok(await page.evaluate(() => window.__tidebreak.bullets.count() > 0));
    await page.mouse.move(420, 160);
    await page.mouse.down();
    await page.waitForTimeout(700);
    assert.ok(await page.evaluate(() => window.__tidebreak.bullets.count() >= 2));
    await page.mouse.move(560, 200, { steps: 8 });
    assert.ok(await page.evaluate(() => window.__tidebreak.aim.x > 750));
    await page.mouse.up();
    assert.equal(await page.evaluate(() => window.__tidebreak.firing), false);
    assertions.push('click, hold, drag and release');
    if (name === 'chromium') {
      const session = await context.newCDPSession(page);
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: 420, y: 180, id: 1 }],
      });
      assert.equal(await page.evaluate(() => window.__tidebreak.firing), true);
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: 540, y: 220, id: 1 }],
      });
      assert.ok(await page.evaluate(() => window.__tidebreak.aim.x > 700));
      await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      assert.equal(await page.evaluate(() => window.__tidebreak.firing), false);
      assertions.push('native touch drag and cancellation');
    }
    await page.evaluate(() => {
      window.__tidebreak.unlocked = ['normal', 'scatter', 'laser', 'freeze'];
    });
    await page.waitForTimeout(150);
    for (const [kind, label] of [
      ['normal', '脉冲炮'],
      ['scatter', '散射炮'],
      ['laser', '聚能激光'],
      ['freeze', '冰霜炮'],
    ]) {
      await fixture();
      await page.getByRole('button', { name: label, exact: true }).click();
      await page.mouse.move(420, 160);
      await page.mouse.down();
      await page.waitForTimeout(230);
      const observation = await page.evaluate(() => {
        const g = window.__tidebreak;
        return {
          weapon: g.weapon,
          energy: g.energy,
          laser: g.laserActive,
          bullets: g.bullets.items.filter((b) => b.alive).map((b) => b.kind),
        };
      });
      assert.equal(observation.weapon, kind);
      if (kind === 'laser') assert.equal(observation.laser, true);
      else assert.ok(observation.bullets.includes(kind));
      if (kind !== 'normal') assert.ok(observation.energy < 80);
      await page.mouse.up();
    }
    assertions.push('four distinct weapons and actual energy consumption');
    for (const [key, label] of [
      ['freeze', '全场冻结'],
      ['bomb', '深水炸弹'],
      ['double', '双倍金币'],
      ['rapid', '急速装填'],
      ['aim', '自动瞄准'],
    ]) {
      await page.getByRole('button', { name: new RegExp(`^${label}，`) }).click();
      const s = await state();
      assert.equal(s.powers[key], 0);
      assert.ok(s.effects[key] > 0);
    }
    assertions.push('five power buttons, inventory and duration state');
    await page.getByRole('button', { name: '暂停', exact: true }).click();
    const paused = (await state()).time;
    await page.waitForTimeout(400);
    assert.equal((await state()).time, paused);
    await page.getByRole('button', { name: '设置', exact: true }).click();
    await page.getByRole('checkbox', { name: '声音', exact: true }).uncheck();
    await page.getByRole('button', { name: '完成' }).click();
    await page.getByRole('button', { name: '继续航行' }).click();
    await page.waitForTimeout(200);
    assert.ok((await state()).time < paused + 0.5);
    assertions.push('pause/resume freezes time; audio settings persist');
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
      delete document.hidden;
    });
    await page.waitForTimeout(150);
    assert.equal((await state()).mode, 'paused');
    assert.equal(await page.evaluate(() => window.__tidebreak.firing), false);
    assertions.push('visibilitychange handler pauses and clears input');
    const sizes =
      name === 'chromium'
        ? [
            [375, 667],
            [390, 844],
            [393, 852],
            [430, 932],
          ]
        : [[390, 844]];
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await page.locator('.rotate').waitFor({ state: 'visible' });
      await page.screenshot({
        path: new URL(`${name}-${width}x${height}.png`, output).pathname.replace(
          /^\/([A-Z]:)/,
          '$1',
        ),
      });
      await page.setViewportSize({ width: height, height: width });
      await page.getByRole('button', { name: '继续航行' }).click();
      await page.waitForTimeout(150);
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        buttons: [...document.querySelectorAll('.bottom button')].map((b) => {
          const r = b.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
        }),
        width: innerWidth,
        height: innerHeight,
      }));
      assert.equal(layout.overflow, false);
      assert.equal(layout.buttons.length, 9);
      for (const r of layout.buttons) {
        assert.ok(r.w >= 44 && r.h >= 44);
        assert.ok(
          r.x >= 0 && r.y >= 0 && r.right <= layout.width + 0.5 && r.bottom <= layout.height + 0.5,
        );
      }
      for (let i = 0; i < layout.buttons.length; i++)
        for (let j = i + 1; j < layout.buttons.length; j++) {
          const a = layout.buttons[i],
            b = layout.buttons[j];
          assert.ok(
            a.right <= b.x + 0.5 ||
              b.right <= a.x + 0.5 ||
              a.bottom <= b.y + 0.5 ||
              b.bottom <= a.y + 0.5,
            'controls must not overlap',
          );
        }
      await page.screenshot({
        path: new URL(`${name}-${height}x${width}.png`, output).pathname.replace(
          /^\/([A-Z]:)/,
          '$1',
        ),
      });
      await page.getByRole('button', { name: '暂停', exact: true }).click();
    }
    assertions.push('portrait prompts; landscape geometry, 44px targets, no overlaps or overflow');
    await page.getByRole('button', { name: '继续航行' }).click();
    await page.evaluate(() => {
      const g = window.__tidebreak;
      while (g.mode === 'playing') g.update(0.1);
    });
    await page.getByRole('button', { name: '再次出海' }).waitFor();
    const save1 = await page.evaluate(() => JSON.parse(localStorage.getItem('tidebreak.save.v1')));
    const listenerBaseline = await page.evaluate(() => window.__listenerAudit);
    await page.waitForTimeout(500);
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('tidebreak.save.v1')).statistics.gamesPlayed,
      ),
      save1.statistics.gamesPlayed,
    );
    await page.screenshot({
      path: new URL(`${name}-result.png`, output).pathname.replace(/^\/([A-Z]:)/, '$1'),
    });
    for (let i = 0; i < 6; i++) {
      await page.getByRole('button', { name: '再次出海' }).click();
      const s = await state();
      assert.equal(s.kills, 0);
      assert.equal(s.combo, 0);
      assert.equal(s.score, 0);
      assert.equal(await page.evaluate(() => window.__rafAudit.size), 1);
      assert.equal(await page.evaluate(() => window.__tidebreak.metrics.activeLoops), 1);
      await page.evaluate(() => {
        const g = window.__tidebreak;
        while (g.mode === 'playing') g.update(0.1);
      });
      await page.getByRole('button', { name: '再次出海' }).waitFor();
    }
    assertions.push(
      'seven complete simulated UI rounds; settlement once; restart reset; single actual RAF',
    );
    assert.equal(await page.evaluate(() => window.__listenerAudit), listenerBaseline);
    const audioContexts = await page.evaluate(() => window.__audioAudit.length);
    assert.ok(audioContexts <= 1);
    if (name === 'chromium') assert.equal(audioContexts, 1);
    assertions.push('stable native listeners; AudioContext reuse or unsupported-audio fallback');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tidebreak.save.v1')));
    assert.equal(saved.statistics.gamesPlayed, 7);
    assert.equal(saved.settings.sound, false);
    await page.reload();
    await page.getByRole('button', { name: '开始航行' }).click();
    assert.equal((await state()).unlocked.length, 4);
    assertions.push('reload preserves unlocks, settings, coins and statistics');
    await page.evaluate(() => {
      const g = window.__tidebreak;
      let seed = 271;
      const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      g.rng = random;
      g.time = 110;
      g.event = 'frenzy';
      g.fish.clear();
      g.spawn('shark', 600, 250);
      window.__stress = setInterval(() => {
        const kinds = ['clown', 'puffer', 'sword', 'jelly', 'turtle', 'treasure', 'golden'];
        while (g.fish.count() < 100)
          g.spawn(kinds[g.fish.count() % 7], 100 + random() * 1000, 130 + random() * 350);
        for (let i = 0; i < 180; i++) {
          const b = g.bullets.acquire();
          if (!b) break;
          Object.assign(b, {
            x: 20 + random() * 1160,
            y: 590,
            prevX: 0,
            prevY: 0,
            vx: (random() - 0.5) * 600,
            vy: -500,
            life: 2,
            damage: 1,
            kind: 'scatter',
          });
        }
        g.burst(600, 300, '#ffdd77', 280);
      }, 33);
    });
    await page.waitForTimeout(2200);
    const fpsSamples = [];
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(1100);
      fpsSamples.push(await page.evaluate(() => window.__tidebreak.metrics.fps));
    }
    const metrics = await page.evaluate(() => ({
      metrics: window.__tidebreak.metrics,
      fish: window.__tidebreak.fish.count(),
      bullets: window.__tidebreak.bullets.count(),
      particles: window.__tidebreak.particles.count(),
      raf: window.__rafAudit.size,
    }));
    metrics.fpsSamples = fpsSamples;
    metrics.averageFps = Math.round(fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length);
    console.log(`${name} stress sample:`, JSON.stringify(metrics));
    assert.ok(metrics.averageFps >= 30, `${name} stress average fps: ${metrics.averageFps}`);
    assert.ok(
      fpsSamples.filter((fps) => fps < 30).length < fpsSamples.length / 2,
      'must not sustain sub-30 FPS',
    );
    assert.ok(metrics.metrics.p95Ms < 33.3);
    assert.equal(metrics.raf, 1);
    assert.ok(metrics.fish <= 100 && metrics.bullets <= 180 && metrics.particles <= 280);
    await page.screenshot({
      path: new URL(`${name}-stress.png`, output).pathname.replace(/^\/([A-Z]:)/, '$1'),
    });
    await page.evaluate(() => clearInterval(window.__stress));
    assert.equal(await page.evaluate(() => window.__rejection ?? null), null);
    assert.deepEqual(errors, []);
    report.browsers.push({
      name,
      deviceDpr,
      audioContexts,
      assertions,
      stress: metrics,
      consoleErrors: errors,
    });
    console.log(`${name}: ${assertions.length} browser scenarios passed`, JSON.stringify(metrics));
  } finally {
    await browser.close();
  }
}
await writeFile(new URL('browser-report.json', output), JSON.stringify(report, null, 2));
