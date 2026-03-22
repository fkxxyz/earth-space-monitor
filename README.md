# Earth Space Monitor

一个基于 **Bun + React + Vite** 的地球与太空环境监控项目，当前第一阶段聚焦地磁活动：

- 前端显示 **过去 7 天、每 3 小时** 的 Kp 折线图
- 鼠标悬停显示该时刻详细信息
- 后端定时轮询 NOAA SWPC Kp API
- 当最新 3 小时 Kp **达到 G1（Kp >= 5）** 时触发 webhook / 自定义脚本

## 项目路径

```bash
/run/media/fkxxyz/wsl/home/fkxxyz/pro/fkxxyz/earth-space-monitor
```

## 使用 Bun

安装依赖：

```bash
bun install
```

启动前端开发：

```bash
bun run dev
```

启动监控后端：

```bash
bun run server
```

运行测试：

```bash
bun run test
```

构建前端：

```bash
bun run build
```

## 后端监控机制

默认行为：

- 每 **3 小时** 检查一次 NOAA Kp API
- 只看**最新一笔 3 小时 Kp 数据**
- 当 `Kp >= 5` 时视为达到 **G1** 门槛
- 若该时间点尚未触发过，则执行 webhook / script
- 已触发过的同一时间点不会重复触发

监控状态保存在：

```bash
data/monitor-state.json
```

## 环境变量

### 服务配置

- `PORT`：后端端口，默认 `8787`
- `GEOMAG_POLL_INTERVAL_MS`：轮询间隔，默认 `10800000`（3小时）
- `GEOMAG_THRESHOLD_KP`：触发阈值，默认 `5`
- `GEOMAG_STATE_FILE`：状态文件路径，默认 `./data/monitor-state.json`

### webhook / script 触发配置

- `GEOMAG_WEBHOOK_URL`：达到 G1+ 时 POST 的 webhook URL
- `GEOMAG_SCRIPT_COMMAND`：达到 G1+ 时执行的 shell 命令

二者可同时配置。

## 触发 payload

无论 webhook 还是 script，核心 payload 都包含：

- `timestamp`
- `kp`
- `level`
- `aRunning`
- `stationCount`
- `taipeiTime`
- `source`
- `threshold`

### webhook

后端会以 `application/json` POST 到 `GEOMAG_WEBHOOK_URL`。

### script

若配置 `GEOMAG_SCRIPT_COMMAND`，会执行 shell 命令，并将 JSON payload 放在环境变量：

```bash
GEOMAG_ALERT_PAYLOAD
```

例如：

```bash
export GEOMAG_SCRIPT_COMMAND='python3 /path/to/handler.py'
```

脚本内部可读取：

```bash
$GEOMAG_ALERT_PAYLOAD
```

## API

### 获取前端图表原始数据

```bash
GET /api/kp
```

### 查看监控状态

```bash
GET /api/monitor/status
```

### 立即手动检查一次

```bash
GET /api/monitor/check-now
```

也可以直接用：

```bash
bun run check-now
```

## 推荐运行方式

终端 1：

```bash
bun run server
```

终端 2：

```bash
bun run dev
```

这样：

- 前端通过 Vite 开发服务器打开
- `/api/*` 会自动代理到 Bun 后端

## 注意事项

- 当前 `build` 只构建前端静态资源
- 后端通过 `bun run server` 直接运行 TypeScript
- 如果要部署到长期运行环境，建议配合 systemd / pm2 / supervisor
- 当前逻辑按“**最新一笔 3 小时 Kp**”判定，不追溯更早未触发的历史点

## 示例：达到 G1 时发 webhook 并执行脚本

```bash
export GEOMAG_WEBHOOK_URL='https://example.com/webhook'
export GEOMAG_SCRIPT_COMMAND='bash ./scripts/on-geomag-alert.sh'
bun run server
```

## 已完成功能

- [x] 7 天 Kp 折线图
- [x] 台北时间显示
- [x] 悬停交互 tooltip
- [x] Bun 运行时替代 npm
- [x] NOAA Kp 后端代理
- [x] 3 小时轮询监控
- [x] G1 阈值触发 webhook / script
- [x] 同一时间点防重复触发
