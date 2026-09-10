import { FISH,GAME,WEAPONS,type FishKind } from './config.ts';
import { type Game } from './engine.ts';
import { clamp } from './systems.ts';

function ellipse(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string) {c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function path(c:CanvasRenderingContext2D,points:number[],color:string) {c.fillStyle=color;c.beginPath();c.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)c.lineTo(points[i],points[i+1]);c.closePath();c.fill();}

export function drawFishArt(c:CanvasRenderingContext2D,kind:FishKind) {
  const color=FISH[kind].color;
  c.lineJoin='round';c.lineCap='round';
  if(kind==='jelly') {
    for(let i=0;i<5;i++){c.strokeStyle=i%2?'#e2b6ec':'#8c84ca';c.lineWidth=3;c.beginPath();c.moveTo(-20+i*10,8);c.bezierCurveTo(-30+i*10,29,-10+i*10,24,-20+i*10,43);c.stroke();}
    c.fillStyle=color;c.beginPath();c.ellipse(0,0,28,25,0,Math.PI,Math.PI*2);c.lineTo(28,9);c.quadraticCurveTo(0,20,-28,9);c.fill();
    ellipse(c,-7,-10,10,4,'#eee0ff');ellipse(c,-9,4,2,3,'#524a82');ellipse(c,9,4,2,3,'#524a82');return;
  }
  if(kind==='turtle') {
    ellipse(c,-12,-22,15,8,'#83b899');ellipse(c,-12,22,15,8,'#83b899');ellipse(c,13,-20,11,8,'#b6d79b');ellipse(c,13,20,11,8,'#b6d79b');
    ellipse(c,30,0,15,11,'#b0d58e');ellipse(c,-2,0,29,26,'#3d806b');ellipse(c,-4,-2,23,21,'#83ad78');
    c.strokeStyle='#4e8d65';c.lineWidth=3;for(let i=0;i<6;i++){const a=i*Math.PI/3;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*24,Math.sin(a)*22);c.stroke();}
    ellipse(c,37,-4,3,3,'#163f42');return;
  }
  if(kind==='puffer') {
    for(let i=0;i<12;i++){const a=i*Math.PI/6;path(c,[Math.cos(a-.13)*25,Math.sin(a-.13)*25,Math.cos(a)*35,Math.sin(a)*35,Math.cos(a+.13)*25,Math.sin(a+.13)*25],'#cda659');}
    ellipse(c,0,0,27,26,color);ellipse(c,2,10,21,14,'#fff0b0');
    for(let i=0;i<7;i++)ellipse(c,-18+(i%4)*11,-14+Math.floor(i/4)*12,2,3,'#a8894a');
  } else {
    const shark=kind==='shark', sword=kind==='sword';const rx=shark?78:sword?35:29,ry=shark?31:sword?13:20;
    path(c,[-rx+8,0,-rx-24,-ry,-rx-17,0,-rx-24,ry],shark?'#527f9c':color);
    path(c,[-14,-ry+5,shark?-3:-6,-ry-(shark?29:15),22,-ry+8],shark?'#5d8fae':color);
    ellipse(c,0,0,rx,ry,color);ellipse(c,4,ry*.4,rx*.83,ry*.47,shark?'#c7ded9':kind==='golden'?'#fff1aa':'#ffe6b9');
    path(c,[-5,8,-18,ry+14,18,16],shark?'#527f9c':color);
    if(kind==='clown') {c.save();c.beginPath();c.ellipse(0,0,rx,ry,0,0,Math.PI*2);c.clip();c.fillStyle='#fff8df';c.fillRect(-18,-25,7,50);c.fillRect(4,-25,7,50);c.restore();}
    if(sword)path(c,[27,-5,67,-2,27,3],'#b9e5eb');
    if(kind==='treasure'){c.fillStyle='#80533d';c.fillRect(-19,-13,32,26);c.strokeStyle='#ffe6a0';c.lineWidth=3;c.strokeRect(-19,-13,32,26);c.fillStyle='#ffde79';c.fillRect(-8,-13,7,26);ellipse(c,-4,0,5,5,'#ffeec3');}
    if(kind==='golden'){path(c,[-14,-18,-18,-32,-7,-26,0,-38,7,-26,17,-30,12,-17],'#ffe5a1');}
    if(shark){c.strokeStyle='#3d6784';c.lineWidth=3;for(let i=0;i<3;i++){c.beginPath();c.moveTo(33+i*7,-9);c.lineTo(29+i*7,6);c.stroke();}path(c,[52,10,71,5,60,20],'#294958');path(c,[54,11,58,16,61,9,64,13,68,7],'#fff8da');}
  }
  const eye=kind==='shark'?58:kind==='sword'?24:18;
  ellipse(c,eye,-6,kind==='shark'?6:7,kind==='shark'?6:7,'#fff9df');ellipse(c,eye+2,-6,3.5,4,'#153c4d');ellipse(c,eye+3,-8,1.2,1.5,'#ffffff');
}

