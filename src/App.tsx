import { useCallback,useState } from 'react';
import { Game } from './game/engine.ts';
import { GameCanvas } from './components/GameCanvas.tsx';
import { GAME,WEAPONS,WEAPON_ORDER } from './game/config.ts';
const game=new Game();
export default function App(){
  const [s,setSnapshot]=useState(()=>game.snapshot());const sync=useCallback(()=>setSnapshot(game.snapshot()),[]);const gesture=useCallback(()=>{},[]);
  return <main className="app"><div className="game-stage"><GameCanvas game={game} onFrame={sync} onGesture={gesture}/>
    <div className="topbar"><div><small>TIDEBREAK / 潮汐猎手</small><strong className="gold">◈ {s.coins.toLocaleString()}</strong></div><div className="timer"><small>本次航行</small><strong>{Math.floor((GAME.duration-s.time)/60)}:{String(Math.ceil(GAME.duration-s.time)%60).padStart(2,'0')}</strong></div><div className="topright"><div><small>COMBO</small><strong>×{s.combo}</strong></div><button onClick={()=>{game.pause();sync();}} aria-label="暂停">Ⅱ</button></div></div>
    {s.mode==='start'&&<div className="overlay start"><div className="intro"><span className="eyebrow">AN UNDERWATER ARCADE</span><h1>潮汐<span>猎手</span><em>TIDEBREAK</em></h1><p>潜入蔚蓝。追逐鱼潮。满载而归。</p><button className="primary" onClick={()=>{game.start();sync();}}>开始航行 <span>↗</span></button><div className="hint">按住开火 · 拖动瞄准 · 180 秒深海冒险</div></div><div className="voyage"><span>01 / THE REEF</span><h2>每一道海流，<br/>都是新的机遇。</h2><p>寻找黄金鱼<br/>积蓄能量，迎战深渊巨鲨</p><div className="seal">180<small>SECONDS</small></div></div></div>}
    {s.mode==='playing'&&<><div className="notice">{s.notice}</div><div className="bottom"><div className="weapons">{WEAPON_ORDER.map((w,i)=><button key={w} className={s.weapon===w?'selected':''} disabled={!s.unlocked.includes(w)} onClick={()=>{game.switchWeapon(w);sync();}}>{i+1} · {WEAPONS[w].short}</button>)}</div><div className="energy"><span>能量 {Math.floor(s.energy)}</span><meter min="0" max="100" value={s.energy}/></div></div></>}
    {s.mode==='paused'&&<div className="overlay modal"><section><span className="eyebrow">TAKE A BREATH</span><h2>海流，等你回来。</h2><button className="primary" onClick={()=>{game.resume();sync();}}>继续航行 →</button></section></div>}
    {s.mode==='result'&&<div className="overlay modal"><section><span className="eyebrow">VOYAGE COMPLETE</span><h2>满载而归</h2><h1>{s.score}</h1><p>捕获 {s.kills} 条 · 最高连击 ×{s.bestCombo}</p><button className="primary" onClick={()=>{game.start(s.unlocked);sync();}}>再次出海 →</button></section></div>}
    <div className="rotate"><span>↻</span><h2>横过来，海更宽。</h2><p>请旋转手机，横屏开启航行</p></div>
  </div></main>;
}
