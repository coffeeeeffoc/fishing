import { GAME,FISH,WEAPONS,WEAPON_ORDER,EVENTS,POWER_ORDER,POWERS, type FishKind, type WeaponKind, type PowerKind, type EventKind } from './config.ts';
import { Pool,FishGrid,moveFish,fishSegmentHit,hitMultiplier,clamp,angleDelta,distance, type Fish, type Bullet, type Particle, type Coin, type Floater } from './systems.ts';
import { Encounters } from './encounters.ts';
import { autoAim,fireProjectiles,fireLaser,usePower } from './weapons.ts';
export type Sound = 'fire'|'hit'|'kill'|'coin'|'combo'|'weapon'|'boss'|'warning'|'event';
export type GameMode = 'start'|'playing'|'paused'|'result';
export interface GameSnapshot {
  mode:GameMode; time:number; score:number; coins:number; energy:number; combo:number; bestCombo:number; kills:number; bosses:number;
  weapon:WeaponKind; unlocked:WeaponKind[]; powers:Record<PowerKind,number>; effects:Record<PowerKind,number>; notice:string; event:EventKind|null; warning:boolean;
}
export class Game {
  mode:GameMode='start'; time=0; score=0; coins=0; energy:number=GAME.startingEnergy; combo=0; bestCombo=0; kills=0; bosses=0;
  weapon:WeaponKind='normal'; unlocked:WeaponKind[]=['normal'];
  powers:Record<PowerKind,number>={freeze:1,bomb:1,double:1,rapid:1,aim:1};
  effects:Record<PowerKind,number>={freeze:0,bomb:0,double:0,rapid:0,aim:0};
  event:EventKind|null=null; warning=false; notice=''; noticeTime=0;
  aim={x:600,y:260}; firing=false; cannonAngle=-Math.PI/2; recoil=0; shake=0; laserEnd={x:600,y:0}; laserActive=false;
  metrics={fps:0,frameMs:0,p95Ms:0,activeLoops:0,activeListeners:0};
  fish=new Pool<Fish>(GAME.maxFish,()=>({id:0,kind:'clown',x:0,y:0,prevX:0,prevY:0,baseY:0,angle:0,dir:1,hp:1,age:0,phase:0,hit:0,slow:0,inflated:false,invulnerable:false,alive:false,summoned:0}));
  bullets=new Pool<Bullet>(GAME.maxBullets,()=>({x:0,y:0,prevX:0,prevY:0,vx:0,vy:0,life:0,damage:0,kind:'normal',alive:false}));
  particles=new Pool<Particle>(GAME.maxParticles,()=>({x:0,y:0,vx:0,vy:0,life:0,maxLife:0,size:0,color:'',alive:false}));
  coinSprites=new Pool<Coin>(GAME.maxCoins,()=>({x:0,y:0,fromX:0,fromY:0,life:0,alive:false}));
  floaters:Floater[]=[]; grid=new FishGrid();
  onSound:(sound:Sound)=>void=()=>{}; onVibrate:(ms:number)=>void=()=>{};
  private encounters=new Encounters();
  protected cooldown=0; protected comboClock=0; protected nextId=0;
  rng:()=>number;
  constructor(rng:()=>number=Math.random) { this.rng=rng; }
  start(unlocked:WeaponKind[]=['normal']) {
    this.mode='playing'; this.time=0;this.score=0;this.coins=0;this.energy=GAME.startingEnergy;
    this.combo=0;this.bestCombo=0;this.kills=0;this.bosses=0;this.weapon='normal'; this.unlocked=[...unlocked];
    this.powers={freeze:1,bomb:1,double:1,rapid:1,aim:1}; this.effects={freeze:0,bomb:0,double:0,rapid:0,aim:0};
    this.fish.clear();this.bullets.clear();this.particles.clear();this.coinSprites.clear();this.floaters.length=0;
    this.cooldown=0;this.comboClock=0;this.shake=0;this.recoil=0;this.firing=false;this.laserActive=false;this.encounters.reset(this.rng);
    this.event=null;this.warning=false;this.notice='按住海面开火 · 拖动瞄准';this.noticeTime=6;
    for(let i=0;i<6;i++) this.spawn('clown',250+i*115,200+(i%3)*75);
  }
  pause() { if(this.mode==='playing') {this.mode='paused';this.firing=false;this.laserActive=false;} }
  resume() { if(this.mode==='paused') this.mode='playing'; }
  pressFire() {if(this.mode!=='playing')return;this.firing=true;if(this.weapon!=='laser'&&this.cooldown<=0)this.fire();}
  switchWeapon(kind:WeaponKind) {
    if(this.mode!=='playing'||!this.unlocked.includes(kind)) return false;
    this.weapon=kind;this.cooldown=0;this.onSound('weapon');return true;
  }
  spawn(kind:FishKind,x?:number,y?:number,phase?:number) {
    const f=this.fish.acquire();if(!f) return;
    const dir=this.rng()>.5?1:-1;
    Object.assign(f,{id:++this.nextId,kind,x:x??(dir===1?-65:GAME.width+65),y:y??(125+this.rng()*340),dir,
      hp:FISH[kind].hp,age:0,phase:phase??this.rng()*6,hit:0,slow:0,inflated:false,invulnerable:false,summoned:0,angle:dir===1?0:Math.PI});
    f.baseY=f.y;f.prevX=f.x;f.prevY=f.y; return f;
  }
  update(delta:number) {
    if(this.mode!=='playing'||!Number.isFinite(delta)||delta<=0) return;
    let remaining=Math.min(delta,.1);
    while(remaining>1e-7&&this.mode==='playing') { const dt=Math.min(remaining,GAME.maxStep);this.step(dt);remaining-=dt; }
  }
  protected step(dt:number) {
    this.time=Math.min(GAME.duration,this.time+dt); if(this.time>=GAME.duration) {this.mode='result';this.firing=false;this.laserActive=false;return;}
    this.cooldown=Math.max(0,this.cooldown-dt); this.comboClock-=dt;if(this.comboClock<=0)this.combo=0;
    this.noticeTime=Math.max(0,this.noticeTime-dt);if(this.noticeTime===0)this.notice='';
    this.recoil=Math.max(0,this.recoil-dt*5);this.shake=Math.max(0,this.shake-GAME.shakeDecay*dt);
    for(const key of Object.keys(this.effects) as PowerKind[]) this.effects[key]=Math.max(0,this.effects[key]-dt);
    this.encounters.update(this,dt);
    for(const f of this.fish.items) if(f.alive) moveFish(f,dt,this.effects.freeze>0);
    this.grid.rebuild(this.fish.items);
    autoAim(this);this.cannonAngle+=angleDelta(this.cannonAngle,Math.atan2(this.aim.y-605,this.aim.x-600))*Math.min(1,dt*18);
    this.laserActive=false;
    if(this.firing){if(this.weapon==='laser')fireLaser(this,dt);else if(this.cooldown<=0)this.fire();}
    for(const b of this.bullets.items) if(b.alive) {
      b.prevX=b.x;b.prevY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
      let target:Fish|undefined;let nearest=2;
      for(const f of this.grid.query(b.prevX,b.prevY,b.x,b.y)) if(f.alive) {
        const t=fishSegmentHit(f,b.prevX,b.prevY,b.x,b.y);
        if(t!==null&&t<nearest) {nearest=t;target=f;}
      }
      if(target) {
        if(b.kind==='freeze')for(const f of this.fish.items)if(f.alive&&distance(f.x,f.y,target.x,target.y)<GAME.freezeRadius)f.slow=GAME.freezeHitDuration;
        this.damage(target,b.damage,b.prevX+(b.x-b.prevX)*nearest,b.prevY+(b.y-b.prevY)*nearest);b.alive=false;
      }
      if(b.life<=0||b.y< -40||b.x< -40||b.x>GAME.width+40) b.alive=false;
    }
    this.updateEffects(dt);
  }
  protected fire() {
    this.cooldown=fireProjectiles(this);
  }
  damage(f:Fish,damage:number,x:number,y:number) {
    if(!f.alive)return;
    const multiplier=hitMultiplier(f,x,y);
    if(!multiplier) {this.burst(x,y,'#d0a8ff',3);return;}
    f.hp-=damage*multiplier;f.hit=.14;if(f.kind==='puffer')f.inflated=true;
    if(f.kind==='shark') {
      const localX=(x-f.x)*Math.cos(f.angle)+(y-f.y)*Math.sin(f.angle);
      if(localX<-45)f.slow=GAME.bossSlowDuration;
      if(multiplier>1&&this.rng()<.12)this.floatText(x,y,'弱点 ×2.5','#ffd78d');
    }
    this.burst(x,y,'#dcfff4',3);this.onSound('hit');
    if(f.hp<=0) this.kill(f);
  }
  protected kill(f:Fish) {
    f.alive=false;this.kills++;this.combo++;this.comboClock=GAME.comboWindow;this.bestCombo=Math.max(this.bestCombo,this.combo);
    const gain=Math.round(FISH[f.kind].reward*Math.min(GAME.comboGoldCap,1+this.combo*GAME.comboGoldStep)*(this.effects.double>0?2:1)*(this.event&&!this.warning?EVENTS[this.event].rewardMultiplier:1));
    this.coins+=gain;this.score+=gain;this.energy=clamp(this.energy+GAME.baseEnergy+this.combo*GAME.comboEnergyStep,0,GAME.energyMax);
    if(f.kind==='shark'){this.bosses++;this.shake=15;this.onVibrate(120);this.announce('深渊巨鲨已捕获！ +1600 基础金币',4);this.onSound('boss');}
    if(f.kind==='treasure'||this.rng()<GAME.dropChance){
      const reward=Math.floor(this.rng()*6);
      if(reward===5){this.energy=clamp(this.energy+GAME.energyDrop,0,GAME.energyMax);this.floatText(f.x,f.y-40,`能量 +${GAME.energyDrop}`,'#a2f3da');}
      else {const kind=POWER_ORDER[reward];this.powers[kind]=Math.min(GAME.powerInventoryCap,this.powers[kind]+1);this.floatText(f.x,f.y-40,`${POWERS[kind].name} +1`,'#a2f3da');}
    }
    this.burst(f.x,f.y,FISH[f.kind].color,f.kind==='shark'?60:16);this.floatText(f.x,f.y,`+${gain}`,'#ffe39a');
    for(let i=0;i<3;i++) {const c=this.coinSprites.acquire();if(c)Object.assign(c,{x:f.x,y:f.y,fromX:f.x+(this.rng()-.5)*60,fromY:f.y+(this.rng()-.5)*60,life:GAME.coinLife+i*.1});}
    this.onSound('kill');
    if(GAME.milestones.includes(this.combo as 10)) {this.shake=8;this.onSound('combo');this.onVibrate(35);this.floatText(600,210,`${this.combo} 连击！`,'#ffdc79');}
    WEAPON_ORDER.forEach((kind,i)=>{if(this.kills>=GAME.unlockKills[i]&&!this.unlocked.includes(kind)) {this.unlocked.push(kind);this.announce(`${WEAPONS[kind].name}已解锁 · ${WEAPONS[kind].description}`,4);}});
  }
  usePower(kind:PowerKind) { return usePower(this,kind); }
  announce(text:string,duration=3) {this.notice=text;this.noticeTime=duration;}
  floatText(x:number,y:number,text:string,color:string) {if(this.floaters.length<24)this.floaters.push({x,y,text,color,life:1.1});}
  burst(x:number,y:number,color:string,count:number) {
    for(let i=0;i<count;i++) {const p=this.particles.acquire();if(!p)break;const a=this.rng()*Math.PI*2,v=35+this.rng()*110;
      Object.assign(p,{x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.35+this.rng()*.4,maxLife:.75,size:2+this.rng()*4,color});}
  }
  protected updateEffects(dt:number) {
    for(const p of this.particles.items) if(p.alive){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=30*dt;if(p.life<=0)p.alive=false;}
    for(const c of this.coinSprites.items) if(c.alive){c.life-=dt;const t=clamp(1-c.life/GAME.coinLife,0,1);c.x=c.fromX+(80-c.fromX)*t*t;c.y=c.fromY+(45-c.fromY)*t*t-Math.sin(t*Math.PI)*80;if(c.life<=0){c.alive=false;this.onSound('coin');}}
    for(let i=this.floaters.length-1;i>=0;i--){const f=this.floaters[i];f.life-=dt;f.y-=25*dt;if(f.life<=0)this.floaters.splice(i,1);}
  }
  snapshot():GameSnapshot {return {mode:this.mode,time:this.time,score:this.score,coins:this.coins,energy:this.energy,combo:this.combo,bestCombo:this.bestCombo,kills:this.kills,bosses:this.bosses,weapon:this.weapon,unlocked:[...this.unlocked],powers:{...this.powers},effects:{...this.effects},notice:this.notice,event:this.event,warning:this.warning};}
}
