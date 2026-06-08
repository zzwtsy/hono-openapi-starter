---
status: Active
owner: backend-platform
lastReviewedAt: 2026-06-03
---

# 后端开发流程规范

## 新增 feature 流程

1. 在 `docs/features/` 新增 feature 文档。
2. 定义 API contract。
3. 定义 Zod schema。
4. 定义 error codes。
5. 定义 Drizzle schema / migration。
6. 编写 repository。
7. 编写 service / use-case。
8. 编写 route。
9. 编写 handler。
10. 编写测试。
11. 生成并检查 OpenAPI。
12. 更新文档。

## 新增 API 流程

1. 在 feature 内新增或更新 `schemas.ts`。
2. 在 `routes.ts` 中使用 `createRoute`。
3. 补全 `summary`、`description`、`operationId`、`tags`。
4. 明确所有 responses。
5. 在 `handlers.ts` 中调用 service/use-case。
6. 写 route test。
7. 跑 OpenAPI lint。

## 新增数据库表流程

1. 新增或更新 `db/schema/*.ts`。
2. 更新 `db/schema/index.ts`。
3. 生成 migration。
4. review migration SQL。
5. 编写 repository。
6. 编写 integration test。
7. 更新数据模型文档。

## 新增错误码流程

1. 在 error registry 中注册错误码。
2. 明确 HTTP status。
3. 明确 default message。
4. 明确是否 expose。
5. 更新错误码文档。
6. 添加错误响应测试。

## handler 规范

handler 只做：

- 读取 `c.req.valid(...)`
- 读取 `c.get("user")`、`c.get("requestId")`
- 调用 service/use-case
- 返回 response helper

handler 不做：

- 复杂业务逻辑
- 直接写 SQL
- 拼装错误响应
- 直接访问 Drizzle table
- 直接判断复杂权限

## service/use-case 规范

service/use-case 负责：

- 业务规则
- 事务边界
- 权限策略调用
- 调用多个 repository
- 抛 `AppError`

## repository 规范

repository 负责：

- 数据查询
- 数据写入
- 映射数据库结果
- 接收 `db | tx`

repository 不负责：

- HTTP status
- response envelope
- Hono context
- 复杂业务规则
- 权限判断

## 注释规范

注释解释“为什么”，不是重复“代码做什么”。

需要 TSDoc 的场景：

- exported function
- 模板公共 API
- OpenAPI helper
- logger helper
- auth middleware
- error helper
- 复杂 use-case
- 复杂 SQL
- 安全策略
- 兼容性逻辑

不建议写注释的场景：

```ts
// Get user by id
const user = await userRepository.findById(id);
```

推荐注释：

```ts
/**
 * Creates a user inside a transaction because user creation also writes
 * an audit log entry. Both records must be committed or rolled back together.
 */
export async function createUser(input: CreateUserInput) {
  // ...
}
```

## TODO 格式

```txt
TODO(issue-or-owner, yyyy-mm-dd): action
```

示例：

```ts
// TODO(api-123, 2026-06-03): remove v1 alias after mobile release 2.8
```

## Code Review 检查点

- 是否遵守 feature 边界？
- 是否新增 OpenAPI 文档？
- 是否使用统一 response envelope？
- 是否新增必要错误码？
- 是否有 route test？
- 是否有 integration test？
- 是否有敏感日志？
- 是否更新文档？
- migration 是否安全？
