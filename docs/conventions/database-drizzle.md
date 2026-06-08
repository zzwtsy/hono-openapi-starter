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
5. repository 和 tests 跟随更新

## 目录结构

```txt
src/db/
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
    users.ts
    audit-logs.ts
    relations.ts
    index.ts
  migrations/
```

## schema 拆分

推荐按业务或领域拆分：

```txt
schema/
  users.ts
  audit-logs.ts
  auth/
    user.ts
    session.ts
    account.ts
    verification.ts
```

`schema/index.ts` 统一导出：

```ts
export * from "./users";
export * from "./audit-logs";
export * from "./auth";
export * from "./relations";
```

## migration 规范

强制规范：

- migration SQL 必须提交到版本库。
- migration 必须 code review。
- 生产环境禁止直接 `push` 改库。
- 破坏性迁移必须使用 expand / contract 策略。

## repository 规范

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

repository 方法接收 `db | tx` 执行上下文。

## Drizzle + Zod

可以使用 Drizzle 的 Zod schema generation 减少重复，但不要直接把数据库 schema 当公开 API schema。

原因：

- API schema 需要 description。
- API schema 需要 example。
- API schema 有兼容性策略。
- 数据库字段不一定等于外部 API 字段。

## Seed 与测试数据

建议保留：

```txt
db/seed.ts
db/testing/reset-db.ts
db/testing/factories.ts
```

用途区分：

- `seed.ts`：本地开发和 demo 数据。
- `factories.ts`：测试数据工厂。
- `reset-db.ts`：integration test 前后清理数据库。
