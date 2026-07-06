---
status: Active
owner: backend-platform
lastReviewedAt: 2026-06-03
---

# Better Auth 集成规范

## 基本原则

Better Auth 负责原生认证协议。

模板负责：

- 初始化 Better Auth
- 接入 Drizzle adapter
- 暴露 `/api/auth/*`
- 提供 `requireAuth`
- 提供 `requirePermission`
- 把 `user/session` 注入 Hono context
- 在业务 API 中使用统一响应 envelope

## 目录结构

```txt
src/core/auth/
  better-auth.ts
  session.ts
  context.ts
  require-auth.ts
  require-permission.ts
  permissions.ts
  openapi.ts

src/features/auth/
  index.ts
  routes.ts
  handlers.ts
  schemas.ts
  service.ts
```

## 原生端点

Better Auth 原生端点挂载为：

```txt
/api/auth/*
```

示例：

```ts
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
```

强制规范：

- `/api/auth/*` 不包统一 envelope。
- 不在 Better Auth 原生响应外层修改 cookie/session/header。
- 业务侧认证状态接口另行封装，例如 `/api/v1/me`。

## `requireAuth`

```ts
import { createMiddleware } from "hono/factory";
import { AppError } from "@/core/errors/app-error";
import { auth } from "@/core/auth/better-auth";

export type AuthVariables = {
  user: typeof auth.$Infer.Session.user;
  session: typeof auth.$Infer.Session.session;
};

export const requireAuth = () =>
  createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const result = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!result?.user || !result?.session) {
      throw new AppError("COMMON_UNAUTHORIZED");
    }

    c.set("user", result.user);
    c.set("session", result.session);
    await next();
  });
```

## 权限策略

> 权限层（组织树、角色、直接授权、deny、过期）自建为独立模块，不扩展 Better Auth。完整设计见 [权限层规范](./authorization.md)，决策见 [ADR-0004](../adr/0004-authorization-layer.md)。本节只描述 `requirePermission`、权限类型与 Better Auth 的衔接。

`requirePermission` 是自建中间件（`core/auth/require-permission.ts`），内部调用 `core/authorization/` 的 `PermissionService.check`，**不使用 Better Auth 的 `hasPermission`**。支持可选 `orgId`（不传则默认 `user.orgId`）：

```ts
requirePermission("users.read")                                    // 默认 user.orgId
requirePermission("users.read", { orgId: c.req.param("orgId") })   // 显式组织
```

用户归属组织通过 Better Auth `additionalFields` 在 `user` 表加 `orgId` 列：

```ts
betterAuth({
  user: { additionalFields: { orgId: { type: "string", required: false } } },
  // ...
});
```

强制规范：

- `requirePermission` 允许直接传 `<resource>.<action>` 字符串。
- `requirePermission` 的参数类型必须是 `AppPermission` 字面量 union，不能放宽成 `string` 或仅使用 `` `${string}.${string}` ``。
- 权限字符串格式必须是 `<resource>.<action>`。
- `core/auth` 只提供权限类型和 `requirePermission` 中间件，检查逻辑在 `core/authorization/`，不硬编码业务权限。
- 各 feature 在自己的 `permissions.ts` 中定义权限 union，并通过 TypeScript module augmentation 汇入 `AppPermissionRegistry`。

`core/auth/permissions.ts` 示例：

```ts
export type PermissionName = `${string}.${string}`;

export type EnsurePermissionName<T extends PermissionName> = T;

export interface AppPermissionRegistry {}

export type AppPermission =
  AppPermissionRegistry[keyof AppPermissionRegistry] & PermissionName;
```

`features/users/permissions.ts` 示例：

```ts
import type { EnsurePermissionName } from "@/core/auth/permissions";

export type UserPermission = EnsurePermissionName<
  | "users.read"
  | "users.create"
  | "users.update"
  | "users.delete"
>;

declare module "@/core/auth/permissions" {
  interface AppPermissionRegistry {
    users: UserPermission;
  }
}
```

`core/auth/require-permission.ts` 示例：

```ts
import { createMiddleware } from "hono/factory";
import { PermissionService } from "@/core/authorization";
import { AppError } from "@/core/errors/app-error";
import type { AppPermission } from "@/core/auth/permissions";

export const requirePermission = (permission: AppPermission, options?: { orgId?: string }) =>
  createMiddleware(async (c, next) => {
    const user = c.get("user");
    if (!user) throw new AppError("COMMON_UNAUTHORIZED");

    const orgId = options?.orgId ?? user.orgId;
    if (!orgId) throw new AppError("COMMON_FORBIDDEN");

    // PermissionService 直接用全局 db(core 基础设施不传 db/tx)
    const allowed = await PermissionService.check(user.id, permission, orgId);
    if (!allowed) throw new AppError("COMMON_FORBIDDEN");

    await next();
  });
```

route 示例：

```ts
middleware: [requireAuth(), requirePermission("users.read")] as const,
```

禁止：

```ts
const permission: string = "users.read";

middleware: [requireAuth(), requirePermission(permission)] as const,
```

权限名建议格式：

```txt
<resource>.<action>
```

例如：

```txt
users.read
users.create
users.update
auditLogs.read
projects.delete
```

## OpenAPI 标注

受保护接口必须在 OpenAPI 中标注 security。

建议在 `core/auth/openapi.ts` 中集中定义 security scheme。

## Better Auth schema 组织

推荐：

```txt
db/schema/auth/
  user.ts
  session.ts
  account.ts
  verification.ts
  index.ts
```

业务 user/profile 表不要和 Better Auth 核心表混在一起。

规则：

- 认证生命周期字段可以放 Better Auth user additionalFields。
- 业务 profile、CRM 状态、偏好设置等放业务表。
- Better Auth schema 与业务 schema 最后由 `db/schema/index.ts` 聚合导出。
