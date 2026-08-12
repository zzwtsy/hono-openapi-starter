# Backend

Hono API 应用，负责认证、组织与权限、项目、系统设置、操作日志，以及供前端消费的 OpenAPI 契约。

主要技术栈：Hono、TypeScript、Drizzle ORM、PostgreSQL、Better Auth、`@hono/zod-openapi`、LogLayer 和 Vitest。

> 除非特别说明，本文命令均从仓库根目录执行。全仓安装与启动说明见[根 README](../../README.md)。

## 快速开始

### 1. 创建环境配置

```sh
cp apps/backend/.env.example apps/backend/.env
```

本地开发至少需要确认：

- `DATABASE_URL`：可访问的 PostgreSQL 连接串；
- `BETTER_AUTH_SECRET`：长度至少 32 位的随机密钥；
- `BETTER_AUTH_URL`：默认是 `http://localhost:3001`；
- `BETTER_AUTH_TRUSTED_ORIGINS`、`CORS_ORIGINS`：默认允许本地前端 `http://localhost:5173`。

完整配置项及注释见 [.env.example](.env.example)。

### 2. 初始化开发数据库

```sh
pnpm --filter backend db:migrate
pnpm --filter backend db:seed
```

`db:seed` 仅用于非生产环境，会创建本地演示数据。生产首次初始化应使用 `db:bootstrap`，不要运行 seed。

### 3. 启动开发服务

```sh
pnpm --filter backend dev
```

默认监听 `http://localhost:3001`：

| 地址 | 用途 |
| --- | --- |
| `/healthz` | 存活检查，不访问数据库 |
| `/readyz` | 就绪检查 |
| `/openapi.json` | OpenAPI 文档，开发环境默认开放 |
| `/reference` | Scalar API Reference，仅开发环境挂载 |

生产环境默认不公开 OpenAPI；确需公开时显式设置 `OPENAPI_PUBLIC=true`。

## 目录边界

```txt
src/
├── index.ts                 # 进程入口
├── app.ts                   # 应用与路由装配
├── permissions-catalog.ts   # 全项目权限目录
├── core/                    # 跨业务基础设施
├── db/                      # Drizzle schema、migration 与数据库任务
└── features/                # 按业务垂直切片的 API
tests/
├── contract/                # OpenAPI 契约测试
├── integration/             # Testcontainers + PostgreSQL 集成测试
└── helpers/                 # 测试基础设施
```

核心约束：

- `features/<feature>` 内聚 route、handler、schema、service、权限和测试；
- `core/` 只放跨业务基础设施，不能依赖具体业务 feature；
- `db/` 负责数据库连接、schema、migration、seed 和 bootstrap，不承载业务规则；
- 简单 feature 可由 handler 直接访问数据库，中等 feature 使用 service；没有真实复杂度时不要提前引入 repository；
- `src/db/schema/auth-schema.ts` 由 Better Auth CLI 生成，不要手工修改。

完整目录事实见[后端目录结构](../../docs/architecture/backend/directory-structure.md)。

## API 开发工作流

新增或修改 API 时：

1. 在对应 feature 的 `schemas.ts` 定义 Zod 契约；
2. 在 `routes.ts` 使用 `createRoute(...)` 声明请求、响应和 OpenAPI 元数据；
3. 在 `handlers.ts` 读取已校验输入并调用 service；
4. 补充单元、路由或契约测试；
5. 启动后端并检查 `/openapi.json`；
6. 在仓库根目录运行 `pnpm --filter frontend gen:api`，同步前端生成客户端。

OpenAPI 是前后端接口契约的源码真相，不要在 Markdown 中另写一套完整 schema。详细规范见 [API 与 OpenAPI](../../docs/conventions/backend/api-openapi.md)。

## 数据库工作流

修改 Drizzle schema 后：

```sh
pnpm --filter backend db:generate
pnpm --filter backend db:migrate
pnpm --filter backend test:integration
```

提交前应人工检查生成的 migration SQL。涉及 schema、事务或 PostgreSQL 特有行为时必须补集成测试。

Better Auth schema 更新使用：

```sh
pnpm --filter backend auth:generate
```

该命令会更新生成文件，执行前先确认 Better Auth 配置和输出范围，执行后检查 diff。

## 测试与质量门禁

| 目标 | 命令 | 说明 |
| --- | --- | --- |
| lint | `pnpm --filter backend lint` | 仅检查后端 |
| lint 修复 | `pnpm --filter backend lint:fix` | 自动修复可修复问题 |
| 类型检查 | `pnpm --filter backend typecheck` | 不生成产物 |
| 单元测试 | `pnpm --filter backend test` | 默认日常测试 |
| 契约测试 | `pnpm --filter backend test:contract` | 验证 OpenAPI 契约 |
| 集成测试 | `pnpm --filter backend test:integration` | 需要 Docker daemon |
| 全部测试 | `pnpm --filter backend test:all` | 运行所有 Vitest project |
| 构建 | `pnpm --filter backend build` | 输出到 `dist/` |
| 生产启动 | `pnpm --filter backend start` | 运行已构建产物 |

## 数据库命令

| 目标 | 命令 |
| --- | --- |
| 生成 migration | `pnpm --filter backend db:generate` |
| 执行 migration | `pnpm --filter backend db:migrate` |
| 写入开发演示数据 | `pnpm --filter backend db:seed` |
| 首次部署管理员初始化 | `pnpm --filter backend db:bootstrap` |
| 打开 Drizzle Studio | `pnpm --filter backend db:studio` |

## 相关文档

- [后端目录结构](../../docs/architecture/backend/directory-structure.md)
- [后端请求生命周期](../../docs/architecture/backend/request-lifecycle.md)
- [后端开发流程](../../docs/conventions/backend/development-workflow.md)
- [数据库与 Drizzle](../../docs/conventions/backend/database-drizzle.md)
- [Better Auth](../../docs/conventions/backend/auth-better-auth.md)
- [授权规范](../../docs/conventions/backend/authorization.md)
- [测试策略](../../docs/conventions/backend/testing-strategy.md)
