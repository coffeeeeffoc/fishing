import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/engine.ts';
import { Pool,segmentHit,FishGrid } from '../src/game/systems.ts';
test('shot captures a fish and awards score, gold and energy',()=>{const g=new Game(()=>.5);g.start();g.fish.clear();const fish=g.spawn('clown',600,400)!;g.damage(fish,22,600,410);assert.equal(g.kills,1);assert.ok(g.coins>0);assert.ok(g.energy>65);assert.equal(g.combo,1);for(let i=0;i<130;i++)g.update(1/60);assert.equal(g.combo,0);});
test('pause freezes clock; full 180 second round ends once',()=>{const g=new Game();g.start();g.pause();g.update(.1);assert.equal(g.time,0);g.resume();for(let i=0;i<1801;i++)g.update(.1);assert.equal(g.mode,'result');assert.equal(g.time,180);g.update(.1);assert.equal(g.time,180);});
test('swept collisions prevent tunneling, grid covers fish across cell edges',()=>{assert.equal(segmentHit(0,0,100,0,50,0,10),.4);assert.equal(segmentHit(0,0,10,0,50,0,10),null);const g=new Game();g.start();g.fish.clear();const f=g.spawn('clown',101,200)!;const grid=new FishGrid();grid.rebuild(g.fish.items);assert.ok(grid.query(80,190,80,210).has(f));});
test('pool reuses entities and enforces a hard capacity',()=>{const p=new Pool(2,()=>({alive:false}));const first=p.acquire()!;p.acquire();assert.equal(p.acquire(),undefined);first.alive=false;assert.equal(p.acquire(),first);assert.equal(p.items.length,2);});
