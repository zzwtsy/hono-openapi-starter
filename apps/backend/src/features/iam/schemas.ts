import { z } from "@hono/zod-openapi";

/** 权限目录项(代码同步的权限定义,管理 API 只读)。 */
export const PermissionSchema = z.object({
  name: z.string().openapi({ description: "权限名 <resource>.<action>", example: "projects.read" }),
  description: z.string().nullable().openapi({ description: "权限描述" }),
  createdAt: z.iso.datetime().openapi({ description: "创建时间(ISO 8601)" }),
  updatedAt: z.iso.datetime().openapi({ description: "更新时间(ISO 8601)" }),
}).openapi("Permission");

/** 角色资源 schema。`source` 区分代码同步角色(code,不可改删)与管理 API 创建角色(instance)。 */
export const RoleSchema = z.object({
  id: z.string().openapi({ description: "角色 ID", example: "role-admin" }),
  name: z.string().openapi({ description: "角色名", example: "admin" }),
  description: z.string().nullable().openapi({ description: "角色描述" }),
  source: z.enum(["code", "instance"]).openapi({ description: "code=代码同步(不可改删),instance=管理 API 创建" }),
  createdAt: z.iso.datetime().openapi({ description: "创建时间(ISO 8601)" }),
  updatedAt: z.iso.datetime().openapi({ description: "更新时间(ISO 8601)" }),
}).openapi("Role");

/** 建角色入参。 */
export const CreateRoleSchema = z.object({
  name: z.string().min(1).openapi({ description: "角色名(唯一)", example: "viewer" }),
  description: z.string().optional().openapi({ description: "角色描述" }),
});

/** 改角色入参。 */
export const UpdateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
}).openapi("UpdateRole");

/** 给角色配权限入参。 */
export const AssignRolePermissionsSchema = z.object({
  permissions: z.array(z.string()).min(0).openapi({ description: "要授予的权限名列表(已存在的跳过)", example: ["projects.read"] }),
});

/** 角色 ID 路径参数。 */
export const RoleIdParamSchema = z.object({
  roleId: z.string().openapi({ description: "角色 ID", example: "role-viewer" }),
});

/** 用户 ID 路径参数。 */
export const UserIdParamSchema = z.object({
  userId: z.string().openapi({ description: "用户 ID", example: "user-1" }),
});

/** 用户-角色路径参数(userId + roleId)。 */
export const UserRoleParamSchema = z.object({
  userId: z.string(),
  roleId: z.string(),
});

/** 用户-权限路径参数(userId + permission)。 */
export const UserPermissionParamSchema = z.object({
  userId: z.string(),
  permission: z.string(),
});

/** 授角色入参(绑定组织 + 可选过期)。 */
export const UserRoleBodySchema = z.object({
  orgId: z.string().openapi({ description: "授权绑定的组织 ID", example: "org-root" }),
  expiresAt: z.iso.datetime().optional().openapi({ description: "过期时间(ISO 8601),不填则永不过期" }),
});

/** 直接授权入参(绑定组织 + effect + 可选过期)。 */
export const UserPermissionBodySchema = z.object({
  orgId: z.string().openapi({ description: "授权绑定的组织 ID", example: "org-root" }),
  effect: z.enum(["allow", "deny"]).openapi({ description: "允许或拒绝" }),
  expiresAt: z.iso.datetime().optional().openapi({ description: "过期时间(ISO 8601),不填则永不过期" }),
});

/** 组织 ID 查询参数(撤销/查询时指定目标组织)。 */
export const OrgIdQuerySchema = z.object({
  orgId: z.string().openapi({ description: "目标组织 ID", example: "org-root" }),
});

/** 组织资源 schema(树形,parentId 自引用)。 */
export const OrganizationSchema = z.object({
  id: z.string().openapi({ description: "组织 ID", example: "org-root" }),
  name: z.string().openapi({ description: "组织名" }),
  parentId: z.string().nullable().openapi({ description: "父组织 ID,根组织为 null", example: "org-root" }),
  createdAt: z.iso.datetime().openapi({ description: "创建时间(ISO 8601)" }),
  updatedAt: z.iso.datetime().openapi({ description: "更新时间(ISO 8601)" }),
}).openapi("Organization");

/** 建组织入参。 */
export const CreateOrganizationSchema = z.object({
  name: z.string().min(1).openapi({ description: "组织名", example: "华南" }),
  parentId: z.string().optional().openapi({ description: "父组织 ID,不填为根组织", example: "org-root" }),
}).openapi("CreateOrganization");

/** 改组织入参(改 parentId 时防环)。 */
export const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  parentId: z.string().nullable().optional().openapi({ description: "新父组织 ID,null 表示改为根组织" }),
}).openapi("UpdateOrganization");

/** 组织 ID 路径参数。 */
export const OrganizationIdParamSchema = z.object({
  orgId: z.string().openapi({ description: "组织 ID", example: "org-south" }),
});
