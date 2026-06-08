---
status: Active
adrStatus: Accepted
owner: backend-platform
lastReviewedAt: 2026-06-03
---

# ADR-0003: Better Auth 原生端点不套业务响应 Envelope

## Status

Accepted

## Context

Better Auth 原生 handler 负责认证协议、cookie、session、headers 和客户端约定。

如果强行修改 `/api/auth/*` 响应格式，可能破坏 Better Auth 客户端兼容性和升级路径。

## Decision

`/api/auth/*` 由 Better Auth 原生 handler 处理，不包业务 envelope。

业务 API 仍然使用统一 envelope。

如果需要业务友好的认证状态接口，单独实现：

```txt
GET /api/v1/me
```

内部调用 Better Auth session API，再输出业务 envelope。

## Consequences

优点：

- 保持 Better Auth 升级兼容性。
- 避免破坏 cookie/session/header 语义。
- 业务 API 仍然统一。

代价：

- 全站响应格式不是 100% 一致。
- 文档中需要明确原生 auth endpoint 与业务 endpoint 的边界。
