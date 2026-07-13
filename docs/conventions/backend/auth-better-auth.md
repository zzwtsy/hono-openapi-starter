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

> 权限层（组织树、角色、直接授权、deny、过期）自建为独立模块，不扩展 Better Auth。完整设计见 [权限层规范](./authorization.md)，决策见 [ADR-0004](../../adr/0004-authorization-layer.md)。本节只描述 `requirePermission`、权限类型与 Better Auth 的衔接。

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
- 各 feature 在自己的 `permissions.ts` 中用 `as const satisfies` 声明权限数组，并用 `declare module` 把权限名 push 到 `core/auth/permissions.ts` 的 `AppPermissionRegistry`（module augmentation）；`AppPermission` 是 `keyof AppPermissionRegistry & PermissionName` 的联合，类型层与运行时数组同源，漏登记编译报错。

`core/auth/permissions.ts` 示例：

```ts
export type PermissionName = `${string}.${string}`;

/** 权限定义:name + 可选 description(进 DB permissions 表,供管理界面展示)。 */
export interface PermissionDefinition {
  name: PermissionName;
  description?: string;
}
```

`features/projects/permissions.ts` 示例：

```ts
import type { PermissionDefinition } from "@/core/auth/permissions";

/** `as const` 保字面量类型,`satisfies` 校验结构合法(不拓宽类型)。 */
export const projectPermissions = [
  { name: "projects.read", description: "查看项目" },
] as const satisfies readonly PermissionDefinition[];

export type ProjectPermission = (typeof projectPermissions)[number]["name"];
```

`permissions-catalog.ts` 汇总所有 feature 的权限数组为 `allPermissions`（运行时目录，供 `syncAuthorizationCatalog` 同步进 DB）。类型层的 `AppPermission` union 从 `core/auth/permissions.ts` 的 `AppPermissionRegistry` 推导（各 feature 用 `declare module` 扩展）。新增 feature 时在 catalog 追加 import + 展开到数组——漏登记会导致 `AppPermission` 缺该权限，`requirePermission("x")` 编译报错。

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
