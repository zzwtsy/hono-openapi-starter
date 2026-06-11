---
status: Active
owner: backend-platform
lastReviewedAt: 2026-06-11
---

# Backend App

这是 workspace 中的 Hono 后端应用。当前已落地 Hono、TypeScript、`@hono/zod-openapi`、Scalar、LogLayer、统一响应 envelope、错误码和 requestId。

## 当前能力

- 默认端口：`3001`。
- 当前业务接口：`GET /api/health`。
- 开发环境 OpenAPI：`GET /openapi.json`。
- 开发环境 API Reference：`GET /reference`。
- 路由入口：`src/routes.generated.ts`，由 `scripts/generate-routes.ts` 根据 `src/features/*/index.ts` 生成。
- 日志：development 使用 pretty console，production 使用 `./logs/app-%DATE%.jsonl` 按天轮转。

## 环境变量

启动时会读取：

- `NODE_ENV=test` 时读取 `.env.test`。
- 其他环境读取 `.env`。

参考配置在 `.env.example`。当前启动校验要求：

| 变量 | 说明 |
| --- | --- |
| `NODE_ENV` | `development`、`test` 或 `production`，默认 `production`。 |
| `PORT` | 服务监听端口，默认 `3001`。 |
| `LOG_LEVEL` | 必填，支持 `fatal`、`error`、`warn`、`info`、`debug`、`trace`、`silent`。 |
| `LOG_MAX_FILES` | 日志文件保留数量，默认 `90`。 |
| `DATABASE_URL` | 必填。当前 env schema 已要求该变量，Drizzle runtime 尚未落地。 |
| `BETTER_AUTH_SECRET` | 必填，至少 32 位。当前 env schema 已要求该变量，Better Auth runtime 尚未落地。 |
| `BETTER_AUTH_URL` | 必填，认证服务对外访问地址。 |
| `BETTER_AUTH_TRUSTED_ORIGINS` | 可选，逗号分隔的可信来源。 |
| `DISABLE_SIGN_UP` | 默认 `true`。 |

## 常用命令

从仓库根目录运行：

```bash
pnpm --filter backend dev
pnpm --filter backend build
pnpm --filter backend start
pnpm --filter backend test
pnpm --filter backend typecheck
pnpm --filter backend gen:routes
```

在 `apps/backend` 目录内也可以运行对应脚本：

```bash
pnpm dev
pnpm build
pnpm start
pnpm test
pnpm typecheck
pnpm gen:routes
```

## 开发流程提示

- 新增 feature 后运行 `pnpm --filter backend gen:routes` 更新 `src/routes.generated.ts`。
- 新增业务 API 时使用 `createRoute(...)` 和 `router.openapi(route, handler)`，并通过 OpenAPI response helper 复用 envelope schema。
- 当前 `/openapi.json` 和 `/reference` 只在 `NODE_ENV=development` 时注册。
- Drizzle、Better Auth、完整 OpenAPI lint/validate CI、secure headers、CORS、body limit 和 readiness probe 属于待落地能力，不能按当前可用功能使用。
