---
status: Active
owner: backend-platform
lastReviewedAt: 2026-08-17
---

# 架构总览

## 核心结论

这套模板采用：

> 业务 feature 垂直切片 + 受边界约束的 core 平台层 + 显式 application composition + 独立 db 基础设施层。

不建议继续沿用传统的 `routes / lib / middlewares / db` 横向分层。原因是中大型项目里横向目录会逐渐形成共享耦合中心，导致业务边界模糊、目录膨胀、代码难以移动和测试。

## 技术栈

| 分类 | 选型 | 级别 |
| --- | --- | --- |
| Runtime | Node.js 24 LTS | 强制 |
| Web Framework | Hono | 强制 |
| Language | TypeScript strict | 强制 |
| API 契约 | `@hono/zod-openapi` + Zod | 强制 |
| API 文档 | Scalar | 强制 |
| ORM | Drizzle | 强制 |
| Auth | Better Auth + Drizzle adapter | 强制 |
| Logging | LogLayer | 强制 |
| Testing | Vitest + Playwright Test + Testcontainers | 推荐 |
| OpenAPI 治理 | Redocly CLI + Spectral + OpenAPI Generator | 推荐 |
| 边界治理 | `eslint-plugin-boundaries` 或 `import/no-restricted-paths` | 推荐 |
| 可观测增强 | OpenTelemetry plugin | 可选 |

## 架构原则

### 1. 业务优先按 feature 组织

所有业务代码默认放在：

```txt
src/features/<feature>
```

而不是散落到全局 `routes/`、`services/`、`repositories/`、`schemas/` 目录。

### 2. core 必须保持无业务流程

`core/` 只放跨业务平台能力，例如：

- app factory
- OpenAPI helper
- response builder
- error mapper
- logger
- auth wrapper
- request id
- common HTTP middleware

`core/` 禁止 import `features/`。

具体 feature adapter、跨 feature 策略和宿主进程生命周期统一由 `src/app/` 装配。统一错误 registry 和 i18n 字典是应用协议目录的显式例外，但不能在 core 中实现业务流程。

### 3. db 只放数据库机械细节

`db/` 负责：

- Drizzle client
- schema
- migrations
- database test helper

`db/` 不承载业务规则。

### 4. 业务 API 统一走 OpenAPI 契约

所有业务 API 必须使用：

```ts
createRoute(...)
app.openapi(route, handler)
```

OpenAPI 不是附属品，而是 API contract 的源码真相。

### 5. Better Auth 保持原生边界

`/api/auth/*` 由 Better Auth 原生 handler 处理，不强制套业务响应 envelope。业务 API 再统一使用 envelope。

### 6. 错误和日志全链路带 requestId

`requestId` 必须贯穿：

- 请求上下文
- 响应头 `X-Request-Id`
- 响应体 `meta.requestId`
- 访问日志
- 错误日志

## Playwright E2E 边界

`apps/e2e` 是独立的验证 workspace，不属于 backend/frontend 生产运行时，也不向业务 feature 注入测试抽象。runner 在仓库外生成带隔离 production dependencies 的 backend release，再负责临时 PostgreSQL、compiled migration/seed、backend release server、Vite preview、认证状态和服务清理；测试只通过真实 HTTP 和浏览器行为验证跨层哨兵流程。这一边界同时防止后端 release 缺失依赖时向上借用 workspace 根 `node_modules`。

模板处于开发阶段时，E2E 只锁定认证、授权、Dashboard 和项目 CRUD 等高价值基线；新增业务 feature 应先补自身 unit/contract 测试，只有跨层回归风险明确时再增加 E2E 用例。浏览器失败产物保留在 `apps/e2e/test-results`，backend/Vite 日志保留在 `apps/e2e/service-logs`，不建立像素截图基线。

## Mermaid：请求生命周期

详见：

- [`docs/diagrams/request-lifecycle.mmd`](../diagrams/request-lifecycle.mmd)
