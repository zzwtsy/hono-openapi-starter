---
status: Active
owner: backend-platform
lastReviewedAt: 2026-06-03
---

# 错误码体系

## 错误码格式

统一采用：

```txt
<DOMAIN>_<REASON>
```

示例：

```txt
COMMON_VALIDATION_FAILED
COMMON_UNAUTHORIZED
COMMON_FORBIDDEN
COMMON_NOT_FOUND
COMMON_CONFLICT
COMMON_RATE_LIMITED
COMMON_SERVICE_UNAVAILABLE
COMMON_INTERNAL_ERROR

AUTH_ACCOUNT_DISABLED
AUTH_SIGNUP_DISABLED
```

> 错误码以 [error-registry.ts](../../../apps/backend/src/core/errors/error-registry.ts) 为真相来源。上述为实际注册的码；不要在此处臆造未注册的码（如 USER_*、PROJECT_* 等 feature 专属码目前未引入，业务错误复用 COMMON_*）。

## 通用错误码

| Code | HTTP Status | 说明 |
| --- | --- | --- |
| `COMMON_OK` | 200 | 成功 |
| `COMMON_VALIDATION_FAILED` | 422 | 请求校验失败 |
| `COMMON_UNAUTHORIZED` | 401 | 未认证 |
| `COMMON_FORBIDDEN` | 403 | 无权限 |
| `AUTH_ACCOUNT_DISABLED` | 403 | 账号已禁用（databaseHooks 拦截 session 创建） |
| `AUTH_SIGNUP_DISABLED` | 403 | 不支持自助注册 |
| `COMMON_NOT_FOUND` | 404 | 资源不存在 |
| `COMMON_CONFLICT` | 409 | 资源冲突 |
| `COMMON_RATE_LIMITED` | 429 | 请求过于频繁 |
| `COMMON_SERVICE_UNAVAILABLE` | 503 | 服务不可用（如 readyz DB 未就绪） |
| `COMMON_INTERNAL_ERROR` | 500 | 内部错误（expose:false，不透传 details） |

## 错误码注册表

```ts
export const errorRegistry = {
  COMMON_OK: { status: 200, defaultMessage: "OK", expose: true },
  COMMON_VALIDATION_FAILED: {
    status: 422,
    defaultMessage: "Validation failed",
    expose: true,
  },
  COMMON_UNAUTHORIZED: {
    status: 401,
    defaultMessage: "Unauthorized",
    expose: true,
  },
  COMMON_FORBIDDEN: {
    status: 403,
    defaultMessage: "Forbidden",
    expose: true,
  },
  COMMON_NOT_FOUND: {
    status: 404,
    defaultMessage: "Resource not found",
    expose: true,
  },
  COMMON_CONFLICT: {
    status: 409,
    defaultMessage: "Conflict",
    expose: true,
  },
  COMMON_RATE_LIMITED: {
    status: 429,
    defaultMessage: "Too many requests",
    expose: true,
  },
  COMMON_INTERNAL_ERROR: {
    status: 500,
    defaultMessage: "Internal server error",
    expose: false,
  },

  USER_NOT_FOUND: {
    status: 404,
    defaultMessage: "User not found",
    expose: true,
  },
  USER_EMAIL_ALREADY_EXISTS: {
    status: 409,
    defaultMessage: "Email already exists",
    expose: true,
  },
} as const;

export type ErrorCode = keyof typeof errorRegistry;
```

## AppError

```ts
import { errorRegistry, type ErrorCode } from "./error-registry";
import type { ValidationErrorDetail } from "./zod-error";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly expose: boolean;
  readonly details?: ValidationErrorDetail[];
  readonly cause?: unknown;

  constructor(code: ErrorCode, options?: {
    message?: string;
    details?: ValidationErrorDetail[];
    cause?: unknown;
  }) {
    const meta = errorRegistry[code];
    super(options?.message ?? meta.defaultMessage);
    this.name = "AppError";
    this.code = code;
    this.status = meta.status;
    this.expose = meta.expose;
    this.details = options?.details;
    this.cause = options?.cause;
  }
}
```

## 分层抛错规则

### service / use-case

可以抛业务错误：

```ts
throw new AppError("USER_NOT_FOUND");
throw new AppError("USER_EMAIL_ALREADY_EXISTS");
```

### repository

不抛 HTTP 错误。

repository 只负责数据库 IO：

- 返回 `null`
- 返回实体
- 把数据库异常转换为更清晰的 infra 错误
- 不拼 HTTP 响应

### handler

handler 不做错误分发。

错误交给全局 error handler。

### middleware

middleware 可以抛横切错误：

```ts
throw new AppError("COMMON_UNAUTHORIZED");
throw new AppError("COMMON_FORBIDDEN");
throw new AppError("COMMON_RATE_LIMITED");
```

## 未知错误处理

未知错误统一转换为：

```txt
COMMON_INTERNAL_ERROR
```

对外返回：

```json
{
  "success": false,
  "code": "COMMON_INTERNAL_ERROR",
  "message": "Internal server error",
  "data": null,
  "error": {
    "type": "internal"
  },
  "meta": {
    "requestId": "..."
  }
}
```

日志中记录完整：

- stack
- cause
- requestId
- path
- method
- userId
- status
- code

## Zod validation error

Zod 校验失败统一转换成：

```txt
COMMON_VALIDATION_FAILED
```

并把字段错误放入：

```json
error.details
```

`details` 的 shape 全项目统一为 `formatZodError` 产出的 `{ path, message }[]`，与 OpenAPI `ErrorDetailSchema` 一致。无论是 `@hono/zod-openapi` 的 `defaultHook`（路由层校验失败）、`error-mapper`（service 层抛出的 `ZodError`），还是 service 内部 `safeParse` 失败后 `throw new AppError("COMMON_VALIDATION_FAILED", { details: formatZodError(...) })`，都必须走 `formatZodError`，不得直接透传 Zod 原始 `issues`（含 `code/expected/received` 等内部字段）。
