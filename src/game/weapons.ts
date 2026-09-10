import { GAME,WEAPONS,type PowerKind,POWERS,FISH } from './config.ts';
import type { Game } from './engine.ts';
import { distance,fishSegmentHit } from './systems.ts';

export function autoAim(g:Game) {
  if(g.effects.aim<=0)return;
  let target;let nearest:number=GAME.autoAimRadius;
  for(const f of g.fish.items)if(f.alive&&!f.invulnerable&&f.x>0&&f.x<GAME.width){const d=distance(f.x,f.y,g.aim.x,g.aim.y);if(d<nearest){nearest=d;target=f;}}
  if(target){g.aim.x=target.x;g.aim.y=target.y+(target.kind==='shark'?24:0);}
}
export function fireProjectiles(g:Game) {
  let w=WEAPONS[g.weapon];
  if(g.energy<w.energyCost){g.weapon='normal';w=WEAPONS.normal;g.announce('能量不足 · 脉冲炮回能',2);}
  g.energy-=w.energyCost;
  const angle=Math.atan2(g.aim.y-605,g.aim.x-600);
  for(let i=0;i<w.pellets;i++) {
    const b=g.bullets.acquire();if(!b)break;const a=angle+(i-(w.pellets-1)/2)*w.spread;
    Object.assign(b,{x:600+Math.cos(a)*49,y:605+Math.sin(a)*49,vx:Math.cos(a)*w.projectileSpeed,vy:Math.sin(a)*w.projectileSpeed,damage:w.damage,life:GAME.bulletLife,kind:g.weapon});b.prevX=b.x;b.prevY=b.y;
  }
  g.recoil=1;g.onSound('fire');
  return 1/w.fireRate/(g.effects.rapid>0||(g.event==='frenzy'&&!g.warning)?GAME.rapidMultiplier:1);
}
export function fireLaser(g:Game,dt:number) {
  const w=WEAPONS.laser;
  if(g.energy<w.energyCost*dt){g.weapon='normal';g.announce('能量不足 · 脉冲炮回能',2);return;}
  g.energy-=w.energyCost*dt;g.laserActive=true;g.recoil=.7;
  const a=g.cannonAngle,ax=600+Math.cos(a)*45,ay=605+Math.sin(a)*45;
  g.laserEnd.x=600+Math.cos(a)*1300;g.laserEnd.y=605+Math.sin(a)*1300;
  for(const f of g.grid.query(ax,ay,g.laserEnd.x,g.laserEnd.y))if(f.alive){
    const t=fishSegmentHit(f,ax,ay,g.laserEnd.x,g.laserEnd.y);
    if(t!==null)g.damage(f,w.damage*dt,ax+(g.laserEnd.x-ax)*t,ay+(g.laserEnd.y-ay)*t);
  }
  g.onSound('fire');
}
export function usePower(g:Game,kind:PowerKind) {
  if(g.mode!=='playing'||g.powers[kind]<=0||g.effects[kind]>0)return false;
  g.powers[kind]--;g.effects[kind]=POWERS[kind].duration;g.onSound('event');
  g.announce(`${POWERS[kind].name} · ${POWERS[kind].description}`,2.5);
  if(kind==='bomb') {
    g.shake=12;g.onVibrate(55);g.burst(g.aim.x,g.aim.y,'#ffd9a0',70);
    for(const f of g.fish.items)if(f.alive&&distance(f.x,f.y,g.aim.x,g.aim.y)<GAME.bombRadius+FISH[f.kind].size)g.damage(f,GAME.bombDamage,f.x,f.y+20);
  }
  return true;
}
