import { FISH, GAME, BEHAVIOR, type FishKind, type WeaponKind } from './config.ts';
export interface Fish {
  id:number; kind:FishKind; x:number; y:number; prevX:number; prevY:number; baseY:number; angle:number; dir:number;
  hp:number; age:number; phase:number; hit:number; slow:number; inflated:boolean; invulnerable:boolean; alive:boolean; summoned:number;
}
export interface Bullet { x:number; y:number; prevX:number; prevY:number; vx:number; vy:number; life:number; damage:number; kind:WeaponKind; alive:boolean }
export interface Particle { x:number; y:number; vx:number; vy:number; life:number; maxLife:number; size:number; color:string; alive:boolean }
export interface Coin { x:number; y:number; fromX:number; fromY:number; life:number; alive:boolean }
export interface Floater { x:number; y:number; text:string; color:string; life:number }
export const clamp = (v:number,min:number,max:number) => Math.max(min,Math.min(max,v));
export const distance = (ax:number,ay:number,bx:number,by:number) => Math.hypot(ax-bx,ay-by);
export const angleDelta = (a:number,b:number) => Math.atan2(Math.sin(b-a),Math.cos(b-a));

export class Pool<T extends {alive:boolean}> {
  items:T[] = [];
  private factory:()=>T;
  private limit:number;
  constructor(limit:number,factory:()=>T) { this.limit=limit; this.factory=factory; }
  acquire():T | undefined {
    const available=this.items.find(v=>!v.alive);
    if(available) { available.alive=true; return available; }
    if(this.items.length>=this.limit) return;
    const item=this.factory(); item.alive=true; this.items.push(item); return item;
  }
  clear() { for(const item of this.items) item.alive=false; }
  count() { let n=0; for(const item of this.items) if(item.alive) n++; return n; }
}

// Preallocated fixed grid: fish occupy every cell their circle overlaps.
export class FishGrid {
  private columns=Math.ceil(GAME.width/GAME.gridSize)+2;
  private rows=Math.ceil(GAME.height/GAME.gridSize)+2;
  private cells:Fish[][]=Array.from({length:this.columns*this.rows},()=>[]);
  private found=new Set<Fish>();
  rebuild(fish:Fish[]) {
    for(const cell of this.cells) cell.length=0;
    for(const f of fish) if(f.alive) {
      const r=FISH[f.kind].size*(f.inflated?1.3:1)*(f.kind==='sword'?1.9:1.3);
      this.eachCell(f.x-r,f.y-r,f.x+r,f.y+r,cell=>cell.push(f));
    }
  }
  private eachCell(x1:number,y1:number,x2:number,y2:number,visit:(cell:Fish[])=>void) {
    const s=GAME.gridSize;
    for(let y=clamp(Math.floor(y1/s)+1,0,this.rows-1);y<=clamp(Math.floor(y2/s)+1,0,this.rows-1);y++)
      for(let x=clamp(Math.floor(x1/s)+1,0,this.columns-1);x<=clamp(Math.floor(x2/s)+1,0,this.columns-1);x++) visit(this.cells[y*this.columns+x]);
  }
  query(x1:number,y1:number,x2:number,y2:number) {
    this.found.clear();
    this.eachCell(Math.min(x1,x2)-7,Math.min(y1,y2)-7,Math.max(x1,x2)+7,Math.max(y1,y2)+7,c=>{ for(const f of c) this.found.add(f); });
    return this.found;
  }
}

export function segmentHit(ax:number,ay:number,bx:number,by:number,x:number,y:number,r:number):number | null {
  const dx=bx-ax,dy=by-ay,fx=ax-x,fy=ay-y;
  const a=dx*dx+dy*dy,c=fx*fx+fy*fy-r*r;
  if(c<=0) return 0;
  if(a===0) return null;
  const b=2*(fx*dx+fy*dy), disc=b*b-4*a*c;
  if(disc<0) return null;
  const t=(-b-Math.sqrt(disc))/(2*a);
  return t>=0&&t<=1?t:null;
}

