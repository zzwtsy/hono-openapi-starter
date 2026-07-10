---
status: Active
owner: backend-platform
lastReviewedAt: 2026-06-03
---

# 最终目录结构

## 推荐目录树

```txt
src/
  index.ts
  app.ts
  env.ts

  core/
    app/
      create-app.ts
      create-openapi-app.ts
      register-routes.ts
      not-found.ts

    http/
      context.ts
      request-id.ts
      response.ts
      pagination.ts
      openapi/
        components.ts
        helpers.ts
        document.ts
      middlewares/
        request-id.ts
        access-log.ts
        secure-headers.ts
        cors.ts
        body-limit.ts
        error-handler.ts

    errors/
      app-error.ts
      error-codes.ts
      error-registry.ts
      error-mapper.ts
      zod-error.ts

    logger/
      index.ts
      config.ts
      fields.ts
      redact.ts
      middleware.ts
      transports/
        dev-pretty.ts
        prod-jsonl.ts

    auth/
      better-auth.ts
      session.ts
      context.ts
      require-auth.ts
      require-permission.ts
      permissions.ts
      openapi.ts

    authorization/
      permission-service.ts
      check.ts

  db/
    client.ts
    index.ts
    transaction.ts
    migrate.ts
    seed.ts
    testing/
      reset-db.ts
      factories.ts
    schema/
      auth/
        user.ts
        session.ts
        account.ts
        verification.ts
        index.ts
      shared/
        ids.ts
        timestamps.ts
      organizations.ts
      roles.ts
      permissions.ts
      role-permissions.ts
      user-roles.ts
      user-permissions.ts
      users.ts
      audit-logs.ts
      relations.ts
      index.ts
    migrations/

  features/
    health/
      index.ts
      routes.ts
      handlers.ts
      schemas.ts

    users/
      index.ts
      routes.ts
      handlers.ts
      schemas.ts
      service.ts
      repository.ts
      errors.ts

    audit-logs/
      index.ts
      api/
        routes.ts
        handlers.ts
        schemas.ts
      application/
        write-audit-log.use-case.ts
        list-audit-logs.use-case.ts
      domain/
        audit-log.entity.ts
        audit-log.errors.ts
      infrastructure/
        audit-log.repository.ts
        audit-log.mapper.ts
      lib/
        redact-payload.ts

  tests/
    helpers/
    contract/
    integration/
    route/
    e2e/
```

## 顶层目录职责

### `src/core`

模板核心基础设施。只能包含跨业务、无业务语义的代码。

适合放：

- app 创建与注册
- OpenAPI helper
- response helper
- error mapper
- logger
- Better Auth wrapper
- HTTP common middleware
- pagination helper
- request id helper

不适合放：

- user / project / billing 等业务代码
- 业务 service
- 业务 repository
- 业务 schema
- feature 私有工具

### `src/features`

业务 feature 垂直切片。

每个 feature 默认自包含：

- route 定义
- handler
- schema
- service / use-case
- repository
- error codes
- permissions
- tests

### `src/db`

数据库基础设施。

只放：

- Drizzle client
- Drizzle schema
- migrations
- seed
- transaction helper
- test factories

不放业务规则。

## feature 分层选择

按复杂度选择是否 service/repository(见 [开发流程规范](../../conventions/backend/development-workflow.md)):

- 简单 feature:无 service/repository,handler 直接 `db`
- 中等 feature:有 service(直接 `db`),无 repository
- 复杂 feature:分层,repository 接收 `db | tx`

## 简单 feature 形态

适合 `health`、`profile`、`settings` 这类小模块。

```txt
features/health/
  index.ts
  routes.ts
  handlers.ts
  schemas.ts
```

## 中等 feature 形态

适合 `users`、`projects`、`teams`。

```txt
features/users/
  index.ts
  routes.ts
  handlers.ts
  schemas.ts
  service.ts
  errors.ts
  permissions.ts
  users.test.ts
```

## 复杂 feature 形态

适合 `billing`、`audit-logs`、`iam`、`workflow`。

```txt
features/billing/
  index.ts

  api/
    routes.ts
    handlers.ts
    schemas.ts
    middlewares.ts

  application/
    create-subscription.use-case.ts
    cancel-subscription.use-case.ts
    sync-invoice.use-case.ts

  domain/
    billing.errors.ts
    billing.policies.ts
    billing.events.ts
    billing.types.ts

  infrastructure/
    billing.repository.ts
    stripe.client.ts
    billing.mapper.ts

  lib/
    calculate-proration.ts
    normalize-invoice.ts

  billing.test.ts
```

## 关于 `lib` 和 `utils`

强制规范：

- 根目录禁止 `src/lib`。
- 根目录禁止 `src/utils`。
- feature 内允许有 `lib/`，表示当前 feature 私有辅助代码。
- 不建议使用 `utils/`，因为语义太弱，容易变成垃圾桶目录。
- 跨两个以上 feature 复用、且无业务语义的代码，才能上移到 `core/`。

## feature 依赖边界

强制规范：

1. `core` 不能 import `features`。
2. `features/<a>` 不能 deep import `features/<b>` 的内部文件。
3. feature 之间只能通过对方的 `index.ts` 暴露的 public API 交互。
4. `repository` 可以依赖 `db`。
5. `service/use-case` 不直接依赖 Drizzle 表定义。
6. 事务边界由 service/use-case 控制。
