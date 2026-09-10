export type FishKind = 'clown' | 'puffer' | 'sword' | 'jelly' | 'turtle' | 'treasure' | 'golden' | 'shark';
export type WeaponKind = 'normal' | 'scatter' | 'laser' | 'freeze';
export type PowerKind = 'freeze' | 'bomb' | 'double' | 'rapid' | 'aim';
export type EventKind = 'rush' | 'golden' | 'treasure' | 'shark' | 'frenzy';
export const GAME = {
  width: 1200, height: 675, duration: 180, maxStep: 1 / 60,
  maxFish: 100, maxBullets: 180, maxParticles: 280, maxCoins: 75,
  gridSize: 100, energyMax: 100, startingEnergy: 65,
  comboWindow: 2, comboGoldStep: .06, comboGoldCap: 2.5, comboEnergyStep: .12,
  milestones: [10, 20, 30, 50], baseEnergy: 2.2,
  baseSpawn: 1.05, midSpawn: .7, peakSpawn: .5, finalSpawn: .28,
  eventTimes: [34, 64, 96, 126, 153, 168], eventWarning: 2,
  unlockKills: [0, 3, 8, 12], dropChance: .07,
  freezeSlow: .22, freezeHitDuration: 3, pufferArmor: .55, turtleArmor: .32, turtleRear: 1.7,
  bossWeakness: 2.5, bossTailSlow: .5, bossSlowDuration: 3.5, bossDashDrain: 12,
  bossDashPeriod: 8, bossDashDuration: 1.25, bossSummonPeriod: 12,
  bulletLife: 2.2, coinLife: .8, shakeDecay: 18,
  bombRadius:230, bombDamage:240, freezeRadius:95, energyDrop:35, powerInventoryCap:5,
  rapidMultiplier:2, autoAimRadius:260, bossRageThreshold:.5, bossRageSpeed:1.7, bossDashSpeed:3,
  bossSummonCount:7, waveChance:.55, waveMin:3, waveExtra:3, rushCount:12,
  goldenEventChance:.6, treasureEventChance:.55, goldenEventCount:5, treasureEventCount:4,
} as const;
export const BEHAVIOR={pufferSpeed:.6,pufferPausePeriod:5,pufferPauseDuration:1,pufferPauseSpeed:.08,swordPeriod:4,swordDashStart:3.1,swordDashSpeed:3.2,goldenAcceleration:6,goldenMaxAcceleration:1.2,turtleTurnAfter:4,jellyPeriod:5,jellyInvincibleStart:3.7,exitAge:35} as const;
export const FISH: Record<FishKind, { name: string; hp: number; speed: number; reward: number; size: number; spawnRate: number; behavior: string; color: string; tip: string }> = {
  clown: {name:'小丑鱼',hp:18,speed:100,reward:12,size:22,spawnRate:48,behavior:'school',color:'#ffad57',tip:'成群出没 · 散射收割'},
  puffer: {name:'河豚',hp:65,speed:62,reward:38,size:29,spawnRate:13,behavior:'pause',color:'#e9ce73',tip:'受击膨胀 · 防御提升'},
  sword: {name:'剑鱼',hp:50,speed:138,reward:48,size:35,spawnRate:12,behavior:'dash',color:'#67d3eb',tip:'高速冲刺 · 冰冻克制'},
  jelly: {name:'水母',hp:38,speed:54,reward:32,size:27,spawnRate:11,behavior:'wave',color:'#c3a6f5',tip:'亮环期间无敌 · 等待暗下'},
  turtle: {name:'海龟',hp:115,speed:48,reward:70,size:34,spawnRate:8,behavior:'turn',color:'#83c995',tip:'头部装甲 · 攻击尾侧'},
  treasure: {name:'宝箱鱼',hp:75,speed:74,reward:85,size:29,spawnRate:6,behavior:'curve',color:'#fdbe63',tip:'捕获必掉道具或能量'},
  golden: {name:'黄金鱼',hp:55,speed:155,reward:140,size:25,spawnRate:2,behavior:'accelerate',color:'#ffdd6e',tip:'转瞬即逝 · 高额奖励'},
  shark: {name:'深渊巨鲨',hp:2100,speed:75,reward:1600,size:87,spawnRate:0,behavior:'boss',color:'#82adcd',tip:'腹部 ×2.5 · 尾部减速 · 半血狂暴'},
};
export const WEAPONS: Record<WeaponKind, {name:string; short:string; damage:number; fireRate:number; energyCost:number; projectileSpeed:number; spread:number; pellets:number; color:string; description:string}> = {
  normal:{name:'脉冲炮',short:'脉冲',damage:22,fireRate:4.5,energyCost:0,projectileSpeed:850,spread:0,pellets:1,color:'#ffd77d',description:'免费 · 稳定点射'},
  scatter:{name:'散射炮',short:'散射',damage:15,fireRate:2.8,energyCost:4,projectileSpeed:770,spread:.125,pellets:5,color:'#ffb080',description:'5 发扇面 · 收割鱼群'},
  laser:{name:'聚能激光',short:'激光',damage:190,fireRate:30,energyCost:30,projectileSpeed:0,spread:0,pellets:0,color:'#9effe0',description:'持续光束 · 穿透弱点'},
  freeze:{name:'冰霜炮',short:'冰霜',damage:26,fireRate:3,energyCost:5,projectileSpeed:780,spread:0,pellets:1,color:'#9ee7ff',description:'范围减速 · 控制冲刺'},
};
export const EVENTS: Record<EventKind,{name:string;en:string;duration:number;spawnMultiplier:number;rewardMultiplier:number;tip:string}> = {
  rush:{name:'鱼群迁徙',en:'FISH RUSH',duration:15,spawnMultiplier:2.4,rewardMultiplier:1,tip:'成群小鱼接近，散射炮准备！'},
  golden:{name:'黄金潮汐',en:'GOLDEN TIDE',duration:14,spawnMultiplier:1.6,rewardMultiplier:1.5,tip:'黄金鱼现身，冰冻后集中火力'},
  treasure:{name:'宝藏航线',en:'TREASURE WAVE',duration:15,spawnMultiplier:1.8,rewardMultiplier:1,tip:'捕获宝箱鱼，补充道具与能量'},
  shark:{name:'巨鲨来袭',en:'SHARK APPROACHING',duration:25,spawnMultiplier:1.2,rewardMultiplier:1,tip:'攻击发光腹部！尾部命中可减速'},
  frenzy:{name:'狂热海流',en:'FRENZY',duration:15,spawnMultiplier:2,rewardMultiplier:1.2,tip:'双倍射速，鱼群密度提升'},
};
export const POWERS: Record<PowerKind,{name:string;icon:string;duration:number;description:string}> = {
  freeze:{name:'全场冻结',icon:'❄',duration:6,description:'全场减速 6 秒'},
  bomb:{name:'深水炸弹',icon:'✹',duration:.65,description:'瞄准点 230 范围 / 240 伤害'},
  double:{name:'双倍金币',icon:'×2',duration:12,description:'金币翻倍 12 秒'},
  rapid:{name:'急速装填',icon:'»',duration:8,description:'射速翻倍 8 秒'},
  aim:{name:'自动瞄准',icon:'⌖',duration:10,description:'自动吸附附近目标 10 秒'},
};
export const WEAPON_ORDER = Object.keys(WEAPONS) as WeaponKind[];
export const POWER_ORDER = Object.keys(POWERS) as PowerKind[];
