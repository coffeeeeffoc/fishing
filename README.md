# 潮汐猎手 · TIDEBREAK

手机横屏 H5 捕鱼游戏。React + TypeScript + Vite + Canvas 2D，无后端，无外部美术或音频请求。

## 运行

需要 Node.js 22.18+（推荐 24）和 npm。

```sh
npm install
npm run dev
```

打开 http://localhost:43210 。手机与电脑同一 Wi-Fi 时访问终端显示的 Network 地址，横屏游玩。防火墙需允许该端口。

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

构建产物为 `dist/`，可部署到任意静态托管，支持子目录。无需账号、付费或服务端。

按住海面射击，拖动瞄准；切换底部武器，点击道具。单局 180 秒。空格暂停，1–4 切换武器。更多机制见 GAME_DESIGN.md。
