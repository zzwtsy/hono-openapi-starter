---
status: Active
owner: frontend
lastReviewedAt: 2026-07-15
---

# 前端测试规范

## 目标

前端测试与后端一致，作为模板一等产物：本地快速回路 + CI 门禁。当前以 **unit** 为主（纯逻辑 + 轻量组件）；MSW / E2E / 覆盖率硬门禁留后续。

## 栈

| 维度 | 选型 | 说明 |
| --- | --- | --- |
| 框架 | vitest 4（catalog 与后端同源） | `pnpm --filter frontend test` |
| DOM | happy-dom | 快于 jsdom；缺 API 时可单文件 `@vitest-environment jsdom` |
| 组件 | @testing-library/react + jest-dom | setup 内 `cleanup` |
| 网络 mock | （未装）MSW | 首批不测 fetch；后续 alova 集成再加 |

## 目录与约定

- 测试与源码同置：`src/**/*.{test,spec}.{ts,tsx}`
- 全局 setup：`src/test/setup.ts`（jest-dom matchers + RTL cleanup）
- 配置：`apps/frontend/vitest.config.ts`（`@` alias、happy-dom、`css: false`）
- **显式** `import { describe, it, expect } from "vitest"`（不强制 globals，与后端一致）
- 文案与后端一致：`describe`/`it`/注释用**中文**行为描述（`describe` 可用模块/符号名；eslint `test/prefer-lowercase-title` 对 describe 已 ignore）

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
| `components/Can.test.tsx` | 权限门渲染分支（`vi.mock` `useCan`） |

## 组件测试模式

- 尽量 mock 边界 hook（如 `useCan`），避免 RouterProvider 样板。
- 需要全局 Provider 时再抽 `src/test/utils.tsx` custom render（RTL 官方推荐，按需）。

## 不在当前范围

- 覆盖率 threshold / codecov
- Playwright e2e
- MSW + alova 缓存失效
- 全路由 beforeLoad 内存 router 集成（优先测 `requirePermission` 纯函数）

## 与后端

后端分层与 testcontainers 见 [testing-strategy](../backend/testing-strategy.md)。前后端均 vitest 4，但配置与 scripts **按 package 独立**，不共用 root vitest 聚合。
