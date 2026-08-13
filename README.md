# Hono OpenAPI Starter

一套面向真实业务起步的 TypeScript 全栈模板：后端使用 Hono、Drizzle、Better Auth 和 `@hono/zod-openapi`，前端使用 React、TanStack Router、alova 和 Base UI（shadcn）。

它不只是一个能返回 `Hello World` 的脚手架。仓库已经打通认证、组织与权限、项目管理、审计日志、OpenAPI 契约、前端管理界面和测试基础设施，适合作为后台管理系统或内部业务平台的工程基线。

## 内置能力

| 领域 | 已提供的能力 |
| --- | --- |
| API | Hono + Zod 路由契约、统一响应 envelope、错误码、请求校验、Scalar API Reference |
| 认证 | Better Auth 邮箱密码登录、cookie / bearer session、个人资料与密码修改 |
| 授权 | 唯一系统根、分级管理子树、目标组织 PEP、全局角色、直接 allow / deny、组织范围继承与委派上限 |
| 数据 | PostgreSQL + Drizzle schema、migration、开发 seed、生产首次管理员 bootstrap |
| 前端 | React 19、TanStack Router / Form / Table、alova 请求层、OpenAPI 客户端生成、Base UI（shadcn） |
| 业务基线 | Dashboard、用户 / 角色 / 组织管理、项目管理、系统设置扩展点（当前无内置 key）、操作日志 |
| 工程治理 | feature 垂直切片、ESLint 边界约束、Vitest 单元 / 契约 / 集成测试、结构化日志与 requestId |

## 技术栈

| 后端 | 前端 | 工程 |
| --- | --- | --- |
| Node.js 24、Hono、TypeScript | React 19、Vite、TypeScript | pnpm workspace |
| `@hono/zod-openapi`、Zod、Scalar | TanStack Router / Form / Table | ESLint、Vitest |
| Drizzle ORM、PostgreSQL | alova、`@alova/wormhole` | Testcontainers |
| Better Auth、LogLayer | Tailwind CSS、Base UI（shadcn） | OpenAPI 驱动的类型生成 |

## 快速开始

### 1. 准备环境

- Node.js 24+
- pnpm 11.9.0（版本以根 `package.json` 的 `packageManager` 为准）
- 可访问的 PostgreSQL 实例
- Docker（仅运行后端集成测试时需要）

仓库当前不内置 PostgreSQL Compose；请先创建空数据库，并准备好连接串。

### 2. 安装依赖并创建本地配置

```sh
pnpm install

cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

至少修改 `apps/backend/.env` 中的：

- `DATABASE_URL`：本地 PostgreSQL 连接串；
- `BETTER_AUTH_SECRET`：长度至少 32 位的随机密钥；
- `BETTER_AUTH_URL`、`BETTER_AUTH_TRUSTED_ORIGINS`：端口或访问域名变化时同步调整。

前端开发环境默认通过 Vite proxy 访问 `http://localhost:3001`，因此 `VITE_API_BASE_URL` 可以留空。

### 3. 初始化开发数据库

```sh
pnpm --filter backend db:migrate
pnpm --filter backend db:seed
```

`db:seed` 只允许在非生产环境执行，会创建演示组织、项目和管理员：

```txt
邮箱：dev@example.com
密码：dev-password
```

这些凭据只用于本地开发，不应复用到部署环境。

### 4. 启动前后端

分别打开两个终端：

```sh
pnpm --filter backend dev
```

```sh
pnpm --filter frontend dev
```

启动后可访问：

| 地址 | 用途 |
| --- | --- |
| <http://localhost:5173> | 前端管理界面 |
| <http://localhost:3001/healthz> | 后端存活检查 |
| <http://localhost:3001/reference> | Scalar API Reference（仅开发环境） |
| <http://localhost:3001/openapi.json> | OpenAPI 文档（开发环境默认开放） |

## OpenAPI 到前端的契约链路

业务 API 在后端通过 `createRoute(...)` 和 `app.openapi(...)` 定义，OpenAPI 是接口契约的源码真相；前端使用 `@alova/wormhole` 读取该文档并生成类型安全的 API 定义。

```mermaid
flowchart LR
  Route[Hono route + Zod schema] --> Spec[OpenAPI document]
  Spec --> Generator[alova generator]
  Generator --> Client[Typed frontend API]
```

