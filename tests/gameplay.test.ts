import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/engine.ts';
import { FISH, GAME, WEAPON_ORDER, POWER_ORDER, type FishKind } from '../src/game/config.ts';
import { hitMultiplier, moveFish, fishSegmentHit } from '../src/game/systems.ts';
import { fireLaser } from '../src/game/weapons.ts';
import { parseSave, freshSave, finishVoyage } from '../src/game/storage.ts';
function seeded(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function ready() {
  const g = new Game(seeded(15));
  g.start([...WEAPON_ORDER]);
  g.fish.clear();
  return g;
}
function advance(g: Game, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) g.update(1 / 60);
}

test('tap fires immediately; scatter is a five-projectile fan and uses energy', () => {
  const g = ready();
  g.aim = { x: 600, y: 150 };
  g.pressFire();
  assert.equal(g.bullets.count(), 1);
  g.firing = false;
  g.switchWeapon('scatter');
  const before = g.energy;
  g.pressFire();
  assert.equal(g.bullets.count(), 6);
  assert.equal(before - g.energy, 4);
  assert.equal(
    new Set(g.bullets.items.filter((b) => b.kind === 'scatter').map((b) => b.vx)).size,
    5,
  );
});
test('laser pierces, damages continuously and cannot run on empty energy', () => {
  const g = ready();
  const f = g.spawn('turtle', 600, 400)!,
    other = g.spawn('turtle', 600, 250)!;
  g.grid.rebuild(g.fish.items);
  g.switchWeapon('laser');
  const before = g.energy;
  fireLaser(g, 0.1);
  assert.ok(f.hp < FISH.turtle.hp);
  assert.ok(other.hp < FISH.turtle.hp);
  assert.equal(before - g.energy, 3);
  assert.equal(g.laserActive, true);
  g.energy = 0.1;
  fireLaser(g, 0.1);
  assert.equal(g.weapon, 'normal');
  assert.ok(g.energy >= 0);
});
test('freeze projectile slows a local group and changes movement', () => {
  const g = ready();
  const f = g.spawn('puffer', 600, 390, 0)!;
  f.age = 1;
  g.aim = { x: 600, y: 390 };
  g.switchWeapon('freeze');
  g.pressFire();
  g.firing = false;
  advance(g, 0.4);
  assert.ok(f.slow > 0);
  const normal = { ...f, slow: 0, inflated: false },
    slow = { ...normal, slow: 3 };
  moveFish(normal, 0.1, false);
  moveFish(slow, 0.1, false);
  assert.ok(Math.abs(slow.x - f.x) < Math.abs(normal.x - f.x));
});
test('puffer armor, turtle facing, jelly immunity, boss belly and tail matter', () => {
  const g = ready();
  const p = g.spawn('puffer', 300, 300)!;
  g.damage(p, 10, 300, 300);
  assert.equal(p.inflated, true);
  assert.equal(hitMultiplier(p, 300, 300), GAME.pufferArmor);
  const t = g.spawn('turtle', 300, 300)!;
  t.angle = 0;
  assert.equal(hitMultiplier(t, 330, 300), GAME.turtleArmor);
  assert.equal(hitMultiplier(t, 270, 300), GAME.turtleRear);
  const j = g.spawn('jelly', 400, 300, 0)!;
  j.age = 3.8;
  moveFish(j, 0.01, false);
  const hp = j.hp;
  g.damage(j, 999, j.x, j.y);
  assert.equal(j.hp, hp);
  j.age = 5;
  moveFish(j, 0.01, false);
  assert.equal(j.invulnerable, false);
  const boss = g.spawn('shark', 600, 250)!;
  boss.angle = 0;
  assert.equal(hitMultiplier(boss, 600, 280), GAME.bossWeakness);
  g.damage(boss, 10, 530, 250);
  assert.ok(boss.slow > 0);
  boss.angle = Math.PI;
  assert.equal(hitMultiplier(boss, 600, 280), GAME.bossWeakness);
  assert.equal(
    fishSegmentHit(boss, 500, 190, 700, 190),
    null,
    'no invisible hit well above narrow shark body',
  );
});
test('all powers have inventory, expiry and distinct consequences', () => {
  for (const kind of POWER_ORDER) {
    const g = ready();
    const f = g.spawn('puffer', 600, 300)!;
    g.aim = { x: 600, y: 300 };
    assert.equal(g.usePower(kind), true);
    assert.equal(g.powers[kind], 0);
    assert.ok(g.effects[kind] > 0);
    assert.equal(g.usePower(kind), false);
    if (kind === 'bomb') assert.equal(f.alive, false);
    advance(g, 13);
    assert.equal(g.effects[kind], 0);
  }
});
test('events warn for two seconds; all five occur; boss summons, dashes, enrages', () => {
  const g = ready();
  const events = new Set<string>();
  let warningTime: number | undefined;
  let bossSeen = false;
  for (let i = 0; i < 1800; i++) {
    g.update(0.1);
    if (g.warning && warningTime === undefined) warningTime = g.time;
    if (g.event && !g.warning) {
      events.add(g.event);
      if (events.size === 1 && warningTime !== undefined) {
        assert.ok(g.time - warningTime >= 1.9);
        warningTime = undefined;
      }
    }
    const boss = g.fish.items.find((f) => f.alive && f.kind === 'shark');
    if (boss) {
      bossSeen = true;
      if (boss.age > 13) assert.ok(boss.summoned >= 1);
    }
  }
  assert.equal(events.size, 5);
  assert.equal(bossSeen, true);
  const q = ready();
  const f = q.spawn('shark', 600, 250)!;
  const calm = { ...f },
    rage = { ...f, hp: FISH.shark.hp * 0.4 };
  moveFish(calm, 0.1, false);
  moveFish(rage, 0.1, false);
  assert.ok(Math.abs(rage.x - f.x) > Math.abs(calm.x - f.x));
  f.age = 6.7;
  const energy = q.energy;
  advance(q, 0.1);
  assert.ok(q.energy < energy);
});
test('save sanitizes malformed, foreign-version and hostile values; credits only results', () => {
  for (const raw of ['null', '[]', '{', '{"version":999}'])
    assert.deepEqual(parseSave(raw), freshSave());
  const parsed = parseSave(
    JSON.stringify({
      version: 1,
      highScore: -9,
      totalCoins: '100',
      settings: { sound: false },
      unlockedWeapons: ['laser', 'evil'],
      statistics: { gamesPlayed: 5, fishKilled: -10 },
    }),
  );
  assert.equal(parsed.highScore, 0);
  assert.equal(parsed.totalCoins, 0);
  assert.equal(parsed.settings.sound, false);
  assert.deepEqual(parsed.unlockedWeapons, ['normal', 'laser']);
  assert.equal(parsed.statistics.gamesPlayed, 5);
  assert.equal(parsed.statistics.fishKilled, 0);
  const g = ready();
  g.damage(g.spawn('clown', 600, 300)!, 100, 600, 300);
  assert.deepEqual(finishVoyage(freshSave(), g.snapshot()), freshSave());
  g.mode = 'result';
  const save = finishVoyage(freshSave(), g.snapshot());
  assert.equal(save.statistics.gamesPlayed, 1);
  assert.equal(save.totalCoins, g.coins);
});
test('very high combos cannot create unlimited energy from a single catch', () => {
  const g = ready();
  g.energy = 0;
  g.combo = 500;
  g.damage(g.spawn('clown', 600, 300)!, 100, 600, 300);
  assert.ok(g.energy <= GAME.baseEnergy + GAME.comboEnergyCap * GAME.comboEnergyStep);
});
test('a laser tap between frames still hits the aimed target and flashes briefly', () => {
  const g = ready();
  const fish = g.spawn('turtle', 780, 330)!;
  g.aim = { x: 780, y: 330 };
  g.switchWeapon('laser');
  const hp = fish.hp,
    energy = g.energy;
  g.pressFire();
  g.firing = false;
  assert.ok(fish.hp < hp);
  assert.ok(g.energy < energy);
  g.update(1 / 60);
  assert.equal(g.laserActive, true);
  advance(g, 0.2);
  assert.equal(g.laserActive, false);
});
test('three full tactical rounds have real catches, finite state, bosses and bounded pools', () => {
  const records = [];
  for (const seed of [19, 87, 321]) {
    const g = new Game(seeded(seed));
    g.start();
    let maxFish = 0,
      maxParticles = 0,
      laserTime = 0;
    const kinds = new Set<FishKind>();
    for (let frame = 0; frame < 10810 && g.mode === 'playing'; frame++) {
      const targets = g.fish.items.filter(
        (f) => f.alive && f.x > 100 && f.x < 1100 && !f.invulnerable,
      );
      for (const f of targets) kinds.add(f.kind);
      const boss = targets.find((f) => f.kind === 'shark');
      const target = boss ?? targets.sort((a, b) => b.y - a.y)[0];
      if (target) {
        // Aiming uses a short lead for projectile travel, no direct damage or score changes.
        const lead = g.weapon === 'laser' ? 0 : Math.hypot(target.x - 600, target.y - 605) / 850;
        g.aim = {
          x: target.x + target.dir * FISH[target.kind].speed * lead,
          y: target.y + (boss ? 24 : 0),
        };
        if (frame % 30 === 0) {
          if (boss && g.energy > 20 && g.unlocked.includes('laser')) {
            g.switchWeapon('laser');
            if (g.effects.freeze === 0) g.usePower('freeze');
          } else if (g.energy > 25 && targets.length > 8 && g.unlocked.includes('scatter'))
            g.switchWeapon('scatter');
          else if (g.weapon !== 'laser' || g.energy < 2) g.switchWeapon('normal');
          if (boss) g.usePower('bomb');
          if (targets.length > 12) {
            g.usePower('double');
            g.usePower('rapid');
          }
        }
      }
      g.firing = true;
      g.update(1 / 60);
      if (g.laserActive) laserTime += 1 / 60;
      maxFish = Math.max(maxFish, g.fish.count());
      maxParticles = Math.max(maxParticles, g.particles.count());
      assert.ok(
        Number.isFinite(g.score) && Number.isFinite(g.energy) && g.energy >= 0 && g.energy <= 100,
      );
      for (const f of targets)
        assert.ok(Number.isFinite(f.x) && Number.isFinite(f.y) && Number.isFinite(f.hp));
    }
    assert.equal(g.mode, 'result');
    assert.ok(g.kills > 70);
    assert.equal(g.unlocked.length, 4);
    assert.equal(kinds.size, 8);
    assert.ok(laserTime < 80);
    assert.ok(g.bosses >= 1, 'tactical player must be able to beat a boss');
    assert.ok(
      g.fish.items.length <= GAME.maxFish &&
        g.bullets.items.length <= GAME.maxBullets &&
        g.particles.items.length <= GAME.maxParticles,
    );
    records.push({
      seed,
      score: g.score,
      kills: g.kills,
      bosses: g.bosses,
      combo: g.bestCombo,
      maxFish,
      maxParticles,
      laserSeconds: Math.round(laserTime),
    });
    g.start(g.unlocked);
    assert.equal(g.time, 0);
    assert.equal(g.kills, 0);
    assert.equal(g.bullets.count(), 0);
    assert.equal(g.particles.count(), 0);
    assert.equal(g.firing, false);
  }
  console.log('Full-round tactical playtests:', JSON.stringify(records));
});
