---
status: Active
adrStatus: Accepted
owner: backend-platform
lastReviewedAt: 2026-06-03
---

# ADR-0002: 业务 API 使用统一响应 Envelope

## Status

Accepted

## Context

业务 API 需要统一返回格式，方便客户端处理、测试、日志分析和 SDK 生成。

## Decision

业务 API 统一返回：

```json
{
  "success": true,
  "code": "COMMON_OK",
  "message": "OK",
  "data": {},
  "error": null,
  "meta": {
    "requestId": "..."
  }
}
```

错误响应同样保持相同 shape：

```json
{
  "success": false,
  "code": "COMMON_VALIDATION_FAILED",
  "message": "Validation failed",
  "data": null,
  "error": {
    "type": "validation",
    "details": []
  },
  "meta": {
    "requestId": "..."
  }
}
```

## Consequences

优点：

- 客户端消费稳定。
- API 契约清晰。
- 错误码和 requestId 统一。
- OpenAPI schema 可复用。

代价：

- 与纯 REST `204 No Content` 风格不同。
- `success` 与 HTTP status 存在一定冗余。
