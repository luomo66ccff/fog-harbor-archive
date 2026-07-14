# 雾港档案：失踪的第七码头

一款可在浏览器中完整游玩的沉浸式悬疑解谜游戏。玩家将进入一间被封存的港口调查室，通过档案、录音、监控照片、证据关系与时间线重建失踪案真相，并根据调查深度抵达不同结局。

**[立即进入雾港调查室](https://fog-harbor-archive.luomo.moe)**

![雾港档案：失踪的第七码头](public/og-fog-harbor.png)

## 2.0 调查体验

- 潮湿工业港口调查室：分层雨雾、玻璃水痕、远港灯光、真实纸张与设备材质
- 五阶段当前任务：直接定位目标窗口与标签，展示子进度、渐进提示和锁定原因
- 三套操作型核心谜题：双时间轴校准、录音信号锁定、3×2 照片复原与放大调查
- 可验证的证据墙：可信度判断、支持/矛盾关系与附带证据的五段责任链
- 动态案件时间：调查推进会将终端时间从 02:17 推至 03:07，并触发环境与通讯变化
- 完整移动端玩法：调查应用网格、带名称 Dock、全屏窗口、触控拼图、地图缩放和证据列表
- 兼容旧存档：继续使用 `fog-harbor-save-v1`，并为旧版已读关键证据提供迁移基础

## 游戏内容

- 11 个可操作调查模块，包含 21 条证据、9 份文档、6 段通讯与 3 份录音转写
- 4 个真实谜题：时间偏移、频率解码、碎片复原、证据链推演
- 7 名案件相关人物、11 个时间线节点、3 个正式结局与 1 条隐藏线索
- 本地存档、结局收藏、二周目文本、程序化环境音与完整静音控制
- 桌面和移动端布局、键盘操作、焦点管理、减少动态效果与高对比度适配

## 本地运行

需要 Node.js `>=22.13.0`。

```bash
npm install
npm run dev
```

开发服务器启动后，打开终端输出的本地地址即可进入游戏。

## 验证命令

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

`npm test` 会先执行生产构建，再检查关键页面内容、谜题数据、无渐变约束与损坏存档恢复逻辑。

## 技术栈

- Next.js App Router、React、TypeScript
- Tailwind CSS、Framer Motion、Lucide React
- Zustand 持久化状态管理
- Vinext 构建，以及 Next.js standalone + Docker Compose 生产运行
- Cloudflare Tunnel 私有源站接入

存档保存在浏览器 `localStorage` 的 `fog-harbor-save-v1` 键中；“重新开始”会保留已发现结局并进入下一轮调查。

## 私有服务器部署

服务器版本使用 `Dockerfile.server` 和 `compose.server.yaml`。应用容器只映射到主机 `127.0.0.1:8797`，`cloudflared` 容器通过同一 Compose 网络访问应用，公网不需要开放应用端口。

当前生产入口为 `https://fog-harbor-archive.luomo.moe`。

部署机需要 Docker 与 Docker Compose，并在未提交的 `.env.server` 中提供远程管理 Tunnel 的 `TUNNEL_TOKEN`：

```bash
docker compose -f compose.server.yaml --env-file .env.server up -d --build
curl --fail http://127.0.0.1:8797/
```

## 主要目录

- `app/`：页面入口、全局样式与错误状态
- `components/`：启动流程、调查桌面、窗口、谜题和声音组件
- `lib/`：案件资料、证据、谜题与结局规则
- `store/`：调查进度、存档校验与窗口状态
- `tests/`：生产构建和关键规则回归测试
- `public/`：图标与社交分享封面