export class Renderer {
  private canvas:HTMLCanvasElement; private c:CanvasRenderingContext2D;
  private sprites=new Map<FishKind,HTMLCanvasElement>();
  private background:HTMLCanvasElement; private scale=1; private offsetX=0;private offsetY=0;
  constructor(canvas:HTMLCanvasElement) {
    this.canvas=canvas;this.c=canvas.getContext('2d',{alpha:false})!;
    for(const kind of Object.keys(FISH) as FishKind[]) {const art=document.createElement('canvas');art.width=240;art.height=180;const ctx=art.getContext('2d')!;ctx.translate(120,90);drawFishArt(ctx,kind);this.sprites.set(kind,art);}
    this.background=document.createElement('canvas');this.background.width=GAME.width;this.background.height=GAME.height;this.paintBackground();
  }
  resize(width:number,height:number,dpr:number) {
    dpr=Math.min(2,dpr||1);this.canvas.width=Math.round(width*dpr);this.canvas.height=Math.round(height*dpr);
    this.scale=Math.min(this.canvas.width/GAME.width,this.canvas.height/GAME.height);
    this.offsetX=(this.canvas.width-GAME.width*this.scale)/2;this.offsetY=(this.canvas.height-GAME.height*this.scale)/2;
  }
  point(clientX:number,clientY:number) {const r=this.canvas.getBoundingClientRect();return {x:clamp(((clientX-r.left)*this.canvas.width/r.width-this.offsetX)/this.scale,0,GAME.width),y:clamp(((clientY-r.top)*this.canvas.height/r.height-this.offsetY)/this.scale,85,565)};}
  private paintBackground() {
    const c=this.background.getContext('2d')!;const gradient=c.createLinearGradient(0,0,0,675);gradient.addColorStop(0,'#125565');gradient.addColorStop(.45,'#0b3e51');gradient.addColorStop(1,'#052838');c.fillStyle=gradient;c.fillRect(0,0,1200,675);
    // Static seabed and fine topographic contours are cached once.
    for(let k=0;k<9;k++){c.strokeStyle=`rgba(116,209,195,${.023+k*.002})`;c.lineWidth=1;c.beginPath();for(let x=0;x<=1200;x+=10){const y=170+k*62+Math.sin(x*.009+k)*22+Math.cos(x*.019)*6;if(x===0)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();}
    path(c,[0,520,110,510,200,551,330,536,430,580,540,557,710,579,865,532,1010,553,1110,505,1200,522,1200,675,0,675],'#082f3e');
    path(c,[0,580,150,560,300,605,460,591,600,620,790,593,980,610,1130,558,1200,574,1200,675,0,675],'#062735');
    for(const [x,y,size,color] of [[67,591,1,'#286569'],[1130,574,1.2,'#21595d'],[174,625,.7,'#307074'],[1030,636,.7,'#32616c']] as const) {
      c.save();c.translate(x,y);c.scale(size,size);c.strokeStyle=color;c.lineWidth=9;
      for(let i=0;i<4;i++){c.beginPath();c.moveTo(0,30);c.quadraticCurveTo((i-1.5)*18,-15,(i-1.5)*24,-40-i*10);c.stroke();}c.restore();
    }
    for(let i=0;i<45;i++)ellipse(c,(i*173)%1200,590+(i*31)%84,1+(i%3),1,'#285160');
  }
  render(game:Game,ambient:number) {
    const c=this.c;c.setTransform(1,0,0,1,0,0);c.fillStyle='#042431';c.fillRect(0,0,this.canvas.width,this.canvas.height);
    c.translate(this.offsetX,this.offsetY);c.scale(this.scale,this.scale);c.save();c.beginPath();c.rect(0,0,1200,675);c.clip();
    if(game.shake>0)c.translate(Math.sin(ambient*81)*game.shake,Math.cos(ambient*73)*game.shake*.5);
    c.drawImage(this.background,0,0);
    c.save();c.globalCompositeOperation='screen';
    for(let i=0;i<5;i++){const x=50+i*280+Math.sin(ambient*.13+i)*40;c.fillStyle='rgba(115,228,205,.025)';path(c,[x,0,x+80,0,x+270,580,x-140,580],c.fillStyle);}
    c.restore();
    for(let i=0;i<24;i++){const x=(i*137+Math.sin(ambient*.5+i)*9)%1200,y=675-((ambient*(8+i%4)+i*41)%720);c.strokeStyle='rgba(167,224,216,.18)';c.lineWidth=1;c.beginPath();c.arc(x,y,1.5+i%4,0,Math.PI*2);c.stroke();}
    if(game.mode==='start') {
      for(let i=0;i<13;i++){const kinds:FishKind[]=['clown','sword','turtle','golden','jelly'];this.drawFish(kinds[i%5],100+(i*193+ambient*(i%2?18:-13)+2400)%1100,150+(i*71)%340,Math.sin(ambient+i)*.08,1,0,false,false,ambient);}
    }
    for(const f of game.fish.items) if(f.alive) {
      this.drawFish(f.kind,f.x,f.y,f.angle,f.inflated?1.3:1,f.hit,f.invulnerable,f.slow>0||game.effects.freeze>0,f.age);
      if(f.hp<FISH[f.kind].hp&&f.kind!=='shark') {const w=FISH[f.kind].size*1.5;c.fillStyle='#082c3ddd';c.fillRect(f.x-w/2,f.y-FISH[f.kind].size-17,w,4);c.fillStyle='#b4ecb6';c.fillRect(f.x-w/2,f.y-FISH[f.kind].size-17,w*f.hp/FISH[f.kind].hp,4);}
      if(f.kind==='shark') {
        c.textAlign='center';c.font='bold 12px sans-serif';c.fillStyle=f.hp<FISH.shark.hp*.5?'#ff967a':'#b9e8ed';c.fillText(f.hp<FISH.shark.hp*.5?'狂暴 · 冲刺加速':'深渊巨鲨 · 腹部弱点',f.x,f.y-65);
        c.fillStyle='#173543';c.fillRect(f.x-90,f.y-56,180,6);c.fillStyle=f.hp<FISH.shark.hp*.5?'#ff977f':'#f4c77b';c.fillRect(f.x-90,f.y-56,180*f.hp/FISH.shark.hp,6);
      }
    }
    for(const b of game.bullets.items) if(b.alive) {c.strokeStyle=WEAPONS[b.kind].color;c.lineWidth=b.kind==='freeze'?7:4;c.lineCap='round';c.globalAlpha=.45;c.beginPath();c.moveTo(b.x-b.vx*.025,b.y-b.vy*.025);c.lineTo(b.x,b.y);c.stroke();c.globalAlpha=1;ellipse(c,b.x,b.y,4,4,'#fff3d0');}
    if(game.laserActive) {for(const [width,alpha] of [[18,.09],[8,.3],[3,1]]) {c.strokeStyle=`rgba(145,255,222,${alpha})`;c.lineWidth=width;c.beginPath();c.moveTo(600+Math.cos(game.cannonAngle)*50,605+Math.sin(game.cannonAngle)*50);c.lineTo(game.laserEnd.x,game.laserEnd.y);c.stroke();}}
    for(const p of game.particles.items)if(p.alive){c.globalAlpha=Math.max(0,p.life/p.maxLife);ellipse(c,p.x,p.y,p.size,p.size,p.color);}c.globalAlpha=1;
    for(const coin of game.coinSprites.items)if(coin.alive){ellipse(c,coin.x,coin.y,7,7,'#ffd57c');ellipse(c,coin.x,coin.y,4,4,'#c5913c');c.fillStyle='#ffe8aa';c.fillRect(coin.x-1,coin.y-3,2,6);}
    for(const f of game.floaters){c.globalAlpha=Math.min(1,f.life*2);c.textAlign='center';c.font=`800 ${f.text.includes('连击')?34:18}px sans-serif`;c.fillStyle=f.color;c.fillText(f.text,f.x,f.y);}c.globalAlpha=1;
    if(game.effects.freeze>0){c.fillStyle='#a0e8ff0d';c.fillRect(0,0,1200,675);}
    if(game.effects.bomb>0){c.strokeStyle='#ffe2a7';c.lineWidth=5;c.globalAlpha=game.effects.bomb/.65;c.beginPath();c.arc(game.aim.x,game.aim.y,(1-game.effects.bomb/.65)*230,0,Math.PI*2);c.stroke();c.globalAlpha=1;}
    this.drawCannon(game,ambient);
    if(game.mode==='playing') {c.strokeStyle=game.firing?'#ffdd91aa':'#a9dcd05a';c.lineWidth=1.5;c.beginPath();c.arc(game.aim.x,game.aim.y,13,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(game.aim.x-19,game.aim.y);c.lineTo(game.aim.x-8,game.aim.y);c.moveTo(game.aim.x+8,game.aim.y);c.lineTo(game.aim.x+19,game.aim.y);c.moveTo(game.aim.x,game.aim.y-19);c.lineTo(game.aim.x,game.aim.y-8);c.stroke();}
    c.restore();
  }
  private drawFish(kind:FishKind,x:number,y:number,angle:number,scale:number,hit:number,shield:boolean,slow:boolean,age:number) {
    const c=this.c;c.save();c.translate(x,y);
    if(kind==='jelly')angle=0;
    c.rotate(angle);if(Math.cos(angle)<0)c.scale(1,-1);c.scale(scale,scale*(1+Math.sin(age*9)*.025));
    if(kind==='golden'){ellipse(c,0,0,43,31,'#ffe5a011');}
    c.drawImage(this.sprites.get(kind)!,-120,-90);
    if(kind==='shark'){ellipse(c,4,20,32,7,`rgba(255,210,122,${.45+Math.sin(age*5)*.22})`);c.strokeStyle='#9fdbde';c.lineWidth=2;c.beginPath();c.arc(-73,0,12,0,Math.PI*2);c.stroke();}
    if(hit>0){c.globalAlpha=hit*2.5;ellipse(c,0,0,FISH[kind].size,FISH[kind].size*.7,'#fffdf1');c.globalAlpha=1;}
    if(shield||slow){c.strokeStyle=shield?'#ecd2ff':'#98e8ff';c.lineWidth=shield?4:2;c.beginPath();c.ellipse(0,0,FISH[kind].size+10,FISH[kind].size+7,0,0,Math.PI*2);c.stroke();}
    c.restore();
  }
  private drawCannon(game:Game,ambient:number) {
    const c=this.c;const color=WEAPONS[game.weapon].color;
    c.save();c.translate(600,605);ellipse(c,0,12,58,22,'#041e2bbb');
    c.strokeStyle='#60919055';c.lineWidth=1;c.beginPath();c.arc(0,0,57,Math.PI,Math.PI*2);c.stroke();
    ellipse(c,0,0,42,37,'#164859');ellipse(c,0,-2,33,30,'#53787a');ellipse(c,0,-4,27,24,'#123b4c');
    c.rotate(game.cannonAngle);c.translate(-game.recoil*5,0);c.fillStyle='#0a2836';c.fillRect(-10,-16,54,32);c.fillStyle='#587b7f';c.fillRect(0,-12,45,24);c.fillStyle=color;c.fillRect(10,-9,34,5);c.fillStyle='#263f48';c.fillRect(36,-16,13,32);c.fillStyle=color;c.fillRect(45,-10,4,20);
    if(game.recoil>.65){path(c,[50,-9,67+Math.sin(ambient*30)*6,0,50,9],color);}
    ellipse(c,-3,0,12,12,'#d9c28a');ellipse(c,-3,0,5,5,'#486264');c.restore();
  }
}
