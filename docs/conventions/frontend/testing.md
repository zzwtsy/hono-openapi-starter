---
status: Active
owner: frontend
lastReviewedAt: 2026-08-17
---

# 前端测试规范

## 目标

前端测试与后端一致，作为模板一等产物：本地快速回路 + CI 门禁。Vitest 负责纯逻辑、轻量组件和 MSW 网络集成；Playwright 负责真实浏览器、真实 build/preview 和临时数据库链路。模板在开发期只固化高价值哨兵流程，不把全部业务 CRUD 提前变成维护负担。

## 栈

| 维度 | 选型 | 说明 |
| --- | --- | --- |
| 框架 | vitest 4（catalog 与后端同源） | `pnpm --filter frontend test` |
| DOM | happy-dom | 快于 jsdom；缺 API 时可单文件 `@vitest-environment jsdom` |
| 组件 | @testing-library/react + jest-dom | setup 内 `cleanup` |
| 网络 mock | **MSW**（`msw/node`） | Vitest 官方推荐；`setupServer` 拦 fetch，应用代码无感 |
| 真实浏览器 | Playwright Test | 独立 `apps/e2e` workspace；Chromium 为 PR/main 门禁，定时补 Firefox/WebKit |
| 临时数据库 | `@testcontainers/postgresql` | E2E 每次运行创建隔离 PostgreSQL，执行 migration + development seed |

## 目录与约定

- 测试与源码同置：`src/**/*.{test,spec}.{ts,tsx}`
- 基础 setup：`src/test/setup.ts`（jest-dom + RTL cleanup）
- MSW：`src/test/msw/server.ts`、`src/test/msw/handlers.ts`（`okEnvelope` / `failEnvelope`）
- MSW setup：`src/test/msw/setup.ts`；只有使用 `server.use(...)` 的网络测试在文件顶部显式 `import "@/test/msw/setup"`
- 配置：`apps/frontend/vitest.config.ts`（`@` alias、happy-dom、`css: false`）
- **显式** `import { describe, it, expect } from "vitest"`（不强制 globals，与后端一致）
- 文案与后端一致：`describe`/`it`/注释用**中文**行为描述（`describe` 可用模块/符号名；eslint `test/prefer-lowercase-title` 对 describe 已 ignore）

## MSW 约定

