---
status: Active
owner: backend-platform
lastReviewedAt: 2026-06-03
---

# Feature: <FeatureName>

## 1. Background

说明为什么需要这个 feature。

## 2. Goals

-

## 3. Non-goals

-

## 4. API Surface

| Method | Path | OperationId | Auth | Description |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/...` | `featureAction` | yes/no | |

## 5. Request / Response

说明主要请求体、响应体和分页策略。

## 6. Auth & Permissions

新增权限时，在 feature 的 `permissions.ts` 中调用 `definePermissionCatalog()` 声明 resource/action 与 label，并在 `permissions-catalog.ts` 展开到 `allPermissions` 汇入全局 `AppPermissionCode`（漏登记或重复 code 编译/启动校验失败）。数据库只同步 code，HTTP 展示消费 `PermissionRef`。

| Permission | Description |
| --- | --- |
| `<resource>.<action>` | |

## 7. Data Model

涉及哪些表、字段、关系、索引。

## 8. Error Codes

| Code | HTTP Status | Description |
| --- | --- | --- |
| `FEATURE_SOMETHING_FAILED` | 400 | |

## 9. Request Flow

```mermaid
sequenceDiagram
  participant Client as 客户端
  participant API
  participant Service as service
  participant DB as 数据库

  Client->>API: 发起请求
  API->>Service: 调用 use-case
  Service->>DB: 查询/更新
  DB-->>Service: 返回结果
  Service-->>API: 返回领域结果
  API-->>Client: 返回统一响应
```

## 10. Logging & Audit

说明哪些操作需要写业务日志或 audit log。

## 11. Test Cases

- unit:
- route:
- integration:
- contract:

## 12. Rollout / Migration Notes

说明是否涉及迁移、兼容、灰度、回滚。
