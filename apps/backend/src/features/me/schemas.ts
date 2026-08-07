import { z } from "@hono/zod-openapi";

import { allPermissionCodes } from "@/permissions-catalog.js";

/** 当前用户信息(关键字段)。 */
export const UserSchema = z.object({
  id: z.string().openapi({ description: "用户 ID", example: "user-1" }),
  name: z.string().openapi({ description: "用户名" }),
  email: z.string().openapi({ description: "邮箱" }),
  orgId: z.string().nullable().openapi({ description: "归属组织 ID,未绑定则为 null", example: "org-root" }),
}).openapi("User");

/** 改自己的显示名入参(至少提供 name)。不改 email/orgId/disabled。 */
export const UpdateMeSchema = z.object({
  name: z.string().min(1).openapi({ description: "显示名", example: "张三" }),
}).openapi("UpdateMe");

/** 自助改密码入参(验当前密码 + 新密码)。 */
export const ChangeMyPasswordSchema = z.object({
  currentPassword: z.string().min(1).openapi({ description: "当前密码" }),
  newPassword: z.string().min(8).openapi({ description: "新密码(至少 8 位)", example: "new-password-123" }),
}).openapi("ChangeMyPassword");

/**
 * `/api/v1/me` 响应:user + 有效权限全集。
 *
 * permissionCodes 用 `z.enum(allPermissionCodes)` 把后端权限目录写进 OpenAPI enum,前端经
 * `gen:api` 生成字面量 union(零手写名单漂移);后端仍是权限名单单一事实源(catalog 汇总点)。
 */
export const MeSchema = z.object({
  user: UserSchema,
  permissionCodes: z.array(z.enum(allPermissionCodes)).openapi({
    description: "当前组织下的有效权限 code 列表(空数组表示未绑定组织或无权限)",
    example: ["projects.read", "organizations.read", "users.read"],
  }),
}).openapi("Me");
