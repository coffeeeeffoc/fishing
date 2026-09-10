import { useEffect,useRef } from 'react';
import { Game } from '../game/engine.ts';
import { Renderer } from '../game/renderer.ts';

export function GameCanvas({game,onFrame,onGesture}:{game:Game;onFrame:()=>void;onGesture:()=>void}) {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const canvas=ref.current!;const renderer=new Renderer(canvas);let frame=0,last=0,uiClock=0,pointer:number|null=null;
    let statsTime=0,statsFrames=0;const samples:number[]=[];game.metrics.activeLoops++;game.metrics.activeListeners+=8;
    const resize=()=>{const rect=canvas.getBoundingClientRect();renderer.resize(rect.width,rect.height,window.devicePixelRatio);};
    const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
    const down=(e:PointerEvent)=>{if(game.mode!=='playing'||pointer!==null)return;e.preventDefault();onGesture();pointer=e.pointerId;canvas.setPointerCapture(e.pointerId);game.aim=renderer.point(e.clientX,e.clientY);game.pressFire();};
    const move=(e:PointerEvent)=>{if(pointer!==null&&pointer!==e.pointerId)return;if(e.pointerType==='mouse'||pointer!==null)game.aim=renderer.point(e.clientX,e.clientY);};
    const up=(e:PointerEvent)=>{if(pointer===e.pointerId){pointer=null;game.firing=false;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}};
    const visibility=()=>{if(document.hidden){game.pause();pointer=null;onFrame();}last=0;};
    const blur=()=>{game.pause();pointer=null;onFrame();last=0;};
    const orientation=()=>{if(window.innerHeight>window.innerWidth){game.pause();pointer=null;onFrame();}last=0;};window.addEventListener('resize',orientation);
    const tick=(now:number)=>{
      const elapsed=last?(now-last)/1000:0,dt=Math.min(elapsed,.1),begin=performance.now();last=now;
      game.update(dt);renderer.render(game,now/1000);
      statsTime+=elapsed;statsFrames++;samples.push(performance.now()-begin);
      if(statsTime>=1){game.metrics.fps=Math.round(statsFrames/statsTime);game.metrics.frameMs=samples.reduce((a,b)=>a+b,0)/samples.length;samples.sort((a,b)=>a-b);game.metrics.p95Ms=samples[Math.floor(samples.length*.95)];statsTime=0;statsFrames=0;samples.length=0;}
      uiClock+=dt;if(uiClock>=.1){onFrame();uiClock=0;}frame=requestAnimationFrame(tick);
    };
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',blur);frame=requestAnimationFrame(tick);
    return()=>{cancelAnimationFrame(frame);observer.disconnect();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('lostpointercapture',up);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',blur);window.removeEventListener('resize',orientation);game.firing=false;game.metrics.activeLoops--;game.metrics.activeListeners-=8;};
  },[game,onFrame,onGesture]);
  return <canvas ref={ref} aria-label="捕鱼海域，按住射击并拖动瞄准" role="img"/>;
}
