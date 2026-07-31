# 后端目录结构

> 本文档是当前架构事实,以 `apps/backend/src/` 实际文件为准(与 `rg`/`find` 核对过);发现漂移请随任务修正。

## 推荐目录树

```txt
src/
  index.ts                      # 启动入口(syncAuthorizationCatalog + serve)
  app.ts                        # 应用装配(权限 checker + 审计保留策略 + 路由挂载)
  env.ts                        # env 校验入口(safeParseEnv)
  permissions-catalog.ts        # 全项目权限汇总(allPermissions,编译期覆盖校验)

  core/
    app/
      create-app.ts             # 全局中间件组装(requestId/i18n/CORS/限流/审计上下文/errorHandler)
      create-router.ts          # OpenAPIHono 工厂(defaultHook 统一校验错误)
      env-validation.ts         # EnvSchema 定义与校验
      not-found.ts              # 404 兜底
      openapi.ts                # OpenAPI 文档 + Scalar 挂载(开发环境)
      register-routes.ts        # Better Auth 路由挂载

    http/
      context.ts                # AppBindings 类型
      pagination.ts             # 通用分页 schema(offset/cursor)+ cursor 编解码
      rate-limit.ts             # 分级限流(认证严格/业务宽松)
      request-id-middleware.ts  # requestId 注入与透传
      response.ts               # envelope 响应 helper(success/error)
      openapi/
        components.ts           # envelope 契约 schema
        helpers.ts              # jsonSuccessResponse/jsonErrorResponse
        security.ts             # 认证方式声明

    errors/
      app-error.ts              # 业务错误(AppError,code-only)
      error-handler.ts          # Hono onError 收口
      error-mapper.ts           # 异常 -> AppError
      error-registry.ts         # 错误码注册表(单一真相)
      zod-error.ts              # zod 校验错误格式化

    logger/
      index.ts                  # LogLayer 实例
      config.ts                 # logger 配置
      fields.ts                 # 请求/错误日志字段
      redact.ts                 # 敏感字段名单(REDACTED)
      transports/
        dev-pretty.ts
        prod-jsonl.ts

    auth/
      better-auth.ts            # Better Auth 实例(认证事件审计 hooks)
      auth-audit-events.ts      # sign-in/sign-out 审计事件解析(纯函数)
      context.ts                # AuthVariables + requireOrgUser
      index.ts
      permissions.ts            # 权限资源定义(permissionResources)
      require-auth.ts           # 认证中间件(注入审计 ALS)
      require-permission.ts     # 权限中间件
      session.ts                # session 获取

    authorization/
      index.ts                  # PermissionService 导出 + checker holder(ADR-0004)
      permission-cache.ts       # 请求级权限缓存(ALS)
      permission-checker.ts     # 权限计算接口
      permission-service.ts     # 有效权限计算(递归 CTE)
      sync.ts                   # 权限目录/admin 角色代码同步

    audit/
      index.ts                  # core/audit 导出
      context.ts                # 审计 ALS 上下文
      audit-context-middleware.ts # 注入 ip/ua/requestId
      middleware.ts             # audit() 路由中间件工厂(定义期校验 + c.error 失败检测)
      write-audit.ts            # 入队前组装(脱敏/名称解析/diff)
      queue.ts                  # 有界队列 + 批量 flush + 退出 flush
      relation-resolvers.ts     # 关联名称解析注册表(org/user/role)
      retention.ts              # 保留策略(惰性过滤 + 定时删除)
      sanitize.ts               # before/after 递归脱敏
      types.ts                  # AuditConfig/AuditEntry/AuditRecord

    i18n/
      index.ts                  # translate 入口
      i18n.ts
      locale.ts                 # Locale 类型
      messages.ts               # zh 字典(satisfies Record<ErrorCode,string>)
      middleware.ts             # Accept-Language 检测

  db/
    client.ts                   # drizzle + postgres 连接池(模块私有)
    bootstrap.ts                # 启动同步(权限目录/admin 角色)
    migrate.ts
    run-migrations.ts
    seed.ts                     # dev 演示数据
    transaction.ts
    schema/
      index.ts                  # schema 汇总导出
      auth-schema.ts            # Better Auth 4 表(CLI 生成,勿手改)
      authorization-schema.ts   # 组织/角色/权限/授权表
      projects-schema.ts
      system-settings-schema.ts
      audit-schema.ts           # audit_logs 表(含 GIN 索引)
      shared/
        ids.ts                  # idColumn(应用层 UUIDv4)
        timestamps.ts           # createdAtColumn(服务端时间)
        index.ts
    migrations/

  features/
    health/
      index.ts
      routes.ts
      handlers.ts
      schemas.ts

    projects/
      index.ts
      routes.ts
      handlers.ts
      schemas.ts
      service.ts
      permissions.ts

    iam/
      index.ts
      routes.ts
      handlers.ts
      schemas.ts
      service.ts
      org-tree.ts               # 管理子树(getManagedSubtree)
      permission-checker.ts     # IAM 权限 checker 实现(递归 CTE)
      permissions.ts

    me/
      index.ts
      routes.ts
      handlers.ts
      schemas.ts
      service.ts

    system-settings/
      index.ts
      routes.ts
      handlers.ts
      schemas.ts
      service.ts
      permissions.ts

    audit/
      index.ts
      routes.ts                 # 3 个查询端点
      handlers.ts
      schemas.ts                # 查询参数/响应契约
      service.ts                # 分页查询 + by-resource 可见性分派
      audit-actions.ts          # action 目录(配置即 catalog)
      permissions.ts

tests/                          # apps/backend/tests/(与 src/ 平级,见 vitest projects)
  contract/                     # OpenAPI 契约测试
  helpers/                      # global-setup/db/reset
  integration/                  # testcontainers + 真实 PG
    authorization/
    projects/
    system-settings/
```