- lifecycle（MSW setup 内，与 [Vitest Mocking Requests](https://vitest.dev/guide/mocking/requests.md) 一致）：
  - `beforeAll(() => server.listen({ onUnhandledRequest: "error" }))`
  - `afterEach(() => server.resetHandlers())`
  - `afterAll(() => server.close())`
- RTL `cleanup()` 由基础 setup 独立负责；非网络测试不启动 MSW。
- 默认 `handlers` 为空；各用例 `server.use(http.get/patch(...))` 注册，避免串扰。
- 路径用 `*/api/v1/...` 前缀，兼容 `baseURL === ""` 与绝对 URL。
- 业务响应走 **envelope**：`okEnvelope(data)` / `failEnvelope(message)`；alova `responded` 运行时剥 `data`。
- 用例间可 `await invalidateCache()`（alova）避免 GET 缓存串数据。
- 仅 mock 边界 hook（如 `useCan`），**真实** alova `Apis.*` 发请求。

## scripts

| 命令 | 作用 |
| --- | --- |
| `pnpm --filter frontend test` | 单次跑完全部 unit |
| `pnpm --filter frontend test:watch` | watch 模式 |
| `pnpm --filter e2e test:runner` | 运行 E2E runner 生命周期单测（无需 Docker/浏览器） |
| `pnpm test:e2e` | 构建后端/前端并运行完整 Playwright 项目（需 Docker 和浏览器） |
| `pnpm test:e2e -- --project=chromium` | 只运行 Chromium，适合本地快速验证 |

## Playwright E2E 基础设施

### 运行链路

E2E runner 位于 `apps/e2e`，不依赖开发者本地数据库：

1. 预检查 `3001`、`5173` 端口，避免误连接已有服务。
2. Testcontainers 启动临时 `postgres:16-alpine`。
3. 构建 backend/frontend，执行 migration 与 `db:seed`。
4. 启动 backend dist 和 Vite preview，同时等待服务响应与进程退出；服务在 ready 前退出时立即报告原始错误，不等待 120 秒超时。
5. 通过真实 API 准备 seed admin、独立 worker admin 和受限用户认证状态；setup 与各浏览器 project 使用不同 RFC 5737 测试 IP 作为限流 key。
6. 运行 Playwright，失败时在 `test-results` 保留 screenshot、trace、video，在 `service-logs` 保留 backend/Vite 日志；SIGINT/SIGTERM 通过同一个 `AbortSignal` 协作取消当前命令或 readiness，finally 统一等待服务日志 flush 并清理进程和容器。

### 首批哨兵范围

当前只验证跨层最有价值的模板基线：

- 未登录重定向、错误/正常登录和登出；
- Dashboard 可渲染；
- 管理员项目创建、编辑、删除；
- 无业务权限用户的空 Dashboard、403 页面和 API 403。

每个 Playwright worker 使用独立管理员账号，避免并行项目测试互相污染。浏览器发出的 HTTP 4xx/5xx 默认会让测试失败；确属用例目标的错误必须按 method、pathname、status 和次数显式登记，未命中或多出的响应同样失败。page error、Vite error overlay 和非 HTTP 状态类 console error 继续作为失败处理。

### 浏览器与 CI

本地可按需安装浏览器：

```sh
pnpm --filter e2e exec playwright install chromium
```

`.github/workflows/e2e.yml` 在 PR 和 main push 运行 Chromium；每周定时运行 Chromium、Firefox、WebKit。每个矩阵 job 在下载浏览器前先运行 E2E workspace typecheck 与 `test:runner`，再安装目标浏览器并执行真实 E2E，最后上传 `playwright-report`、`test-results` 和 `service-logs`。E2E workflow 与快速 unit workflow 分离，避免日常 `pnpm test` 被 Docker/浏览器启动成本拖慢。

CI frontend job 含 `pnpm --filter frontend test`（见 `.github/workflows/ci.yml`）。monorepo lint 仍由 backend job 的 `pnpm -w lint` 覆盖。

## 首批覆盖（高价值）

| 文件 | 锁定行为 |
| --- | --- |
| `lib/permissions.test.ts` | 权限谓词 undefined/持有/未持有 |
| `lib/safe-redirect.test.ts` | open-redirect 防御（`//`、外链、fallback） |
| `lib/require-permission.test.ts` | 无权限抛 `redirect` → `/403`（`isRedirect` + `options.to`） |
| `features/iam/lib/organization-tree.test.ts` | 树索引、缺父升根、环打断、路径、编辑排除后代 |
| `hooks/use-permissions.test.ts` | `usePermissions` 切片(undefined/正常) |
| `components/Can.test.tsx` | `<Can>` permission/anyOf/allOf + render-prop + fallback |
| `components/resource-actions.test.tsx` | `ResourceActions` 空返回 null/有项渲染/`variant`·`disabled`·`title` 透传 |
| `api/index.test.ts` | **MSW+alova**：envelope 剥离 / `success:false` 抛错 / 401 hard-nav |
| `features/settings/components/SettingsPage.test.tsx` | 空态占位断言（SettingsPage 简化为空态，PATCH body 覆盖待 settings feature 落地） |

## 组件测试模式

- 尽量 mock 边界 hook（如 `useCan`/`usePermissions` 经 `useRouteContext`），避免 RouterProvider 样板。
- 需要全局 Provider 时再抽 `src/test/utils.tsx` custom render（RTL 官方推荐，按需）。
- Base UI 控件：优先 `aria-*` / `data-*` 断言（例如 Switch 用 `aria-disabled` + `data-disabled`，非原生 `disabled` 属性）。

## 不在当前范围

- 覆盖率 threshold / codecov
- 全路由 beforeLoad 内存 router 集成（优先测 `requirePermission` 纯函数）
- OpenAPI lint 进 CI（明确不做）
- 全量 IAM CRUD、移动端 project 和像素级截图基线（模板仍在开发中，避免过早固化产品细节）

## 与后端

后端分层与 testcontainers 见 [testing-strategy](../backend/testing-strategy.md)。前后端均 vitest 4，但配置与 scripts **按 package 独立**，不共用 root vitest 聚合。
