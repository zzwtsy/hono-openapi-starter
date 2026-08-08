import { z } from "@hono/zod-openapi";

import { allPermissionCodes } from "@/permissions-catalog.js";

/** 权限目录项(代码同步的权限定义,管理 API 只读)。 */
export const PermissionCodeSchema = z.enum(allPermissionCodes).openapi({
  description: "权限机器身份 <resourceCode>.<actionCode>",
  example: "projects.read",
});

export const PermissionRefSchema = z.object({
  code: PermissionCodeSchema,
  resourceCode: z.string().openapi({ description: "资源机器标识", example: "projects" }),
  actionCode: z.string().openapi({ description: "动作机器标识", example: "read" }),
  resourceLabel: z.string().openapi({ description: "资源展示名称", example: "项目" }),
  label: z.string().openapi({ description: "动作展示名称", example: "查看项目" }),
}).openapi("PermissionRef");

export const PermissionSchema = PermissionRefSchema;

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
  permissionCodes: z.array(PermissionCodeSchema).min(0).max(allPermissionCodes.length).openapi({ description: "要授予的权限 code 列表(已存在的跳过)", example: ["projects.read"] }),
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

/** 用户-权限路径参数(userId + permissionCode)。 */
export const UserPermissionParamSchema = z.object({
  userId: z.string(),
  permissionCode: PermissionCodeSchema,
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

/** 用户摘要(列表展示用)。 */
export const UserSummarySchema = z.object({
  id: z.string().openapi({ description: "用户 ID", example: "user-1" }),
  name: z.string().openapi({ description: "用户名", example: "张三" }),
  email: z.string().openapi({ description: "邮箱", example: "zhangsan@example.com" }),
  orgId: z.string().nullable().openapi({ description: "归属组织 ID", example: "org-root" }),
  disabled: z.boolean().nullable().openapi({ description: "是否禁用(null/false=启用)", example: false }),
  createdAt: z.iso.datetime().openapi({ description: "创建时间(ISO 8601)" }),
}).openapi("UserSummary");

/** 管理员代创建用户入参。 */
export const CreateUserSchema = z.object({
  email: z.email().openapi({ description: "邮箱(唯一)", example: "new@example.com" }),
  password: z.string().min(8).openapi({ description: "初始密码(至少 8 位)", example: "password-123" }),
  name: z.string().min(1).openapi({ description: "显示名", example: "李四" }),
  orgId: z.string().min(1).openapi({ description: "目标归属组织 ID(须在操作者管理子树内)", example: "org-root" }),
}).openapi("CreateUser");

/** 改用户资料入参(null-patch;不改 orgId)。至少一项。 */
export const UpdateUserSchema = z.object({
  name: z.string().min(1).optional().openapi({ description: "显示名" }),
  email: z.email().optional().openapi({ description: "邮箱(唯一)" }),
}).refine(v => v.name !== undefined || v.email !== undefined, {
  message: "至少提供 name 或 email 之一",
}).openapi("UpdateUser");

/** 调岗入参(改 user.orgId + grant 清理)。 */
export const TransferUserOrgSchema = z.object({
  orgId: z.string().min(1).openapi({ description: "目标归属组织 ID(须在操作者管理子树内)", example: "org-root" }),
  clearAllGrants: z.boolean().optional().openapi({ description: "是否清空全部 grant(默认 false:仅清旧 home 独有路径上的 grant,保留共同祖先)", example: false }),
}).openapi("TransferUserOrganization");

/** 重置密码入参。 */
export const ResetPasswordSchema = z.object({
  newPassword: z.string().min(8).openapi({ description: "新密码(至少 8 位)", example: "new-password-123" }),
}).openapi("ResetPassword");

/** 用户在某组织已授的角色记录(原始授权,非祖先继承)。 */
export const UserRoleAssignmentSchema = z.object({
  roleId: z.string().openapi({ description: "角色 ID", example: "role-admin" }),
  roleName: z.string().openapi({ description: "角色名", example: "admin" }),
  orgId: z.string().openapi({ description: "授权绑定的组织 ID", example: "org-root" }),
  expiresAt: z.iso.datetime().nullable().openapi({ description: "过期时间(ISO 8601),null 表示永不过期" }),
}).openapi("UserRoleAssignment");

/** 用户在某组织的直接授权记录(原始授权,allow/deny,非祖先继承)。 */
export const UserDirectPermissionSchema = z.object({
  permission: PermissionRefSchema,
  effect: z.enum(["allow", "deny"]).openapi({ description: "允许或拒绝" }),
  orgId: z.string().openapi({ description: "授权绑定的组织 ID", example: "org-root" }),
  expiresAt: z.iso.datetime().nullable().openapi({ description: "过期时间(ISO 8601),null 表示永不过期" }),
}).openapi("UserDirectPermission");

/** 权限来源:角色授予或直接授权,绑定组织,可过期。与 core UserPermissionsResult 对齐。 */
export const PermissionSourceSchema = z.object({
  type: z.enum(["role", "direct"]).openapi({ description: "来源类型:role=角色授予,direct=直接授权" }),
  roleId: z.string().nullable().openapi({ description: "角色 ID(role 类型有值,direct 为 null)" }),
  roleName: z.string().nullable().openapi({ description: "角色名(role 类型有值,direct 为 null)" }),
  orgId: z.string().openapi({ description: "授权绑定的组织 ID(可能是祖先组织,经继承生效)" }),
  expiresAt: z.iso.datetime().nullable().openapi({ description: "过期时间(ISO 8601),null 表示永不过期" }),
}).openapi("PermissionSource");

/** 生效权限及其来源集合(同一权限可多来源)。 */
export const EffectivePermissionSchema = z.object({
  permission: PermissionRefSchema,
  sources: z.array(PermissionSourceSchema).openapi({ description: "来源链:角色/直接/继承" }),
}).openapi("EffectivePermission");

/** 被 deny 抵消的权限:本会生效但被直接 deny 扣掉。 */
export const DeniedPermissionSchema = z.object({
  permission: PermissionRefSchema,
  deniedBy: z.array(z.object({
    orgId: z.string().openapi({ description: "施加 deny 的组织 ID(可能是祖先组织)" }),
    expiresAt: z.iso.datetime().nullable().openapi({ description: "deny 的过期时间,null 表示永久 deny" }),
  })).openapi({ description: "哪些组织的 deny 扣掉了此权限(deny 是全局减法,可多 org)" }),
  suppressedSources: z.array(PermissionSourceSchema).openapi({ description: "本会生效的来源(被 deny 抵消)" }),
}).openapi("DeniedPermission");

/** listUserPermissions 响应:生效权限 + 被 deny 抵消的权限,均带来源链。 */
export const UserPermissionsResultSchema = z.object({
  effective: z.array(EffectivePermissionSchema).openapi({ description: "生效权限全集(含祖先继承,带来源)" }),
  denied: z.array(DeniedPermissionSchema).openapi({ description: "被直接 deny 抵消的权限(本会生效但被扣掉)" }),
}).openapi("UserPermissionsResult");

/** 角色已授用户记录(listRoleUsers 响应项)。 */
export const RoleUserAssignmentSchema = z.object({
  userId: z.string().openapi({ description: "用户 ID", example: "user-1" }),
  userName: z.string().openapi({ description: "用户名", example: "张三" }),
  email: z.string().openapi({ description: "邮箱", example: "zhangsan@example.com" }),
  orgId: z.string().openapi({ description: "授权绑定的组织 ID", example: "org-root" }),
  expiresAt: z.iso.datetime().nullable().openapi({ description: "过期时间(ISO 8601),null 表示永不过期" }),
}).openapi("RoleUserAssignment");