## 顶层目录职责

### `src/core`

模板核心基础设施。只能包含跨业务、无业务语义的代码。

适合放:

- app 创建与注册
- OpenAPI helper
- response helper
- error mapper
- logger
- Better Auth wrapper
- HTTP 通用中间件(requestId/限流/审计上下文)
- pagination helper
- i18n
- 审计基础设施(core/audit,不依赖业务)

不适合放:

- user / project / billing 等业务代码
- 业务 service
- 业务 schema
- feature 私有工具

### `src/features`

业务 feature 垂直切片。

每个 feature 默认自包含:

- route 定义
- handler
- schema
- service(按复杂度,见下)
- permissions
- tests

### `src/db`

数据库基础设施。

只放:

- Drizzle client
- Drizzle schema(扁平 pgTable 文件,见 database-drizzle.md)
- migrations
- seed / bootstrap
- transaction helper

不放业务规则。

## feature 分层选择

按复杂度选择是否 service(见 [开发流程规范](../../conventions/backend/development-workflow.md)):

- 简单 feature:无 service,handler 直接 `db`(当前:health)
- 中等 feature:有 service(直接 `db`),无 repository(当前:projects/iam/me/system-settings/audit)
- 复杂 feature:分层 repository(当前无 feature 采用,保留为演进选项)

## 简单 feature 形态

当前实际:health。

```txt
features/health/
  index.ts
  routes.ts
  handlers.ts
  schemas.ts
```

## 中等 feature 形态

当前实际:projects / iam / me / system-settings / audit(iam 最复杂,含 org-tree 与权限计算,仍是扁平 + service)。

```txt
features/projects/
  index.ts
  routes.ts
  handlers.ts
  schemas.ts
  service.ts
  permissions.ts
```

## 复杂 feature 形态(可选,当前无采用)

适合真正需要分层的大 feature(billing/工作流类)。当前项目所有 feature 均为扁平形态,此结构保留为演进选项,不鼓励提前分层。

```txt
features/<feature>/
  index.ts
  api/
    routes.ts
    handlers.ts
    schemas.ts
  application/
    xxx.use-case.ts
  domain/
    xxx.entity.ts
    xxx.errors.ts
  infrastructure/
    xxx.repository.ts
  lib/
```

## 关于 `lib` 和 `utils`

强制规范:

- 根目录禁止 `src/lib`。
- 根目录禁止 `src/utils`。
- feature 内允许有 `lib/`,表示当前 feature 私有辅助代码。
- 不建议使用 `utils/`,因为语义太弱,容易变成垃圾桶目录。
- 跨两个以上 feature 复用、且无业务语义的代码,才能上移到 `core/`。

## feature 依赖边界

强制规范:

1. `core` 不能 import `features`。
2. `features/<a>` 不能 deep import `features/<b>` 的内部文件。
3. feature 之间只能通过对方的 `index.ts` 暴露的 public API 交互。
4. 事务边界由 service 控制。
5. 审计埋点经 `audit()` 路由中间件声明式接入,feature service 不感知(ADR-0009)。
