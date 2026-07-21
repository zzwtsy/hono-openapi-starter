import { z } from "@hono/zod-openapi";

import { allPermissionNames } from "@/permissions-catalog.js";

/** 当前用户信息(关键字段)。 */
export const UserSchema = z.object({
  id: z.string().openapi({ description: "用户 ID", example: "user-1" }),
  name: z.string().openapi({ description: "用户名" }),
  email: z.string().openapi({ description: "邮箱" }),
  orgId: z.string().nullable().openapi({ description: "归属组织 ID,未绑定则为 null", example: "org-root" }),
}).openapi("User");

/**
 * `/api/v1/me` 响应:user + 有效权限全集。
 *
 * permissions 用 `z.enum(allPermissionNames)` 把后端权限目录写进 OpenAPI enum,前端经
 * `gen:api` 生成字面量 union(零手写名单漂移);后端仍是权限名单单一事实源(catalog 汇总点)。
 */
export const MeSchema = z.object({
  user: UserSchema,
  permissions: z.array(z.enum(allPermissionNames)).openapi({
    description: "当前组织下的有效权限名列表(空数组表示未绑定组织或无权限)",
    example: ["projects.read", "organizations.read", "users.read"],
  }),
}).openapi("Me");
