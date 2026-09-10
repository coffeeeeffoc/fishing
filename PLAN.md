# 开发计划

## Current Phase
Phase 10：完成。

## Completed
- Phase 0：空仓库检查、React/TypeScript/Vite、设计与工程文档、实际安装。
- Phase 1：真实 Canvas 射击、鱼 HP/捕获/奖励、触控、基础 HUD，独立提交与运行。
- Phase 2：八种鱼、不同运动/装甲/无敌、群游、空间网格和扫掠碰撞。
- Phase 3：命中/死亡/金币、炮台/弹道/粒子、Combo/震屏/合成音效。
- Phase 4：四武器与能量，特殊武器不足时退回普通炮。
- Phase 5–6：五事件、两秒预警、完整节奏、多机制巨鲨。
- Phase 7：初局解锁、本地存档、统计、完整结果与重开。
- Phase 8：移动安全区、Pointer Capture、取消/后台/转屏暂停、设置与手册。
- Phase 9：压力构造、绘制合批/缓存、DPR 自适应、池硬上限、低频 UI 与静态暂停画面。
- Phase 10：两次完整互动航行、一次生产 180 秒流程；14 个逻辑测试、3 个战术模拟、19 个跨浏览器场景与静态子目录测试。
- 修复试玩发现的过密鱼群、连击无限回能、快速点击、窄鱼体碰撞、计时、Boss 提示、快速重开渲染缓存等问题。

## In Progress
- 无。最终生产构建与本地验证通过，阶段提交已完成。

## Known Issues / 验证范围
- 未进行物理 iPhone / Android 真机测试，不能承诺所有手机持续达到 60 FPS。
- Windows WebKit 在 DPR 3 软件合成时存在明显环境开销；功能兼容记录与 DPR 1 性能记录分开，见 TEST_REPORT.md。
- 不支持 Web Audio / Vibration 或禁止 LocalStorage 的环境会自动降级，存档失败会提示。

## Next Tasks
- 本次开发无待完成核心机制。真实设备发布验证需要实际设备；没有为此保留影响游玩的 TODO。

详细验收、截图生成方式、数值和客观限制见 TEST_REPORT.md。
