# Earth Space Monitor - Project Guidelines

## What This Project Does

Earth Space Monitor is a Bun-based monitoring application for Earth and space environment signals. The current implementation focuses on NOAA geomagnetic Kp data: it serves a React dashboard for the last 7 days of 3-hour Kp readings and runs a backend monitor that triggers webhook/script actions when the latest interval reaches a configured storm threshold.

## Architecture

**Tech Stack**
- Frontend: React 19 + Vite + TypeScript + Recharts
- Backend runtime: Bun
- Tests: Vitest + Testing Library

**Core Components**
- `src/App.tsx`: dashboard page; fetches chart data from `/api/kp` instead of calling NOAA directly
- `src/lib/geomag.ts`: Kp parsing, storm-level mapping, Taipei-time formatting, latest-point extraction
- `src/server/index.ts`: Bun HTTP server, API routes, periodic polling loop, static file serving for `dist/`
- `src/server/monitor.ts`: NOAA fetcher, threshold decision, webhook/script dispatch
- `src/server/state.ts`: persisted monitor state to avoid duplicate triggers for the same 3-hour interval

**Data Flow**
1. Backend fetches NOAA planetary K-index JSON.
2. Frontend reads `/api/kp` and renders the recent 56 points.
3. Monitor loop checks the latest point only.
4. When `kp >= GEOMAG_THRESHOLD_KP` and the timestamp has not already fired, the backend sends the webhook and/or runs the configured script.
5. Trigger state is stored in `data/monitor-state.json`.

## Project Structure

```text
src/
  App.tsx                 Frontend dashboard entry
  App.css                 Dashboard-specific styles
  lib/
    geomag.ts             Shared geomagnetic parsing/helpers
    geomag.test.ts        Helper tests
  server/
    index.ts              Bun server and scheduler
    monitor.ts            Monitoring and dispatch logic
    state.ts              Persistent monitor state
    monitor.test.ts       Backend monitoring tests
  test/setup.ts           Vitest DOM setup
README.md                 Runtime and configuration guide
```

Keep new data-source logic modular. If the project grows beyond geomagnetic monitoring, prefer adding provider-specific modules under `src/lib/` or `src/server/` instead of expanding `geomag.ts` into a catch-all file.

## Development Rules

### Runtime split
- Frontend development runs with `bun run dev`.
- Monitoring/API server runs separately with `bun run server`.
- Vite proxies `/api/*` to `http://localhost:8787`; if the backend port changes, update `vite.config.ts` together with deployment docs.

### Before finishing a change
Run the commands relevant to the files you touched:

```bash
bun run test
bun run build
```

### Monitoring behavior constraints
- The monitor intentionally evaluates only the newest 3-hour Kp point; do not silently change it to replay historical intervals.
- Duplicate suppression depends on `data/monitor-state.json`; preserve compatible state shape when editing monitor persistence.
- `dispatchWebhook()` currently supports both HTTP POST and shell execution; keep both paths working unless requirements explicitly remove one.

### Naming for future expansion
- Use Earth/space-neutral names for new top-level modules when the code is not geomagnetic-specific.
- Keep geomagnetic-specific code explicitly named `geomag` until it is actually generalized.
- Do not rename existing environment variables with `GEOMAG_` prefixes unless you also provide a migration path and update README/AGENTS together.

## Common Pitfalls

- `src/App.tsx` should call `/api/kp`, not the NOAA URL directly; direct browser calls would bypass the backend and break the unified deployment model.
- A passing frontend build does not validate the Bun server; backend behavior is mainly protected by `src/server/monitor.test.ts` and runtime probing.
- The latest point may still be below threshold even when the recent chart contains storm intervals; the trigger logic is based on the newest interval only.
- `bun run build` builds frontend assets only. It does not package or type-check the Bun server for deployment.

## Extension Guidance

When adding new monitored domains such as solar wind, flare alerts, earthquakes, or atmosphere-related feeds:

- Add a provider-specific parsing module instead of overloading `src/lib/geomag.ts`.
- Add a provider-specific monitor module if trigger logic differs from Kp threshold checks.
- Reuse `src/server/state.ts` only if the persisted state model remains simple and source-agnostic; otherwise split state files per monitor.
- Prefer new API routes such as `/api/solar-wind` or `/api/earthquakes` over extending `/api/kp` with mixed payloads.
- If one dashboard starts serving multiple signal types, introduce a shared domain model layer before spreading format logic across components.

## Deployment Notes

- Production serving assumes `dist/` exists and `bun run server` is the long-running process.
- The backend relies on Bun environment variables: `PORT`, `GEOMAG_POLL_INTERVAL_MS`, `GEOMAG_THRESHOLD_KP`, `GEOMAG_STATE_FILE`, `GEOMAG_WEBHOOK_URL`, and `GEOMAG_SCRIPT_COMMAND`.
- If you change alert payload fields, update both the webhook consumer expectations and the README examples in the same change.
