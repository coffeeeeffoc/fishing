# 潮汐猎手 · TIDEBREAK

一个完整的横屏手机 H5 捕鱼游戏：180 秒航行、八种生物、四种武器、能量与 Combo、五种道具、随机鱼潮、多机制巨鲨、解锁与本地存档。React + TypeScript + Vite + Canvas 2D，无后端、账号或内购。

## 从零启动

需要 Node.js 22.18+（推荐 24）与 npm。

```sh
npm install
npm run dev
```

电脑打开 http://localhost:43210 。手机与电脑连接同一 Wi-Fi，打开终端显示的局域网 Network 地址，旋转为横屏。允许 Windows 防火墙访问该端口。

## 操作

- 按住海面连续开火，拖动瞄准；轻点可单发，激光轻点有短脉冲。
- 普通炮免费；捕获 3 / 8 / 12 条鱼，解锁散射、激光、冰霜并永久保存。
- 2 秒内继续捕获维持 Combo。特殊武器消耗能量，能量不足自动切回普通炮。
- 冰霜克制高速鱼；散射清群；激光穿透并攻击巨鲨发光腹部；尾部攻击或冻结可抵挡巨鲨冲刺。
- 道具在右下角，炸弹作用于最后瞄准的位置。每局初始各 1 个，捕获宝箱鱼补充道具或能量。
- 空格 / Escape 暂停，数字 1–4 切换武器。页面切后台、失焦、转为竖屏会自动暂停，回来需手动继续。
- 设置与海域手册可从首页或暂停页打开。

## 验证

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

浏览器回归需要安装测试用浏览器，使用独立临时用户配置，不访问用户浏览器数据：

```sh
npx playwright install chromium webkit
# 保持 npm run dev 运行，再在另一个终端执行：
npm run test:browser
# 自动构建并启动临时静态服务器，验证 /reef/ 子目录与生产界面：
npm run test:static
```

测试截图和 JSON 报告写入 `artifacts/`（Git 忽略）。`TEST_URL` 可指定开发服务器，`TEST_BROWSER=chromium` 或 `webkit` 可限制回归浏览器。Windows PowerShell 使用 `$env:TEST_BROWSER='webkit'` 设置。

## 构建与部署

推送 `main` 后 GitHub Actions 自动测试、构建并发布到 [fishing Pages](https://coffeeeeffoc.github.io/fishing/)。PR 只验证构建。Pages Source 使用 GitHub Actions。

本游戏同时作为 `small-games/games/fishing` 的 Git submodule 集成。推送本仓库后，在 small-games 更新并提交子模块指针，再推送 `main`，即可更新统一大厅和后续 Android APK 内置资源；父仓库固定使用已提交的游戏版本。独立仓库使用 npm 与 `package-lock.json`，父工作区使用 pnpm 与根锁文件。

```sh
npm run build
npm run preview
```

预览地址 http://localhost:43211 。把 `dist/` 内容上传到任意静态网站目录即可；相对资源路径已通过 `/reef/` 子目录测试。加载完成后游戏不需要网络；尚未加载的页面仍需静态服务器提供资源，不使用 Service Worker。

## 参数与资料

- `src/game/config.ts`：集中调整鱼、武器、事件、经济、密度及性能上限。
- `GAME_DESIGN.md`：玩法参数、解锁、道具、Boss 和数值取舍。
- `ARCHITECTURE.md`：模拟、界面、渲染和生命周期边界。
- `TEST_REPORT.md`：验收矩阵、真实试玩记录、测试方式与限制。
- `PLAN.md` / `CHANGELOG.md`：阶段进度和迭代记录。

开发模式左下/右下显示 FPS、更新+绘制耗时、鱼/弹丸/粒子数。生产构建不显示诊断，也不暴露测试用游戏对象。

本地进度使用 `tidebreak.save.v1`，保存失败会提示并退回内存；清除浏览器网站数据会清除进度。震动、Web Audio 不可用时自动降级。已验证桌面 Chromium / WebKit 及移动视口；物理 iPhone / Android 的持续帧率与系统手势仍需要真机实测。
