---
status: Active
owner: backend-platform
lastReviewedAt: 2026-06-11
---

# Hono Backend Template Workspace

这是一个基于 pnpm workspace 的模板工程，当前包含后端 API、前端基础壳应用和配套工程文档。

## 当前组成

| 路径 | 说明 |
| --- | --- |
| `apps/backend` | Hono + TypeScript 后端应用，已接入 `@hono/zod-openapi`、Scalar、LogLayer、统一响应 envelope、错误码和 requestId。 |
| `apps/frontend` | React + Vite + TypeScript + Tailwind CSS + shadcn/ui 前端基础壳应用。 |
| `docs` | 模板架构、开发规范、ADR、图和验收清单。部分文档描述目标能力，落地前需要回到源码确认当前事实。 |

当前已实现的业务接口是 `GET /api/health`。开发环境下后端还会暴露 `/openapi.json` 和 `/reference`。

## 快速开始

```bash
pnpm install
```

后端：

```bash
pnpm --filter backend dev
pnpm --filter backend test
pnpm --filter backend typecheck
```

前端：

```bash
pnpm --filter frontend dev
pnpm --filter frontend build
pnpm --filter frontend typecheck
```

根目录当前只提供 ESLint 入口：

```bash
pnpm lint
pnpm lint:fix
```

后端默认监听端口是 `3001`。启动前需要根据 `apps/backend/.env.example` 准备 `apps/backend/.env`，其中 `BETTER_AUTH_SECRET` 当前必须填入至少 32 位字符串。

## 当前状态边界

- 已落地：Hono app factory、自动生成路由入口、health feature、统一响应 envelope、错误映射、requestId、LogLayer pretty/JSONL transport、日志脱敏、环境变量启动校验。
- 待落地或目标规范：Drizzle 数据库运行时、Better Auth 运行时、`/api/auth/*`、`/api/v1/me`、完整 OpenAPI lint/validate CI、secure headers、CORS allowlist、body limit、`/healthz`、`/readyz`。
- 文档中的 ADR 和 conventions 表示已接受的模板方向或协作规范；实现状态必须以当前源码、`package.json`、OpenAPI route definition 和测试为准。

## 文档入口

- [Agent 工作指南](AGENTS.md)
- [文档地图](docs/README.md)
- [后端应用说明](apps/backend/README.md)
- [前端应用说明](apps/frontend/README.md)
- [文档系统规范](docs/conventions/documentation-system.md)
- [ADR 索引](docs/adr/README.md)
- [架构总览](docs/architecture/overview.md)
- [最终目录结构](docs/architecture/directory-structure.md)
- [API 与 OpenAPI 规范](docs/conventions/api-openapi.md)
- [统一响应格式](docs/conventions/response-envelope.md)
- [错误码体系](docs/conventions/error-code-system.md)
- [Better Auth 集成](docs/conventions/auth-better-auth.md)
- [Drizzle 数据库规范](docs/conventions/database-drizzle.md)
- [LogLayer 日志规范](docs/conventions/logging-loglayer.md)
- [开发流程规范](docs/conventions/development-workflow.md)
- [测试策略](docs/conventions/testing-strategy.md)
- [CI/CD、安全与可观测性](docs/conventions/ci-cd-security-observability.md)

## 推荐阅读顺序

1. `AGENTS.md`
2. `docs/README.md`
3. `docs/architecture/overview.md`
4. `docs/architecture/directory-structure.md`
5. `docs/adr/README.md`
6. 与任务直接相关的 `docs/conventions/*.md`
7. 涉及 feature 时读 `docs/features/_template.md`
8. 涉及验收时读相关 `docs/checklists/*.md`
