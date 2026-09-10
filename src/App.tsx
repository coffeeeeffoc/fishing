import { useCallback,useEffect,useRef,useState } from 'react';
import { Game } from './game/engine.ts';
import { GameCanvas } from './components/GameCanvas.tsx';
import { WeaponIcon } from './components/Icons.tsx';
import { GAME,WEAPONS,WEAPON_ORDER,POWER_ORDER,POWERS,EVENTS,FISH,type FishKind } from './game/config.ts';
import { AudioManager } from './game/audio.ts';
import { loadSave,writeSave,finishVoyage } from './game/storage.ts';

export default function App(){
  const [game]=useState(()=>new Game());const [audio]=useState(()=>new AudioManager());
  const [s,setSnapshot]=useState(()=>game.snapshot());const [save,setSave]=useState(loadSave);const saveRef=useRef(save);
  const [settings,setSettings]=useState(false);const [guide,setGuide]=useState(false);const settled=useRef(false);const [storageOk,setStorageOk]=useState(true);
  const persist=useCallback((next:typeof save)=>{saveRef.current=next;setSave(next);setStorageOk(writeSave(next));},[]);
  const sync=useCallback(()=>{
    const snapshot=game.snapshot();setSnapshot(snapshot);
    if(snapshot.mode==='result'&&!settled.current){settled.current=true;persist(finishVoyage(saveRef.current,snapshot));audio.play('event');audio.suspend();}
    if(snapshot.mode==='paused')audio.suspend();
    if(snapshot.unlocked.some(w=>!saveRef.current.unlockedWeapons.includes(w)))persist({...saveRef.current,unlockedWeapons:[...new Set([...saveRef.current.unlockedWeapons,...snapshot.unlocked])]});
  },[game,persist,audio]);
  const gesture=useCallback(()=>audio.unlock(),[audio]);
  const start=()=>{audio.unlock();settled.current=false;game.start(saveRef.current.unlockedWeapons);setSettings(false);setGuide(false);sync();};
  const resume=()=>{audio.unlock();game.resume();sync();};
  useEffect(()=>{if(import.meta.env.DEV){const devWindow=window as Window & {__tidebreak?:Game};devWindow.__tidebreak=game;return()=>{delete devWindow.__tidebreak;};}},[game]);
  useEffect(()=>{audio.setEnabled(save.settings.sound);game.onSound=sound=>audio.play(sound);game.onVibrate=ms=>{if(save.settings.vibration&&typeof navigator.vibrate==='function')navigator.vibrate(ms);};},[game,audio,save.settings]);
  useEffect(()=>()=>audio.dispose(),[audio]);
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(e.repeat||e.target instanceof HTMLInputElement||settings||guide)return;
      if(e.code==='Space'&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();if(game.mode==='playing')game.pause();else if(game.mode==='paused'){audio.unlock();game.resume();}sync();}
      if(e.key==='Escape'&&game.mode==='playing'){game.pause();sync();}
      const i=Number(e.key)-1;if(i>=0&&i<4){audio.unlock();game.switchWeapon(WEAPON_ORDER[i]);sync();}
    };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[game,audio,sync,settings,guide]);
  const remaining=Math.max(0,Math.ceil(GAME.duration-s.time));const event=s.event?EVENTS[s.event]:null;
  return <main className="app"><div className="game-stage">
    <GameCanvas game={game} onFrame={sync} onGesture={gesture}/>
    <header className={`topbar ${s.mode==='start'?'homebar':''}`}>
      <div className="identity"><small><span className="brand-mark">≋</span> TIDEBREAK / 潮汐猎手</small>{s.mode==='start'?<strong className="home-record">最高纪录 <span>{save.highScore.toLocaleString()}</span></strong>:<strong className="gold" data-testid="coins">◈ {s.coins.toLocaleString()}<span className="score-label">航行金币</span></strong>}</div>
      {s.mode!=='start'&&<div className={`timer ${remaining<=10?'urgent':''}`}><small>{s.time>=150?'FINAL RUSH':'本次航行'}</small><strong data-testid="timer">{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</strong><div className="voyage-line"><i style={{width:`${(1-s.time/GAME.duration)*100}%`}}/></div></div>}
      <div className="topright">{s.mode!=='start'&&<div className={`combo ${s.combo>=10?'hot':''}`} key={Math.floor(s.combo/10)}><small>COMBO</small><strong>×{s.combo}</strong><span>{s.combo>1?`${Math.min(GAME.comboGoldCap,1+s.combo*GAME.comboGoldStep).toFixed(1)} 倍金币`:'连续捕获加成'}</span></div>}
        {s.mode==='playing'?<button className="icon-button" onClick={()=>{game.pause();sync();}} aria-label="暂停">Ⅱ</button>:s.mode==='start'?<button className="icon-button" onClick={()=>setSettings(true)} aria-label="设置">⚙</button>:null}
      </div>
    </header>
    {s.mode==='start'&&<div className="overlay start"><div className="intro"><span className="eyebrow"><i/> AN UNDERWATER ARCADE</span><h1>潮汐<span>猎手</span><em>TIDEBREAK</em></h1><p>潜入蔚蓝。追逐鱼潮。满载而归。</p><button className="primary" onClick={start}>开始航行 <span>↗</span></button><div className="hint">按住开火 · 拖动瞄准 · 180 秒深海冒险</div><button className="text-button" onClick={()=>setGuide(true)}>海域手册 <span>↗</span></button></div><div className="voyage"><span>01 / THE REEF</span><h2>每一道海流，<br/>都是新的机遇。</h2><p>寻找黄金鱼<br/>积蓄能量，迎战深渊巨鲨</p><div className="seal">180<small>SECONDS</small></div></div><footer className="start-footer"><span>FREE TO EXPLORE / 无需联网 · 无内购</span><span>八种海洋生物 · 四种战术武器</span></footer></div>}
    {s.mode==='playing'&&<>
      {event&&<div className={`event-banner ${s.warning?'warning':''} ${s.event==='shark'?'danger':''}`}><i/>{s.warning?'即将发生 / ':''}{event.en}<span>{event.name}</span></div>}
      <div className={`notice ${event?'with-event':''}`} role="status">{s.notice}</div>
      {s.time<9&&<div className="onboarding"><span>⌖</span><p>按住鱼群，开火！<small>手指移动，炮台跟随</small></p></div>}
      <div className="active-effects">{POWER_ORDER.filter(k=>s.effects[k]>0).map(k=><span key={k}>{POWERS[k].icon} {POWERS[k].name} <b>{Math.ceil(s.effects[k])}s</b></span>)}</div>
      {remaining<=10&&<div className="countdown" key={remaining}>{remaining}</div>}
      <div className="bottom">
        <div className="weapons">{WEAPON_ORDER.map((w,i)=><button key={w} className={s.weapon===w?'selected':''} disabled={!s.unlocked.includes(w)} aria-label={`${WEAPONS[w].name}${s.unlocked.includes(w)?'':`，捕获 ${GAME.unlockKills[i]} 条解锁`}`} aria-pressed={s.weapon===w} title={WEAPONS[w].description} onClick={()=>{gesture();game.switchWeapon(w);sync();}}><WeaponIcon kind={w}/><span>{WEAPONS[w].short}</span><small>{s.unlocked.includes(w)?(w==='normal'?'免费':w==='laser'?'30 / 秒':`${WEAPONS[w].energyCost} 能量`):`${GAME.unlockKills[i]} 条解锁`}</small></button>)}</div>
        <div className={`energy ${s.energy<15?'low':''}`}><span>ENERGY <b>{Math.floor(s.energy)}</b></span><meter aria-label="武器能量" min="0" max="100" value={s.energy}/></div>
        <div className="powers">{POWER_ORDER.map(k=><button key={k} disabled={s.powers[k]<=0||s.effects[k]>0} aria-label={`${POWERS[k].name}，剩余 ${s.powers[k]}`} title={POWERS[k].description} onClick={()=>{gesture();game.usePower(k);sync();}}><span className="power-symbol">{POWERS[k].icon}</span><b>{s.powers[k]}</b><small>{POWERS[k].name.slice(k==='freeze'||k==='bomb'?2:0,k==='freeze'||k==='bomb'?4:2)}</small></button>)}</div>
      </div>
      <div className="weapon-caption">{WEAPONS[s.weapon].description}</div>
    </>}
    {s.mode==='paused'&&!settings&&!guide&&<div className="overlay modal"><section><span className="eyebrow">TAKE A BREATH</span><h2>海流，等你回来。</h2><p>剩余 {Math.floor(remaining/60)} 分 {remaining%60} 秒 · 已捕获 {s.kills} 条</p><button className="primary" onClick={resume}>继续航行 →</button><div className="modal-actions"><button onClick={()=>setSettings(true)}>设置</button><button onClick={()=>setGuide(true)}>海域手册</button><button onClick={start}>重新开始</button></div></section></div>}
    {s.mode==='result'&&!settings&&<div className="overlay modal result"><section><span className="eyebrow">VOYAGE COMPLETE / 本次航行结束</span><h2>{s.bosses?'深海征服者':s.bestCombo>=20?'鱼潮领航员':'满载而归'}</h2><div className="result-score"><small>本次得分</small><strong>{s.score.toLocaleString()}</strong><span>{s.score>=save.highScore&&s.score>0?'✦ 新航行纪录':'每一段航行，都有新的收获'}</span></div><div className="result-stats"><div><b>{s.kills}</b><small>捕获鱼类</small></div><div><b>×{s.bestCombo}</b><small>最佳连击</small></div><div><b>{s.bosses}</b><small>巨鲨捕获</small></div></div><p className="bank">航海金库 ◈ {save.totalCoins.toLocaleString()} · 共 {save.statistics.gamesPlayed} 次航行</p><button className="primary" onClick={start}>再次出海 <span>↗</span></button><button className="text-button" onClick={()=>{game.mode='start';sync();}}>返回港口</button></section></div>}
    {settings&&<div className="overlay modal sheet" role="dialog" aria-modal="true" aria-label="航行设置"><section><span className="eyebrow">YOUR VOYAGE, YOUR WAY</span><h2>航行设置</h2><label>声音<small>合成街机音效</small><input aria-label="声音" type="checkbox" checked={save.settings.sound} onChange={e=>{gesture();persist({...save,settings:{...save.settings,sound:e.target.checked}});}}/></label><label>震动<small>设备支持时提供触觉反馈</small><input aria-label="震动" type="checkbox" checked={save.settings.vibration} onChange={e=>persist({...save,settings:{...save.settings,vibration:e.target.checked}})}/></label><p>累计捕获 {save.statistics.fishKilled} 条 · 最佳连击 ×{save.statistics.highestCombo}</p><button className="primary" autoFocus onClick={()=>setSettings(false)}>完成 →</button></section></div>}
    {guide&&<div className="overlay modal sheet guide" role="dialog" aria-modal="true" aria-label="海域手册"><section><div className="guide-heading"><div><span className="eyebrow">FIELD NOTES</span><h2>海域手册</h2></div><button autoFocus onClick={()=>setGuide(false)}>关闭 ×</button></div><p>按住射击、拖动瞄准。2 秒内连续捕获可延续 Combo；金币倍率最高 2.5 倍。普通炮回能，特殊武器消耗能量。瞄准后使用炸弹。</p><div className="fish-guide">{(Object.keys(FISH) as FishKind[]).map(k=><div key={k}><i style={{background:FISH[k].color}}/><b>{FISH[k].name}</b><span>{FISH[k].tip}</span></div>)}</div><p className="guide-note">巨鲨半血狂暴并召唤鱼群。冰冻或击尾阻止冲刺扣能量。道具持续时间显示在海面上方。首局捕获 3 / 8 / 12 条鱼解锁全部武器。</p></section></div>}
    {import.meta.env.DEV&&s.mode==='playing'&&<output className="debug" aria-label="开发性能统计">{game.metrics.fps} FPS · {game.metrics.frameMs.toFixed(1)} ms · F {game.fish.count()} / B {game.bullets.count()} / P {game.particles.count()}</output>}
    {!storageOk&&<div className="storage-warning" role="status">浏览器限制了存档，本次进度暂存在内存中。</div>}
    <div className="rotate"><span>↻</span><h2>横过来，海更宽。</h2><p>请旋转手机，横屏开启航行</p><small>潮汐猎手 / TIDEBREAK</small></div>
  </div></main>;
}
