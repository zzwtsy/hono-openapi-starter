---
status: Active
owner: backend-platform
lastReviewedAt: 2026-06-03
---

# Drizzle 数据库规范

## 基本原则

Drizzle schema 是数据库结构的 TypeScript source of truth。

推荐流程：

1. 修改 `db/schema/*`
2. 运行 migration generate
3. review SQL migration
4. 部署时执行 migration
5. service/command 和 tests 跟随更新

## 目录结构

```txt
src/db/
  client.ts
  run-migrations.ts
  schema/
    auth-schema.ts
    authorization-schema.ts
    projects-schema.ts
    system-settings-schema.ts
    audit-schema.ts
    shared/
      ids.ts
      timestamps.ts
    index.ts
  migrations/

src/commands/
  migrate.ts
  seed-development.ts
  bootstrap-admin.ts

tests/helpers/
  db.ts
  global-setup.ts
```

## schema 拆分

按稳定数据库边界拆分：

```txt
schema/
  auth-schema.ts
  authorization-schema.ts
  projects-schema.ts
  system-settings-schema.ts
  audit-schema.ts
```

`schema/index.ts` 统一导出：

```ts
export * from "./auth-schema.js";
export * from "./authorization-schema.js";
export * from "./projects-schema.js";
```

## migration 规范

强制规范：

- migration SQL 必须提交到版本库。
- migration 必须 code review。
- 生产环境禁止直接 `push` 改库。
- 破坏性迁移必须使用 expand / contract 策略。

## repository 规范（按需）

当前 feature 由 service 直接使用 Drizzle，没有 repository。只有出现多个持久化实现、复杂领域模型或大量可复用查询时才引入 repository，不为形式分层。

repository 只负责数据库 IO。

可以做：

- `findById`
- `findByEmail`
- `insertUser`
- `updateUser`
- `listByCursor`

不应该做：

- 返回 Hono response
- 读取 Hono context
- 写 HTTP status
- 拼业务错误 message
- 私自开启事务

## 事务边界

事务由 service/use-case 控制。

示例：

```ts
await db.transaction(async (tx) => {
  const user = await userRepository.create(tx, input);
  await auditLogRepository.write(tx, {
    actorId,
    action: "users.create",
    targetId: user.id,
  });
  return user;
});
```

若实际引入 repository，其方法再按需要接收 `db | tx` 执行上下文；不要预留无使用者的全局类型文件。

## Drizzle + Zod

可以使用 Drizzle 的 Zod schema generation 减少重复，但不要直接把数据库 schema 当公开 API schema。

原因：

- API schema 需要 description。
- API schema 需要 example。
- API schema 有兼容性策略。
- 数据库字段不一定等于外部 API 字段。

## Seed 与测试数据

当前布局：

```txt
commands/seed-development.ts
commands/bootstrap-admin.ts
tests/helpers/db.ts
```

用途区分：

- `seed-development.ts`：本地开发和 demo 数据（dev-only，生产不跑）。
- `bootstrap-admin.ts`：生产首次部署的管理员数据编排。
- `tests/helpers/db.ts`：integration test 数据清理。

权限目录（`permissions` 表）与标准 `admin` 角色不归 seed：app lifecycle 启动时由 `syncAuthorizationCatalog` 从代码同步（见 [权限层规范](./authorization.md) 数据生命周期）。seed/bootstrap 也复用该同步保证目录就位。
