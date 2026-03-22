# Earth Space Monitor - 项目指南

## 这个项目是做什么的

Earth Space Monitor 是一个基于 Bun 的地球与太空环境信号监控应用。当前实现聚焦于 NOAA 地磁 Kp 数据：它提供一个 React 仪表盘来展示过去 7 天、每 3 小时的 Kp 读数，并运行一个后端监控器，在最新时段达到已配置风暴阈值时触发 webhook / 脚本动作。

## 架构

**技术栈**
- 前端：React 19 + Vite + TypeScript + Recharts
- 后端运行时：Bun
- 测试：Vitest + Testing Library

**核心组件**
- `src/App.tsx`：仪表盘页面；从 `/api/kp` 获取图表数据，而不是直接调用 NOAA
- `src/lib/geomag.ts`：Kp 解析、风暴等级映射、台北时间格式化、最新点提取
- `src/server/index.ts`：Bun HTTP 服务、API 路由、定时轮询循环、`dist/` 静态文件服务
- `src/server/monitor.ts`：NOAA 获取、阈值判断、webhook / 脚本分发
- `src/server/state.ts`：持久化监控状态，避免同一个 3 小时时段重复触发

**数据流**
1. 后端获取 NOAA planetary K-index JSON。
2. 前端读取 `/api/kp` 并渲染最近 56 个点。
3. 监控循环只检查最新一个点。
4. 当 `kp >= GEOMAG_THRESHOLD_KP` 且该时间戳尚未触发时，后端发送 webhook 和/或执行脚本。
5. 触发状态保存在 `data/monitor-state.json` 中。

## 项目结构

```text
src/
  App.tsx                 前端仪表盘入口
  App.css                 仪表盘专用样式
  lib/
    geomag.ts             共享地磁解析/辅助函数
    geomag.test.ts        辅助函数测试
  server/
    index.ts              Bun 服务与调度器
    monitor.ts            监控与分发逻辑
    state.ts              持久化监控状态
    monitor.test.ts       后端监控测试
  test/setup.ts           Vitest DOM 初始化
README.md                 运行与配置说明
```

保持新数据源逻辑模块化。如果项目超出地磁监控范围，优先在 `src/lib/` 或 `src/server/` 下添加 provider 专属模块，而不是把 `geomag.ts` 扩展成一个无边界的大文件。

## 开发规则

### 运行时拆分
- 前端开发使用 `bun run dev`。
- 监控/API 服务单独通过 `bun run server` 运行。
- Vite 会把 `/api/*` 代理到 `http://localhost:8787`；如果后端端口变化，需要同时更新 `vite.config.ts` 和部署文档。

### 完成改动前
对你修改过的文件运行相关命令：

```bash
bun run test
bun run build
```

### 监控行为约束
- 监控器有意只评估最新一个 3 小时 Kp 点；不要静默改成回放更早历史时段。
- 去重依赖 `data/monitor-state.json`；修改监控持久化时请保持兼容的状态结构。
- `dispatchWebhook()` 当前同时支持 HTTP POST 和 shell 执行；除非需求明确删除，否则保持两条路径都可用。

### 面向未来扩展的命名
- 当代码不是地磁专属时，对新的顶层模块使用 Earth/space 中性命名。
- 在真正完成泛化之前，地磁专属代码继续明确命名为 `geomag`。
- 不要重命名现有 `GEOMAG_` 前缀环境变量，除非同时提供迁移路径，并在同一次改动中同步更新 README / AGENTS。

## 常见陷阱

- `src/App.tsx` 应该调用 `/api/kp`，不要直接请求 NOAA URL；浏览器直连会绕过后端，破坏统一部署模型。
- 前端构建通过并不代表 Bun 服务没问题；后端行为主要依赖 `src/server/monitor.test.ts` 和运行时探测来保护。
- 即使最近图表里有风暴时段，最新点仍可能低于阈值；触发逻辑只基于“最新时段”。
- `bun run build` 只构建前端资源，不会为部署打包或类型检查 Bun 服务。

## 扩展指引

当新增太阳风、耀斑警报、地震或大气相关数据源时：

- 添加 provider 专属解析模块，而不是继续把逻辑塞进 `src/lib/geomag.ts`。
- 如果触发逻辑和 Kp 阈值判断不同，就添加 provider 专属 monitor 模块。
- 只有在持久化状态模型仍然简单且与数据源无关时，才复用 `src/server/state.ts`；否则请为不同 monitor 拆分状态文件。
- 优先新增 `/api/solar-wind`、`/api/earthquakes` 这类 API 路由，而不是把混合 payload 塞进 `/api/kp`。
- 如果一个仪表盘开始承载多种信号类型，请先引入共享领域模型层，再扩展组件，而不是把格式化逻辑分散到各处。

## 部署说明

- 生产环境默认假设 `dist/` 已存在，并且 `bun run server` 是长期运行进程。
- 后端依赖这些 Bun 环境变量：`PORT`、`GEOMAG_POLL_INTERVAL_MS`、`GEOMAG_THRESHOLD_KP`、`GEOMAG_STATE_FILE`、`GEOMAG_WEBHOOK_URL`、`GEOMAG_SCRIPT_COMMAND`。
- 如果你修改了告警 payload 字段，请在同一次改动中同步更新 webhook 消费端预期和 README 示例。
