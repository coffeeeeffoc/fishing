import { EVENTS,FISH,GAME,type EventKind,type FishKind } from './config.ts';
import type { Game } from './engine.ts';

export class Encounters {
  private index=0;private until=0;private nextSpawn=.8;private queue:EventKind[]=[];private pending:EventKind|null=null;private final=false;
  reset(random:()=>number) {
    this.index=0;this.until=0;this.nextSpawn=.8;this.pending=null;this.final=false;
    const choices:EventKind[]=['rush','golden','treasure','frenzy'];
    for(let i=choices.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
    this.queue=[choices[0],choices[1],'shark',choices[2],choices[3],'shark'];
  }
  update(g:Game,dt:number) {
    if(g.time>=150&&!this.final){this.final=true;g.announce('终极鱼潮 · 最后 30 秒！',3);g.onSound('event');}
    if(g.event&&!g.warning&&g.time>=this.until)g.event=null;
    const scheduled=GAME.eventTimes[this.index];
    if(scheduled!==undefined&&g.time>=scheduled-GAME.eventWarning&&!this.pending) {
      this.pending=this.queue[this.index];g.event=this.pending;g.warning=true;g.onSound('warning');
      g.announce(EVENTS[this.pending].tip,GAME.eventWarning);
    }
    if(this.pending&&g.time>=scheduled){this.activate(g,this.pending);this.pending=null;this.index++;}
    this.nextSpawn-=dt;
    if(this.nextSpawn<=0) {
      const multiplier=g.event&&!g.warning?EVENTS[g.event].spawnMultiplier:1;
      this.nextSpawn=(g.time<30?GAME.baseSpawn:g.time<90?GAME.midSpawn:g.time<150?GAME.peakSpawn:GAME.finalSpawn)/multiplier;
      const kind=this.pick(g);
      if(kind==='clown'&&(g.rng()<GAME.waveChance||g.event==='rush'))this.school(g,GAME.waveMin+Math.floor(g.rng()*GAME.waveExtra));else g.spawn(kind);
    }
    for(const f of g.fish.items)if(f.alive&&f.kind==='shark') {
      const wave=Math.floor(f.age/GAME.bossSummonPeriod);
      if(wave>f.summoned){f.summoned=wave;this.school(g,GAME.bossSummonCount,f.x,f.y+70);g.floatText(f.x,f.y-95,'召唤鱼群','#f5c893');}
      const dashStart=GAME.bossDashPeriod-GAME.bossDashDuration;
      if(f.age%GAME.bossDashPeriod>=dashStart&&(f.age-dt)%GAME.bossDashPeriod<dashStart){
        g.announce('巨鲨冲击！能量 -12 · 冰冻或击尾可抵挡',2);g.onSound('boss');
        if(f.slow<=0&&g.effects.freeze<=0){g.energy=Math.max(0,g.energy-GAME.bossDashDrain);g.shake=9;g.onVibrate(45);}
        else g.floatText(f.x,f.y-70,'成功压制冲刺','#a7f0e6');
      }
    }
  }
  activate(g:Game,event:EventKind) {
    if(event==='shark'&&g.fish.items.some(f=>f.alive&&f.kind==='shark'))event='frenzy';
    g.event=event;g.warning=false;this.until=g.time+EVENTS[event].duration;g.onSound(event==='shark'?'boss':'event');g.announce(EVENTS[event].tip,4);
    if(event==='shark'){g.spawn('shark',170,250);g.shake=10;g.onVibrate(80);}
    if(event==='rush')this.school(g,GAME.rushCount);
    if(event==='golden')for(let i=0;i<GAME.goldenEventCount;i++)g.spawn('golden',undefined,150+i*65);
    if(event==='treasure')for(let i=0;i<GAME.treasureEventCount;i++)g.spawn('treasure',undefined,160+i*70);
  }
  private pick(g:Game):FishKind {
    if(g.time<18)return 'clown';
    if(g.time<30)return g.rng()<.8?'clown':'puffer';
    if(!g.warning){
      if(g.event==='rush')return 'clown';
      if(g.event==='golden'&&g.rng()<GAME.goldenEventChance)return 'golden';
      if(g.event==='treasure'&&g.rng()<GAME.treasureEventChance)return 'treasure';
    }
    let roll=g.rng()*100;
    for(const kind of Object.keys(FISH) as FishKind[]) {roll-=FISH[kind].spawnRate;if(roll<0)return kind;}
    return 'clown';
  }
  school(g:Game,count:number,x?:number,y?:number) {
    const dir=g.rng()>.5?1:-1,baseY=y??(135+g.rng()*310),phase=g.rng()*6,start=x??(dir===1?-70:1270);
    for(let i=0;i<count;i++){const f=g.spawn('clown',start-dir*Math.floor(i/2)*55,baseY+(i%2)*37,phase);if(f){f.dir=dir;f.angle=dir===1?0:Math.PI;}}
  }
}
