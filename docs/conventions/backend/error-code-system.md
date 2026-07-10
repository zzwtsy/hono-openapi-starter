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
COMMON_INTERNAL_ERROR

AUTH_SESSION_EXPIRED
AUTH_INVALID_CREDENTIALS
AUTH_EMAIL_NOT_VERIFIED

USER_NOT_FOUND
USER_EMAIL_ALREADY_EXISTS
USER_STATUS_DISABLED

PROJECT_NOT_FOUND
PROJECT_MEMBER_ALREADY_EXISTS
PROJECT_PERMISSION_DENIED
```

## 通用错误码

| Code | HTTP Status | 说明 |
| --- | --- | --- |
| `COMMON_OK` | 200 | 成功 |
| `COMMON_VALIDATION_FAILED` | 422 | 请求校验失败 |
| `COMMON_UNAUTHORIZED` | 401 | 未认证 |
| `COMMON_FORBIDDEN` | 403 | 无权限 |
| `COMMON_NOT_FOUND` | 404 | 资源不存在 |
| `COMMON_CONFLICT` | 409 | 资源冲突 |
| `COMMON_RATE_LIMITED` | 429 | 请求过于频繁 |
| `COMMON_INTERNAL_ERROR` | 500 | 内部错误 |

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

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly expose: boolean;
  readonly details?: unknown;
  readonly cause?: unknown;

  constructor(code: ErrorCode, options?: {
    message?: string;
    details?: unknown;
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
