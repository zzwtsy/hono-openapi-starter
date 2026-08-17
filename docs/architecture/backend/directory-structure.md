---
status: Active
owner: backend-platform
lastReviewedAt: 2026-08-17
---

# 后端目录结构

> 本文档是当前架构事实，以 `apps/backend/src/` 实际文件为准；目录或依赖边界变化时必须随代码更新。
>
> 2026-08-11 复查：后端采用 feature 垂直切片、显式 application composition、独立 commands/config/catalogs 和受限 core/db。ESLint 对这些层级执行依赖门禁。

## 当前目录树

```txt
src/
  index.ts                         # 最薄进程入口，只启动 lifecycle 并收口启动失败

  app/                             # 应用组合与进程生命周期
    create-application.ts          # 创建 HTTP app；无 server/timer/signal 副作用
    export-openapi.ts              # 静态导出完整 OpenAPI JSON；不启动 server/DB
    register-features.ts           # 挂载各 feature router
    audit-policies.ts              # 注册审计名称、组织范围和资源可见性策略
    lifecycle.ts                   # catalog sync、serve、retention、signal 与 graceful shutdown

  catalogs/
    permissions.ts                 # 汇总 feature 权限定义并做覆盖/唯一性校验

  commands/                        # 独立运维命令入口
    migrate.ts
    seed-development.ts
    bootstrap-admin.ts

  config/
    env.ts                         # dotenv 加载与失败收口
    env-schema.ts                  # EnvSchema、校验和脱敏错误格式化

  core/                            # 跨业务平台能力，不依赖具体 feature
    app/                           # Hono/OpenAPI app factory 与全局中间件
    audit/                         # 审计写入、队列、resolver/visibility port、保留策略
    auth/                          # Better Auth 与认证中间件
    authorization/                 # PermissionChecker port、缓存、catalog sync
    errors/                        # 统一错误契约与映射
    http/                          # response、pagination、requestId、rate limit
    i18n/
    logger/

  db/                              # 数据库机械细节
    client.ts
    run-migrations.ts
    schema/
    migrations/

  features/
    audit/
    health/
    me/
    projects/
    system-settings/
    iam/
      index.ts                     # IAM router 与对 application 暴露的公开适配器
      routes.ts                    # 子能力 route facade
      handlers.ts                  # 子能力 handler facade
      service.ts                   # 子能力 service facade
      schemas.ts                   # IAM 公共 HTTP schema
      audit-actions.ts
      permissions.ts
      org-tree.ts
      permission-checker.ts
      permissions/
      roles/
      users/
      assignments/
      organizations/
      self-authorization/           # 当前用户自查授权来源（仅认证）
      shared/                      # 仅 IAM 子能力内部共享

tests/
  contract/
  helpers/
  integration/
```

## 顶层职责

### `src/app`

应用组合层是允许连接 feature、core、db 和 catalog 的位置：

- `create-application.ts` 只创建可安全导入的 Hono app，不启动 timer 或监听进程信号；
- `register-features.ts` 统一维护 router 挂载顺序；
- `audit-policies.ts` 将业务 feature 的公开能力适配到 `core/audit` port；
- `lifecycle.ts` 拥有进程资源的启动与关闭。

graceful shutdown 顺序固定为：停止接收请求 → drain audit queue → 停止 retention timer → 关闭数据库连接池。core 模块不得自行注册 `SIGTERM` / `SIGINT` 或调用 `process.exit()`。

### `src/catalogs`

catalog 是显式的应用级契约汇总点。当前只包含权限目录：

- 各 feature 自己声明权限定义；
- `catalogs/permissions.ts` 汇总并验证覆盖、未知项、重复 code 和展示字段；
- feature 可以读取 catalog 生成 OpenAPI enum 或展示引用，但不能借 catalog 调用其他 feature 行为。

### `src/commands`

commands 负责一次性应用编排，不属于数据库基础设施：

- `migrate.ts` 调用 `db/run-migrations.ts`；
- `seed-development.ts` 创建开发演示组织、账号、授权和项目；
- `bootstrap-admin.ts` 创建生产首个管理员，用户、credential account 与角色授权在同一事务中完成。

package script 名称继续使用 `db:migrate`、`db:seed`、`db:bootstrap`，调用者不依赖内部文件路径。

### `src/config`

环境加载、schema 和错误格式化统一放在 config。其他层只导入 `config/env.ts`，不直接解析 `process.env`。

### `src/core`

core 是受边界约束的平台层，可以包含跨业务能力，不以“文件少”为目标，但必须：

- 不导入 `features`；
- 不实现 user/project/role 等业务流程；
- 通过 port/registry 接收业务策略；
- 不拥有宿主进程生命周期。

统一错误 registry 和 i18n 字典属于应用级协议目录，是 core 无业务流程原则的明确例外；若规模继续增长，再评估按 feature 汇总，当前不为目录纯度增加复杂注册机制。

### `src/db`

db 只保留 Drizzle client、schema、migration 和可复用的 migration runner。seed/bootstrap 已移至 commands，因为它们编排用户、角色和项目等业务数据。

不存在真实 repository 时不保留预设的 `DB | Tx` 类型抽象。事务直接由对应 service 或 command 通过 `db.transaction()` 控制。

### `src/features`

feature 是业务能力边界，默认自包含 route、handler、schema、service、permission 和测试。

- 简单 feature 可以没有 service，例如 health；
- 中等 feature 可以由 service 直接访问 db，例如 projects/me/system-settings/audit；
- 当一个 feature 内出现多个稳定子能力时，先在 feature 内分包，例如 IAM；
- 只有出现独立领域模型、多种持久化实现或复杂 use case 时，才引入 repository/完整分层。

IAM 的根 `routes.ts`、`handlers.ts`、`service.ts` 是兼容 facade；具体实现位于 users、roles、assignments、organizations、permissions 子目录。外部只能从 `features/iam/index.ts` 使用公开能力。

## 审计边界

- `core/audit` 提供 action、middleware、queue、sanitize、resolver 和 visibility port/registry；
- `app/audit-policies.ts` 注册 org/user/role/project 名称解析、actor 管理组织范围及各资源可见性策略；
- `features/audit` 只负责查询 API，通过 registry 使用策略，不导入 IAM、Projects 或 Hono `Context` 到 service；
- 资源删除后优先使用写入时的名称快照，未解析时保留原始 type/id；
- 数据结构以 `db/schema/audit-schema.ts` 为准，发布顺序以 `db/migrations` 为准。

## 依赖门禁

生产源码由 ESLint 强制执行：

1. `core` 只能依赖 core/db/config，不能依赖 feature；
2. feature 不能导入其他 feature；跨业务协作通过 core port，由 application composition 注册；
3. catalog 可以聚合 feature 的声明式定义，但不能成为业务调用中介；
4. commands 可以组合 catalog/config/core/db，但不直接进入 feature 内部；
5. db 只能依赖 db/core/config；
6. application 是唯一允许连接具体 feature adapter 的组合层；
7. feature 内部统一使用相对路径，`@/features/*` import 在 feature 源码中直接报错。

## 测试布局

- `src/**/*.test.ts`：与实现共置的单元测试，生产构建排除；
- `tests/contract`：OpenAPI 契约测试；
- `tests/integration`：Testcontainers + PostgreSQL；
- `tests/helpers`：测试专用 app/db/audit helper，不进入生产构建。

测试可以为验证集成边界直接导入目标模块，但生产依赖规则不因此放宽。
