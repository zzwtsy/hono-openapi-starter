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
5. 数据访问:简单/中等 feature 在 handler/service 直接用 `db`;复杂 feature 编写 repository(接收 `db | tx`)。
6. 编写 integration test。
7. 更新数据模型文档。

## 新增错误码流程

1. 在 error registry 中注册错误码。
2. 明确 HTTP status。
3. 明确 default message。
4. 明确是否 expose。
5. 更新错误码文档。
6. 添加错误响应测试。

## feature 分层选择

按复杂度选择分层:

- **简单 feature**(health、profile、settings):无 service/repository,handler 直接用 `db`。
- **中等 feature**(users、projects):有 service(业务逻辑 + 直接 `db`),无 repository。
- **复杂 feature**(billing、audit-logs):分层(handler → service → repository),repository 接收 `db | tx` 支持事务。

core 基础设施(含权限层)直接用全局 `db`,不传 `exec`。

## handler 规范

handler 只做：

- 读取 `c.req.valid(...)`
- 读取 `c.get("user")`、`c.get("requestId")`
- 调用 service/use-case(中等/复杂 feature)或直接 `db`(简单 feature)
- 返回 response helper

简单 feature(无 service)handler 可直接用 `db`;中等/复杂 feature handler 调 service,不直接访问 db。

## service/use-case 规范

service/use-case 负责：

- 业务规则
- 事务边界(`db.transaction`)
- 权限策略调用
- 数据访问:中等 feature 直接用 `db`;复杂 feature 调 repository
- 抛 `AppError`

## repository 规范(复杂 feature 适用)

复杂 feature(billing、audit-logs 等)用 repository 分层;简单/中等 feature 直接在 handler/service 用 `db`,无需 repository。

repository 负责：

- 数据查询
- 数据写入
- 映射数据库结果
- 接收 `db | tx`(事务由 service 控制)

repository 不负责：

- HTTP status
- response envelope
- Hono context
- 复杂业务规则
- 权限判断

## 注释与 TODO

注释规范(原则、TSDoc、行内注释、TODO/FIXME/HACK 格式、反模式、评审 checklist)见 [注释规范](../shared/commenting.md)。

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
