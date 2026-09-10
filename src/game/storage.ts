import { WEAPON_ORDER,type WeaponKind } from './config.ts';
import type { GameSnapshot } from './engine.ts';
export const STORAGE_KEY='tidebreak.save.v1';
export interface SaveData {version:1;highScore:number;totalCoins:number;settings:{sound:boolean;vibration:boolean};unlockedWeapons:WeaponKind[];statistics:{gamesPlayed:number;fishKilled:number;bossKilled:number;highestCombo:number;totalGold:number}}
export function freshSave():SaveData{return {version:1,highScore:0,totalCoins:0,settings:{sound:true,vibration:true},unlockedWeapons:['normal'],statistics:{gamesPlayed:0,fishKilled:0,bossKilled:0,highestCombo:0,totalGold:0}};}
function object(value:unknown):Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function number(value:unknown){return typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(1e12,Math.floor(value))):0;}
export function parseSave(raw:string|null):SaveData {
  if(!raw)return freshSave();
  try{
    const data=object(JSON.parse(raw));if(data.version!==1)return freshSave();const settings=object(data.settings),stats=object(data.statistics);
    return {version:1,highScore:number(data.highScore),totalCoins:number(data.totalCoins),settings:{sound:typeof settings.sound==='boolean'?settings.sound:true,vibration:typeof settings.vibration==='boolean'?settings.vibration:true},unlockedWeapons:WEAPON_ORDER.filter(w=>w==='normal'||(Array.isArray(data.unlockedWeapons)&&data.unlockedWeapons.includes(w))),statistics:{gamesPlayed:number(stats.gamesPlayed),fishKilled:number(stats.fishKilled),bossKilled:number(stats.bossKilled),highestCombo:number(stats.highestCombo),totalGold:number(stats.totalGold)}};
  }catch{return freshSave();}
}
export function loadSave(){try{return parseSave(localStorage.getItem(STORAGE_KEY));}catch{return freshSave();}}
export function writeSave(save:SaveData){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(save));return true;}catch{return false;}}
export function finishVoyage(save:SaveData,result:GameSnapshot):SaveData {
  if(result.mode!=='result')return save;
  return {...save,highScore:Math.max(save.highScore,result.score),totalCoins:save.totalCoins+result.coins,unlockedWeapons:[...new Set([...save.unlockedWeapons,...result.unlocked])],statistics:{gamesPlayed:save.statistics.gamesPlayed+1,fishKilled:save.statistics.fishKilled+result.kills,bossKilled:save.statistics.bossKilled+result.bosses,highestCombo:Math.max(save.statistics.highestCombo,result.bestCombo),totalGold:save.statistics.totalGold+result.coins}};
}
