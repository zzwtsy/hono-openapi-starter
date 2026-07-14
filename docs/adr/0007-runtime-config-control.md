---
status: Active
adrStatus: Accepted
owner: backend-platform
lastReviewedAt: 2026-07-15
---

# ADR-0007: 运行时配置控制 via DB + 路由拦截 middleware

## Status

Accepted

## Context

系统需要部分配置在运行时可编辑（管理员通过 UI 修改），不再依赖改 env 重启。第一个需求是"是否开启用户注册"开关。

当前 `DISABLE_SIGN_UP` 是启动时 env（`better-auth.ts` 里 `disableSignUp: env.DISABLE_SIGN_UP`），Better Auth 实例化时读取并冻结。源码核实（v1.6.23）：`sign-up.mjs:143` 每次请求读 `ctx.context.options.emailAndPassword?.disableSignUp`，但 `options` 对象在 `betterAuth()` 调用时冻结，不能运行时修改实例配置。

可选方案：

| 方案 | 说明 | 问题 |
| --- | --- | --- |
| 改 BA 实例 options | 运行时 `auth.options.emailAndPassword.disableSignUp = false` | options 在实例化时冻结，无官方 API 动态改；hack 内部状态升级会断 |
| 自建 sign-up 端点 | 不用 BA 原生 sign-up，自建 `POST /api/v1/users/register` | 背离 ADR-0003 原生端点边界；前端 auth-client 需改调用路径 |
| BA 路由前加拦截 middleware | 在 `/api/auth/sign-up/*` 前加业务 middleware，读 DB 配置决定放行 | 轻量、无侵入、保持 BA 原生端点不变 |

配置存储位置：

| 方案 | 说明 | 问题 |
| --- | --- | --- |
| env 文件热重载 | 改 env 文件后重启进程 | 不是"运行时"编辑，且生产 env 不由管理员改 |
| DB system_settings 表 | key-value JSON 存运行时可编辑配置 | 灵活、可扩展、管理员 UI 直接读写 |

## Decision

1. **运行时可编辑配置存 DB `system_settings` 表**（key text PK + value jsonb），脱离 env。env 只留启动必需且不可热改的基础设施配置（`DATABASE_URL`、`BETTER_AUTH_SECRET`、`PORT` 等）。

2. **注册开关用 BA 路由前拦截 middleware 实现**：在 `create-app.ts` 的 `app.use("/api/auth/sign-up/*", ...)` 挂业务 middleware，读 `system_settings.signUp.enabled`，关闭时返 403（原生形态 JSON，不包业务 envelope，保持 ADR-0003）。`env.DISABLE_SIGN_UP` 保留作 BA 层二次防御（默认 true，生产首次部署安全）。

3. **不引入 Better Auth admin 插件**（延续 ADR-0004）：用户管理（代创建/禁用/重置密码）走自建业务端点 `POST /api/v1/users` 等，内部复用 `bootstrap.ts` 原语（`hashPassword` from `better-auth/crypto` + `db.insert` user/account）。禁用用户用 `disabled` additionalField（经 `auth:generate` 写入 auth-schema）+ `requireAuth` 检查 + 删 session。

## Consequences

优点：

- **无侵入**：不改 BA 实例配置、不自建 sign-up 端点、不引 admin 插件。BA 升级时 middleware 挂在路径匹配层，与 BA 内部实现解耦。
- **可扩展**：`system_settings` 是 key-value 模式，后续新增运行时配置只需加 key + UI 开关，不改架构。
- **ADR-0004 边界内**：BA 只管认证，配置控制和用户管理都在自建层。

代价：

- **双开关**：`env.DISABLE_SIGN_UP`（BA 静态）和 `system_settings.signUp.enabled`（运行时）并存。实际生效的是 middleware（BA 层的 `disableSignUp` 作为二次防御）。文档需说明优先级。
- **middleware 查 DB**：每次 sign-up 查 `system_settings` 单行。单实例部署 + sign-up 低频，开销可忽略（见 project memory：单实例、无多租户）。
- **自建用户管理**：createUser/resetPassword 需手动维护 user/account 表一致性（bootstrap.ts 已验证此模式）。

## 关联

- [ADR-0003: Better Auth 原生端点不套 envelope](0003-keep-better-auth-native.md)
- [ADR-0004: 权限层自建，不扩展 Better Auth](0004-authorization-layer.md)
- [Better Auth 集成规范](../conventions/backend/auth-better-auth.md)
