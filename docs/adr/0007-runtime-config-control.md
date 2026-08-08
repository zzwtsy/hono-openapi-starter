---
status: Active
adrStatus: Accepted
owner: backend-platform
lastReviewedAt: 2026-08-08
---

# ADR-0007: 运行时配置控制 via DB + Better Auth hooks

## Status

Accepted

> **Superseded 片段（2026-07-16）**：Decision 2 中「signUp 运行时注册开关」已退役——模板移除自助注册，`hooks.before` 改为永久拒绝 `/sign-up/email`（不查 DB，不依赖 `system_settings.signUp`）。`system_settings` 表与 API 保留供后续配置。Decision 2 的 `hooks.before` 机制仍有效（现用于永久拒绝 sign-up）；Decision 3/4 不变。见 [system-settings feature](../features/backend/system-settings.md)。

## Context

系统需要部分配置在运行时可编辑（管理员通过 UI 修改），不再依赖改 env 重启。第一个需求是"是否开启用户注册"开关。同时需要用户身份管理（代创建/禁用/重置密码）。

`DISABLE_SIGN_UP` 原是启动时 env（`better-auth.ts` 里 `disableSignUp: env.DISABLE_SIGN_UP`），Better Auth 实例化时读取并冻结。源码核实（v1.6.23）：`sign-up.mjs:143` 每次请求读 `ctx.context.options.emailAndPassword?.disableSignUp`，但 `options` 对象在 `betterAuth()` 调用时冻结，不能运行时修改实例配置。故运行时控制必须走 `hooks.before`（在 dispatch 层 endpoint handler 之前执行），而非 `disableSignUp`。

联网查证 Better Auth 官方文档（better-auth.com）后的关键发现：

| 需求 | 官方推荐 | 不用 admin 插件时 |
| --- | --- | --- |
| 账号禁用 | admin 插件 `banUser`（`banned` 字段 + `databaseHooks.session.create.before` 拦截） | `additionalFields` 加 `disabled` + `databaseHooks.session.create.before` 拦截（手动复制 admin 插件机制） |
| 代创建用户 | admin 插件 `auth.api.createUser`（服务端调用，无需 session） | 直接操作 user/account 表 + `hashPassword`（from `better-auth/crypto`，公共导出） |
| 运行时控制 sign-up | `hooks.before` 中间件（官方文档有 sign-up 拦截示例） | 同左，`hooks.before` 是 Better Auth 原生配置项 |
| 重置密码 | admin 插件 `auth.api.setUserPassword` | 直接操作 account 表 + `hashPassword` |

## Decision

1. **运行时可编辑配置存 DB `system_settings` 表**（key text PK + value jsonb），脱离 env。env 只留启动必需且不可热改的基础设施配置（`DATABASE_URL`、`BETTER_AUTH_SECRET`、`PORT` 等）。

2. **注册开关用 Better Auth `hooks.before` 实现**：在 `better-auth.ts` 配置里声明 `hooks.before`，使用 Better Auth 注入的 `ctx.path === "/sign-up/email"` 判断端点，因此 HTTP 请求和 server-side `auth.api` 调用走同一条拒绝路径。`hooks.before` 对所有 `/api/auth/*` 触发，无内置路径匹配；自助注册退役后该端点永久抛 `APIError`（`AUTH_SIGNUP_DISABLED`，原生错误形态，不包业务 envelope，保持 ADR-0003）。**不用 Hono app-level middleware**--`hooks.before` 是 Better Auth 原生机制，在 BA 配置里声明而非散落在 create-app.ts。

   **已退役的运行时开关**：此前的 DB `signUp.enabled` 和 `env.DISABLE_SIGN_UP` 方案随自助注册退役；当前不读取这两个开关，`/sign-up/email` 由 hook 永久拒绝。`system_settings` 表和 API 仍保留给后续运行时配置。

3. **禁用用户用 `databaseHooks.session.create.before` 实现**：在 `better-auth.ts` 配置里声明 `databaseHooks.session.create.before`，检查 user 的 `disabled` 字段，禁用时抛 `APIError`（`AUTH_ACCOUNT_DISABLED`）阻止 session 创建，从而阻止**禁用用户登录**（sign-in 创建新 session 时拦截）。当前 Better Auth session 续期走 session update，不由 `session.create.before` 拦截；因此 `disableUser` 必须在同一事务内主动删除该用户的全部 session，立即下线并覆盖已有 session。**不在 `requireAuth` 里检查**--requireAuth 只能阻止已有 session 的请求，不能阻止禁用用户重新登录。

4. **不引入 Better Auth admin 插件**（延续 ADR-0004）：用户管理（代创建/重置密码）走自建业务端点 `POST /api/v1/users` 等，内部复用 `bootstrap.ts` 原语（`hashPassword` from `better-auth/crypto` + `db.insert` user/account）。`hashPassword` 是 `better-auth/crypto` 的公共导出（已核实 `dist/crypto/index.d.mts`）。

## Consequences

优点：

- **遵循官方推荐**：`hooks.before` 和 `databaseHooks` 都是 Better Auth 原生配置项，官方文档有 sign-up 拦截示例。比 Hono 外层 middleware 更内聚（在 BA 配置里声明，不散落在 create-app.ts）。
- **禁用无漏洞**：`databaseHooks.session.create.before` 阻止禁用用户创建新 session，`disableUser` 在同一事务内删除已有 session；两者组合覆盖登录和已存在会话的立即失效。
- **无侵入**：不自建 sign-up 端点、不引 admin 插件。BA 升级时 hooks/databaseHooks 是稳定配置 API。
- **单开关简洁**：移除 `env.DISABLE_SIGN_UP`，sign-up 完全由 DB 控制，无双开关优先级陷阱。
- **可扩展**：`system_settings` 是 key-value 模式，后续新增运行时配置只需加 key + UI 开关，不改架构。
- **ADR-0004 边界内**：BA 只管认证，配置控制和用户管理都在自建层；hooks.before 直接查中立层 `system_settings` 表，不破 `core/` -> `features/` 禁依赖。

代价：

- **单开关无 env 兜底**：移除 `env.DISABLE_SIGN_UP` 后失去部署期硬禁兜底，但安全默认靠"未配置即禁"（hooks 对 signUp 缺失或 `enabled !== true` 一律拒绝），生产 migrate 后无 seed 即禁。
- **hooks.before 查 DB**：每次 sign-up 查 `system_settings` 单行。单实例部署 + sign-up 低频，开销可忽略（见 project memory：单实例、无多租户）。
- **自建用户管理**：createUser/resetPassword 需手动维护 user/account 表一致性（bootstrap.ts 已验证此模式）。核心无管理员重置密码 API，`hashPassword` + 直接操作 account 表是 ADR-0004 约束下的合理选择。

## 关联

- [ADR-0003: Better Auth 原生端点不套 envelope](0003-keep-better-auth-native.md)
- [ADR-0004: 权限层自建，不扩展 Better Auth](0004-authorization-layer.md)
- [Better Auth 集成规范](../conventions/backend/auth-better-auth.md)
- [Better Auth Hooks 文档](https://www.better-auth.com/docs/concepts/hooks)
- [Better Auth Database Hooks 文档](https://www.better-auth.com/docs/concepts/database#database-hooks)