export function moveFish(f:Fish,dt:number,freeze:boolean) {
  const spec=FISH[f.kind]; f.prevX=f.x; f.prevY=f.y; f.age+=dt;
  f.hit=Math.max(0,f.hit-dt); f.slow=Math.max(0,f.slow-dt);
  f.invulnerable=f.kind==='jelly'&&(f.age+f.phase)%BEHAVIOR.jellyPeriod>BEHAVIOR.jellyInvincibleStart;
  let speed=spec.speed*(freeze?GAME.freezeSlow:1)*(f.slow>0?(f.kind==='shark'?GAME.bossTailSlow:GAME.freezeSlow):1);
  if(f.inflated) speed*=BEHAVIOR.pufferSpeed;
  if(spec.behavior==='pause'&&(f.age+f.phase)%BEHAVIOR.pufferPausePeriod<BEHAVIOR.pufferPauseDuration) speed*=BEHAVIOR.pufferPauseSpeed;
  if(spec.behavior==='dash'&&(f.age+f.phase)%BEHAVIOR.swordPeriod>BEHAVIOR.swordDashStart) speed*=BEHAVIOR.swordDashSpeed;
  if(spec.behavior==='accelerate') speed*=1+Math.min(f.age/BEHAVIOR.goldenAcceleration,BEHAVIOR.goldenMaxAcceleration);
  if(spec.behavior==='turn') {
    if(f.age>BEHAVIOR.turtleTurnAfter&&f.phase<10) { f.dir*=-1; f.phase+=20; }
  }
  if(f.kind==='shark') {
    const rage=f.hp<spec.hp*GAME.bossRageThreshold;
    speed*=rage?GAME.bossRageSpeed:1;
    const dash=f.age%GAME.bossDashPeriod>GAME.bossDashPeriod-GAME.bossDashDuration;
    if(dash) speed*=GAME.bossDashSpeed;
    if(f.x<110) f.dir=1; if(f.x>GAME.width-110) f.dir=-1;
    f.y=230+Math.sin(f.age*.65)*100;
  } else {
    const frequency=spec.behavior==='wave'?2:.95;
    const amplitude=spec.behavior==='curve'?80:spec.behavior==='wave'?42:spec.behavior==='school'?16:23;
    f.y=clamp(f.baseY+Math.sin(f.age*frequency+f.phase)*amplitude,95,510);
  }
  f.x+=f.dir*speed*dt;
  const heading=Math.atan2(f.y-f.prevY,f.x-f.prevX);
  f.angle+=angleDelta(f.angle,heading)*Math.min(1,dt*9);
  if(f.kind!=='shark'&&(f.x< -170||f.x>GAME.width+170||f.age>BEHAVIOR.exitAge)) f.alive=false;
}

export function fishSegmentHit(f:Fish,ax:number,ay:number,bx:number,by:number) {
  const r=FISH[f.kind].size*(f.inflated?1.3:1),cos=Math.cos(f.angle),sin=Math.sin(f.angle);
  const rx=r*(f.kind==='sword'?1.7:1.3)+5,ry=r*(f.kind==='shark'?.42:f.kind==='sword'?.53:1)+5;
  return segmentHit(((ax-f.x)*cos+(ay-f.y)*sin)/rx,(-(ax-f.x)*sin+(ay-f.y)*cos)/ry,((bx-f.x)*cos+(by-f.y)*sin)/rx,(-(bx-f.x)*sin+(by-f.y)*cos)/ry,0,0,1);
}

export function hitMultiplier(f:Fish,x:number,y:number) {
  if(f.invulnerable) return 0;
  const dx=x-f.x,dy=y-f.y;
  const localX=dx*Math.cos(f.angle)+dy*Math.sin(f.angle);
  // Keep the visual belly facing down when swimming left as well as right.
  const localY=(-dx*Math.sin(f.angle)+dy*Math.cos(f.angle))*(Math.cos(f.angle)>=0?1:-1);
  if(f.kind==='puffer'&&f.inflated) return GAME.pufferArmor;
  if(f.kind==='turtle') return localX>0?GAME.turtleArmor:GAME.turtleRear;
  if(f.kind==='shark') return localY>12?GAME.bossWeakness:1;
  return 1;
}
