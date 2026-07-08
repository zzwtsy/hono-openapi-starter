import { z } from "@hono/zod-openapi";

/** 当前用户信息(关键字段)。 */
export const UserSchema = z.object({
  id: z.string().openapi({ description: "用户 ID", example: "user-1" }),
  name: z.string().openapi({ description: "用户名" }),
  email: z.string().openapi({ description: "邮箱" }),
  orgId: z.string().nullable().openapi({ description: "归属组织 ID,未绑定则为 null", example: "org-root" }),
}).openapi("User");

/** `/api/v1/me` 响应:user + 有效权限全集。 */
export const MeSchema = z.object({
  user: UserSchema,
  permissions: z.array(z.string()).openapi({
    description: "当前组织下的有效权限名列表(空数组表示未绑定组织或无权限)",
    example: ["projects.read", "iam.manage"],
  }),
}).openapi("Me");
