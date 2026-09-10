# 架构

- `src/game/config.ts`：鱼、武器、事件、奖励、性能上限。
- `src/game/engine.ts`：纯 TypeScript 游戏状态、时序与生命周期；不依赖 React / DOM。
- `src/game/systems.ts`：运动、空间网格、碰撞、对象池。
- `src/game/renderer.ts`：Canvas 场景、缓存鱼图、反馈、DPR 上限 2。
- `src/game/audio.ts`：用户手势解锁 Web Audio，合成音、节流、静音与释放。
- `src/game/storage.ts`：版本化校验、失败降级、局结算一次性记账。
- `src/components/GameCanvas.tsx`：RAF、Pointer、尺寸、可见性、清理。
- `src/App.tsx`：10 Hz HUD、开始/暂停/设置/结果界面。

单一 RAF 使用受限 delta，模拟内细分步长；暂停清空输入，恢复重置时钟。鱼与弹丸经过 uniform grid broad phase；弹丸使用扫掠线段防穿透。粒子、鱼、子弹均有硬上限并复用对象；静态背景和鱼插画离屏缓存。UI 与模拟使用相同状态快照，UI 不每帧渲染。
