---
status: Active
owner: backend-platform
lastReviewedAt: 2026-06-03
---

# 统一响应格式

## 是否保留 `success`

建议保留 `success`。

原因：

- 降低客户端分支复杂度。
- 方便测试快照和日志聚合。
- 统一成功与失败响应 shape。
- 不取代 HTTP status，只作为客户端体验字段。

判断顺序：

1. HTTP status
2. business code
3. `success`

## 成功响应

```json
{
  "success": true,
  "code": "COMMON_OK",
  "message": "OK",
  "data": {
    "id": "08f7782b-3a8a-4f82-8eed-e3f4d6c3a8b2",
    "email": "tom@example.com",
    "name": "Tom"
  },
  "error": null,
  "meta": {
    "requestId": "018f9d0f-fc0b-7f77-b2b7-78ec3efdb7ae"
  }
}
```

## 错误响应

```json
{
  "success": false,
  "code": "USER_NOT_FOUND",
  "message": "User not found",
  "data": null,
  "error": {
    "type": "business"
  },
  "meta": {
    "requestId": "018f9d0f-fc0b-7f77-b2b7-78ec3efdb7ae"
  }
}
```

## 分页响应

```json
{
  "success": true,
  "code": "COMMON_OK",
  "message": "OK",
  "data": {
    "items": [
      { "id": "u_1", "email": "a@example.com" },
      { "id": "u_2", "email": "b@example.com" }
    ]
  },
  "error": null,
  "meta": {
    "requestId": "018f9d0f-fc0b-7f77-b2b7-78ec3efdb7ae",
    "pagination": {
      "type": "cursor",
      "limit": 20,
      "nextCursor": "eyJpZCI6InVfMiJ9",
      "hasMore": true
    }
  }
}
```

## 空数据响应

```json
{
  "success": true,
  "code": "COMMON_OK",
  "message": "No content",
  "data": null,
  "error": null,
  "meta": {
    "requestId": "018f9d0f-fc0b-7f77-b2b7-78ec3efdb7ae"
  }
}
```

## Validation error 响应

```json
{
  "success": false,
  "code": "COMMON_VALIDATION_FAILED",
  "message": "Validation failed",
  "data": null,
  "error": {
    "type": "validation",
    "details": [
      {
        "path": ["body", "email"],
        "message": "Invalid email address"
      },
      {
        "path": ["body", "password"],
        "message": "String must contain at least 8 character(s)"
      }
    ]
  },
  "meta": {
    "requestId": "018f9d0f-fc0b-7f77-b2b7-78ec3efdb7ae"
  }
}
```

## Request ID 规范

每个业务响应都必须包含：

- 响应头：`X-Request-Id`
- 响应体：`meta.requestId`
- 日志字段：`requestId`

生成规则：

1. 优先读取可信上游传来的 `X-Request-Id`。
2. 如果不存在，则生成新的 UUID（模板使用 UUIDv4，`crypto.randomUUID()`；上方示例中的 v7 格式仅为 UUID 形态展示）。
3. 写入 Hono context。
4. 写入 response header。
5. 写入 response body。
6. 写入 logger context。

## Better Auth 例外

`/api/auth/*` 不强制使用统一响应 envelope。

原因：

- Better Auth 原生 handler 负责 cookie/session/header。
- 强行包 envelope 可能破坏 Better Auth 客户端约定。
- 后续升级 Better Auth 时会增加兼容成本。

约定：

- Better Auth 原生端点保持原样。
- 业务 API 必须使用 envelope。
- 如需业务友好的认证状态接口，可以单独实现 `/api/v1/me`，内部调用 Better Auth，输出统一 envelope。