修改后端 API 后，先启动后端，再重新生成前端客户端：

```sh
pnpm --filter frontend gen:api
```

生成完成后应同时检查前端类型和调用方，避免只更新生成物而遗漏消费端变更。

## 常用命令

以下命令均从仓库根目录执行。

| 目标 | 命令 |
| --- | --- |
| 全仓 lint | `pnpm lint` |
| 前后端类型检查 | `pnpm typecheck` |
| 前后端单元测试 | `pnpm test` |
| 前后端构建 | `pnpm build` |
| 后端类型检查 | `pnpm --filter backend typecheck` |
| 后端单元测试 | `pnpm --filter backend test` |
| 后端集成测试 | `pnpm --filter backend test:integration` |
| 后端全部测试 | `pnpm --filter backend test:all` |
| 后端构建 | `pnpm --filter backend build` |
| 前端类型检查 | `pnpm --filter frontend typecheck` |
| 前端测试 | `pnpm --filter frontend test` |
| 前端构建 | `pnpm --filter frontend build` |
| 生成数据库 migration | `pnpm --filter backend db:generate` |
| 执行数据库 migration | `pnpm --filter backend db:migrate` |
| 打开 Drizzle Studio | `pnpm --filter backend db:studio` |

后端集成测试使用 Testcontainers，需要本机 Docker daemon 正常运行。日常开发默认先运行单元测试；涉及数据库 schema、事务或 PostgreSQL 行为时再补集成测试。

## 生产首次初始化

生产环境不要运行 `db:seed`。首次部署应在 `apps/backend/.env` 或部署平台中配置：

- `NODE_ENV=production`
- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `BOOTSTRAP_ROOT_ORG_ID`

然后按以下顺序执行：

```sh
pnpm --filter backend db:migrate
pnpm --filter backend db:bootstrap
pnpm --filter backend build
pnpm --filter backend start
```

`db:bootstrap` 用于创建唯一系统根和第一个 admin。业务 API 只能创建子组织，不提供第二个根或替换根的入口。成功后应从部署环境中移除 `BOOTSTRAP_ADMIN_PASSWORD`，后续用户与授权通过管理界面或 API 维护。

生产环境默认不公开 `/openapi.json`，`/reference` 也不会挂载；确需公开 OpenAPI 时显式设置 `OPENAPI_PUBLIC=true`。

## 项目结构

```txt
.
├── apps/
│   ├── backend/          # Hono API、数据库、认证授权与后端 feature
│   └── frontend/         # React 管理端、路由、页面与前端 feature
├── docs/
│   ├── architecture/     # 当前架构事实与边界
│   ├── conventions/      # 后端、前端和共享开发规范
│   ├── features/         # 已实现 feature 的设计与契约说明
│   ├── adr/              # 已接受的长期架构决策
│   └── checklists/       # 安全、可观测性、IAM 等验收清单
├── AGENTS.md             # 维护者与 coding agent 工作指南
├── pnpm-workspace.yaml   # workspace 与统一依赖版本目录
└── eslint.config.mjs     # 全仓 lint 与模块边界规则
```

前后端业务代码均优先按 `features/<feature>` 垂直切片组织。后端 `core/` 只承载跨业务基础设施，前端 `routes/` 只负责路由装配；不要把业务逻辑重新堆回全局横向目录。

## 文档导航

- [文档地图](docs/README.md)：按任务找到应该先读的架构、规范和 feature 文档；
- [架构总览](docs/architecture/overview.md)：理解垂直切片、core / db 边界和请求生命周期；
- [后端开发流程](docs/conventions/backend/development-workflow.md)：新增 API、schema、migration 与测试；
- [前端开发流程](docs/conventions/frontend/development-workflow.md)：新增页面、路由、请求与测试；
- [ADR 索引](docs/adr/README.md)：查看长期技术决策及其取舍；
- [安全验收清单](docs/checklists/security-checklist.md)：发布前检查认证、授权、输入、日志和配置；
- [Agent 工作指南](AGENTS.md)：仓库维护规则、质量门禁与禁止模式。

README 负责稳定的项目入口；更细的实现约束以 `docs/` 中对应文档和当前代码为准。文档与实现不一致时，应回到路由契约、schema、配置和测试核对事实，并同步修正文档。
