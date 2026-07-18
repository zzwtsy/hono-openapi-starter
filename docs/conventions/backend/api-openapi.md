---
status: Active
owner: backend-platform
lastReviewedAt: 2026-06-03
---

# API 与 OpenAPI 规范

## 基本原则

所有业务 API 必须使用：

```ts
createRoute(...)
app.openapi(route, handler)
```

OpenAPI 文档不是额外维护的副产物，而是 route definition 的一部分。

## route 必填字段

每个业务 route 必须包含：

```ts
createRoute({
  method,
  path,
  tags,
  operationId,
  summary,
  description,
  middleware,
  request,
  responses,
})
```

## 命名规范

| 项 | 规范 | 示例 |
| --- | --- | --- |
| tag | 大驼峰 | `Users`、`AuditLogs`、`AuthSessions` |
| operationId | 动词优先 lowerCamelCase，全局唯一，优先设计成未来 SDK 中可直接使用的方法名 | `getUserById`、`listAuditLogs`、`createProjectMember` |
| route const | camelCase + Route | `getUserRoute` |
| handler const | camelCase + Handler | `getUserHandler` |
| schema const | PascalCase + Schema | `UserSchema`、`CreateUserBodySchema` |

### operationId 命名规则

`operationId` 应使用动词优先的 lowerCamelCase 风格，并保持全局唯一。它应该优先面向 SDK 生成后的方法名设计，而不是面向内部枚举或后端文件名设计。

推荐动词：

- `list`
- `get`
- `create`
- `update`
- `patch`
- `delete`
- `archive`
- `restore`
- `enable`
- `disable`
- `invite`
- `remove`
- `export`
- `import`
- `sync`

示例：

```ts
createRoute({
  method: 'get',
  path: '/users/{userId}',
  tags: ['Users'],
  operationId: 'getUserById',
  summary: '获取用户详情',
  description: '根据用户 ID 获取单个用户详情。',
  responses: {
    200: jsonSuccessResponse(UserSchema, '用户详情'),
  },
});
```

## schema 规范

强制规范：

- 所有 request schema 使用 Zod。
- 所有 response schema 使用 Zod。
- 所有公开 schema 字段必须有 `description`。
- 重要字段必须有 `example`。
- 可复用 schema 必须命名。
- 参数 schema 必须声明 OpenAPI param 信息。
- 不允许直接 inline 大型匿名 response object。

示例：

```ts
import { z } from "@hono/zod-openapi";

export const UserSchema = z.object({
  id: z.string().uuid().openapi({
    description: "用户 ID",
    example: "08f7782b-3a8a-4f82-8eed-e3f4d6c3a8b2",
  }),
  email: z.string().email().openapi({
    description: "用户邮箱",
    example: "tom@example.com",
  }),
  name: z.string().openapi({
    description: "用户姓名",
    example: "Tom",
  }),
}).openapi("User");
```

## route-level middleware 规范

可以在 `createRoute({ middleware: [] })` 中写和当前 route 强关联的中间件：

```ts
middleware: [requireAuth(), requirePermission("users.read")] as const,
```

适合放：

- 认证
- 权限
- route-specific rate limit
- idempotency
- 特定 header 校验

不适合放：

- request id
- access log
- CORS
- secure headers
- body limit
- 全局 error handler

这些应该放在 app-level middleware。

## OpenAPI response helper

推荐统一使用：

```ts
jsonSuccessResponse(schema, description)
jsonErrorResponse(description, code)
```

`jsonErrorResponse` 的 `code` 参数强制传入，让每个错误响应显式绑定错误码；内部用 `errorExample(code)` 生成 response 级 example（`message` = `errorRegistry[code].defaultMessage`(en)，`originalMessage` 同，`type` 按 code 推断：`COMMON_VALIDATION_FAILED`->validation+details，`COMMON_INTERNAL_ERROR`->internal，其他->business）。response 级 example 优先于 `ErrorEnvelopeSchema` 的字段 example，OpenAPI 文档（Scalar）各状态码展示真实示例（401 展示 `COMMON_UNAUTHORIZED`，404 `USER_NOT_FOUND`，409 `ROLE_NAME_CONFLICT`），不再全显示成 validation。

`ErrorEnvelopeSchema.code` 是 `z.enum(ErrorCode)`（从 `errorRegistry` 派生，含通用码 + 业务码），前端 `gen:api` 得 `ErrorCode` 联合可类型安全 `switch`。`error.originalMessage` 为 en 兜底（填 params）。运行时 `message` 由 i18n 按 `Accept-Language` + params 派生（见 [错误码体系](./error-code-system.md#i18n多语言)），契约 example 展示 en 默认值。

示例：

```ts
export const getUserRoute = createRoute({
  method: "get",
  path: "/users/{userId}",
  tags: ["Users"],
  operationId: "getUserById",
  summary: "获取用户详情",
  description: "根据用户 ID 获取单个用户详情。",
  middleware: [requireAuth()] as const,
  request: {
    params: UserParamsSchema,
  },
  responses: {
    200: jsonSuccessResponse(UserSchema, "用户详情"),
    401: jsonErrorResponse("未认证", "COMMON_UNAUTHORIZED"),
    404: jsonErrorResponse("用户不存在", "USER_NOT_FOUND"),
  },
});
```

> 422 不逐 route 声明（见下节）；`authErrorResponses` 集中定义 401/403。多码场景（如"角色或组织不存在"）保留 `COMMON_NOT_FOUND`/`COMMON_CONFLICT`（无法精确单一业务码）。

## 校验失败响应（422）

所有业务 API 的 Zod 校验失败由 `@hono/zod-openapi` 的 `defaultHook` 统一处理，返回 `422 COMMON_VALIDATION_FAILED`，`error.details` 为 `formatZodError` 产出的 `ErrorDetail[]`（`{ path, message }[]`）。

- **不逐 route 声明 422**：校验失败是所有 route 的横切行为，逐个声明是重复噪声。`authErrorResponses` 只含 401/403，422 由 defaultHook 全局兜底。
- **details shape 唯一**：无论是 defaultHook（路由层）、error-mapper（service 抛 ZodError）还是 service 内部 `safeParse` 失败，`details` 都必须是 `formatZodError` 产出的 `ErrorDetail[]`，与 `ErrorDetailSchema` 一致。`ErrorSchema.details` 的 OpenAPI 契约即 `z.array(ErrorDetailSchema).optional()`。
- 未暴露错误（`expose: false`，如 `COMMON_INTERNAL_ERROR`）不透传 `details`（B1），响应体 `error.details` 为 `undefined`。

## Scalar 集成

建议提供两个入口：

```txt
/openapi.json
/reference
```

其中：

- `/openapi.json` 返回机器可读 OpenAPI 文档。
- `/reference` 使用 Scalar 渲染 API Reference。

## CI 校验

OpenAPI 必须进入 CI：

1. 生成 `openapi.json`
2. Redocly lint
3. Spectral lint
4. OpenAPI Generator validate
5. SDK generation smoke test，可选但推荐
