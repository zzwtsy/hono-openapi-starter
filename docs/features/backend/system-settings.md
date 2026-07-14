---
status: Draft
owner: backend-platform
lastReviewedAt: 2026-07-15
---

# Feature: system-settings（系统配置）

## 1. Background

系统需要部分配置在运行时可编辑（管理员通过 UI 修改），不再依赖改 env 重启。第一个需求是"是否开启用户注册"开关。ADR-0007 决定用 DB `system_settings` 表存运行时配置 + BA 路由前拦截 middleware 控制注册开关。

## 2. Goals

- `system_settings` 表存储运行时可编辑配置（key-value JSON 模式）。
- `GET/PATCH /api/v1/settings` 提供配置读写 API（settings.read/settings.update 权限）。
- sign-up 路由前拦截 middleware 读 DB 配置控制注册开关。

## 3. Non-goals

- 所有 env 配置搬进 DB（env 只留启动必需且不可热改的基础设施配置）。
- 配置变更审计 log（独立 feature 推进）。
- 配置变更通知/事件（单实例部署，无需事件总线）。

## 4. API Surface

| Method | Path | OperationId | Auth | Description |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/settings` | `listSettings` | settings.read | 列出全部配置 |
| PATCH | `/api/v1/settings/{key}` | `updateSetting` | settings.update | upsert 一条配置 |

sign-up 拦截 middleware 在 `create-app.ts` 内部直调 `SystemSettingService.get("signUp")`，不暴露独立端点。

## 5. Request / Response

统一 envelope。`PATCH /settings/{key}` body 为 `{ value: <json> }`，upsert 语义（不存在则创建）。`GET /settings` 返回全部配置数组。

## 6. Auth & Permissions

`features/system-settings/permissions.ts` 声明 `settings.read` / `settings.update`，展开到 `permissions-catalog.ts`。

| Permission | Description |
| --- | --- |
| `settings.read` | 查看系统设置 |
| `settings.update` | 修改系统设置 |

## 7. Data Model

- `system_settings`：`key` text PK（配置名，如 `"signUp"`）、`value` jsonb notNull（JSON，如 `{ "enabled": true }`）、`updatedAt` timestamptz、`updatedByUserId` text ->user onDelete set null（审计）。无 id/createdAt（key 天然主键）。

## 8. Error Codes

| Code | HTTP Status | Description |
| --- | --- | --- |
| `COMMON_FORBIDDEN` | 403 | 无 settings.read/settings.update |
| `COMMON_UNAUTHORIZED` | 401 | 未认证 |

## 9. Request Flow

```mermaid
sequenceDiagram
  participant Client as 管理端
  participant API as /api/v1
  participant Auth as requirePermission
  participant Service as SystemSettingService
  participant DB as PG

  Client->>API: PATCH /api/v1/settings/signUp
  API->>Auth: requireAuth + requirePermission("settings.update")
  Auth->>DB: checkPermission(递归 CTE)
  DB-->>Auth: allowed
  API->>Service: update("signUp", value, userId)
  Service->>DB: upsert system_settings
  DB-->>Service: ok
  Service-->>API: 结果
  API-->>Client: envelope
```

sign-up 拦截流程（不经 requirePermission，是全局 middleware）：

```mermaid
sequenceDiagram
  participant Client as 注册请求
  participant MW as sign-up middleware
  participant Service as SystemSettingService
  participant BA as Better Auth handler

  Client->>MW: POST /api/auth/sign-up
  MW->>Service: get("signUp")
  Service-->>MW: { enabled: true/false } 或 null
  alt enabled !== true
    MW-->>Client: 403 { message: "注册已关闭" }
  else enabled === true
    MW->>BA: 放行到 Better Auth 原生 handler
    BA-->>Client: 原生响应
  end
```

## 10. Logging & Audit

配置变更走结构化日志（LogLayer，带 requestId + userId）。audit log 暂未实现（见 Non-goals）。

## 11. Test Cases

- unit：`features/system-settings/system-settings.test.ts`（鉴权 403 + handler->service 接线 + upsert 语义）
- integration：`tests/integration/system-settings/settings.test.ts`（写入读取 + sign-up middleware 生效/失效两个状态）

## 12. Rollout / Migration Notes

- migration `0004`：新建 `system_settings` 表。
- `seed.ts` 加 dev 初始 `signUp: { enabled: true }`（开发默认开注册）。
- `env.DISABLE_SIGN_UP` 保留作 BA 层二次防御（默认 true），实际生效的是 middleware 读 DB。
- 配置 key 命名约定：camelCase（如 `signUp`、`passwordPolicy`），value 用 JSON 对象便于扩展字段。
