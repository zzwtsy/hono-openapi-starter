---
status: Active
owner: frontend
lastReviewedAt: 2026-07-15
---

# 前端测试规范

## 目标

前端测试与后端一致，作为模板一等产物：本地快速回路 + CI 门禁。当前以 **unit** 为主（纯逻辑 + 轻量组件 + MSW 网络集成示范）；E2E / 覆盖率硬门禁留后续。

## 栈

| 维度 | 选型 | 说明 |
| --- | --- | --- |
| 框架 | vitest 4（catalog 与后端同源） | `pnpm --filter frontend test` |
| DOM | happy-dom | 快于 jsdom；缺 API 时可单文件 `@vitest-environment jsdom` |
| 组件 | @testing-library/react + jest-dom | setup 内 `cleanup` |
| 网络 mock | **MSW**（`msw/node`） | Vitest 官方推荐；`setupServer` 拦 fetch，应用代码无感 |

## 目录与约定

- 测试与源码同置：`src/**/*.{test,spec}.{ts,tsx}`
- 全局 setup：`src/test/setup.ts`（jest-dom + RTL cleanup + **MSW lifecycle**）
- MSW：`src/test/msw/server.ts`、`src/test/msw/handlers.ts`（`okEnvelope` / `failEnvelope`）
- 配置：`apps/frontend/vitest.config.ts`（`@` alias、happy-dom、`css: false`）
- **显式** `import { describe, it, expect } from "vitest"`（不强制 globals，与后端一致）
- 文案与后端一致：`describe`/`it`/注释用**中文**行为描述（`describe` 可用模块/符号名；eslint `test/prefer-lowercase-title` 对 describe 已 ignore）

## MSW 约定

- lifecycle（setup 内，与 [Vitest Mocking Requests](https://vitest.dev/guide/mocking/requests.md) 一致）：
  - `beforeAll(() => server.listen({ onUnhandledRequest: "error" }))`
  - `afterEach(() => { server.resetHandlers(); cleanup(); })`
  - `afterAll(() => server.close())`
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

CI frontend job 含 `pnpm --filter frontend test`（见 `.github/workflows/ci.yml`）。monorepo lint 仍由 backend job 的 `pnpm -w lint` 覆盖。

## 首批覆盖（高价值）

| 文件 | 锁定行为 |
| --- | --- |
| `lib/permissions.test.ts` | 权限谓词 undefined/持有/未持有 |
| `lib/safe-redirect.test.ts` | open-redirect 防御（`//`、外链、fallback） |
| `lib/require-permission.test.ts` | 无权限抛 `redirect` → `/403`（`isRedirect` + `options.to`） |
| `features/iam/organization-tree.test.ts` | 树索引、缺父升根、环打断、路径、编辑排除后代 |
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
- Playwright e2e
- 全路由 beforeLoad 内存 router 集成（优先测 `requirePermission` 纯函数）
- OpenAPI lint 进 CI（明确不做）

## 与后端

后端分层与 testcontainers 见 [testing-strategy](../backend/testing-strategy.md)。前后端均 vitest 4，但配置与 scripts **按 package 独立**，不共用 root vitest 聚合。
