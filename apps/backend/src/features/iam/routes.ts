import { createRoute, z } from "@hono/zod-openapi";

import { requireAuth } from "@/core/auth/require-auth.js";
import { requirePermission } from "@/core/auth/require-permission.js";
import { jsonErrorResponse, jsonErrorResponses, jsonSuccessResponse } from "@/core/http/openapi/helpers.js";
import { authedSecurity } from "@/core/http/openapi/security.js";
import {
  AssignRolePermissionsSchema,
  CreateOrganizationSchema,
  CreateRoleSchema,
  CreateUserSchema,
  OrganizationIdParamSchema,
  OrganizationSchema,
  OrgIdQuerySchema,
  PermissionSchema,
  ResetPasswordSchema,
  RoleIdParamSchema,
  RoleSchema,
  RoleUserAssignmentSchema,
  TransferUserOrgSchema,
  UpdateOrganizationSchema,
  UpdateRoleSchema,
  UpdateUserSchema,
  UserDirectPermissionSchema,
  UserIdParamSchema,
  UserPermissionBodySchema,
  UserPermissionParamSchema,
  UserPermissionsResultSchema,
  UserRoleAssignmentSchema,
  UserRoleBodySchema,
  UserRoleParamSchema,
  UserSummarySchema,
} from "./schemas.js";

/** iam feature 共享:认证 + 权限 + 401/403 响应。 */
const permissionsReadMiddleware = [requireAuth(), requirePermission("permissions.read")];
const rolesReadMiddleware = [requireAuth(), requirePermission("roles.read")];
const organizationsReadMiddleware = [requireAuth(), requirePermission("organizations.read")];
const assignmentsReadMiddleware = [requireAuth(), requirePermission("assignments.read")];
const usersReadMiddleware = [requireAuth(), requirePermission("users.read")];
const organizationsCreateMiddleware = [requireAuth(), requirePermission("organizations.create")];
const organizationsUpdateMiddleware = [requireAuth(), requirePermission("organizations.update")];
const organizationsDeleteMiddleware = [requireAuth(), requirePermission("organizations.delete")];
const rolesCreateMiddleware = [requireAuth(), requirePermission("roles.create")];
const rolesUpdateMiddleware = [requireAuth(), requirePermission("roles.update")];
const rolesDeleteMiddleware = [requireAuth(), requirePermission("roles.delete")];
const rolesAssignPermissionsMiddleware = [requireAuth(), requirePermission("roles.assign-permissions")];
const rolesRevokePermissionsMiddleware = [requireAuth(), requirePermission("roles.revoke-permissions")];
const assignmentsGrantMiddleware = [requireAuth(), requirePermission("assignments.grant")];
const assignmentsRevokeMiddleware = [requireAuth(), requirePermission("assignments.revoke")];
const usersCreateMiddleware = [requireAuth(), requirePermission("users.create")];
const usersUpdateMiddleware = [requireAuth(), requirePermission("users.update")];
const usersResetPasswordMiddleware = [requireAuth(), requirePermission("users.reset-password")];
const usersDisableMiddleware = [requireAuth(), requirePermission("users.disable")];
const usersEnableMiddleware = [requireAuth(), requirePermission("users.enable")];
const authErrorResponses = {
  401: jsonErrorResponse("未认证", "COMMON_UNAUTHORIZED"),
  403: jsonErrorResponse("无权限", "COMMON_FORBIDDEN"),
};

// --- 权限目录 ---
export const listPermissionsRoute = createRoute({
  method: "get",
  path: "/permissions",
  tags: ["IAM"],
  operationId: "listPermissions",
  summary: "列出权限",
  description: "返回权限目录,供管理端建角色时选择。需 permissions.read。",
  middleware: permissionsReadMiddleware,
  security: authedSecurity,
  responses: {
    200: jsonSuccessResponse(z.array(PermissionSchema), "权限列表"),
    ...authErrorResponses,
  },
});

// --- 角色 ---
export const listRolesRoute = createRoute({
  method: "get",
  path: "/roles",
  tags: ["IAM"],
  operationId: "listRoles",
  summary: "列出角色",
  description: "返回所有角色(含 code 同步角色与 instance 实例角色)。需 roles.read。",
  middleware: rolesReadMiddleware,
  security: authedSecurity,
  responses: {
    200: jsonSuccessResponse(z.array(RoleSchema), "角色列表"),
    ...authErrorResponses,
  },
});

export const createRoleRoute = createRoute({
  method: "post",
  path: "/roles",
  tags: ["IAM"],
  operationId: "createRole",
  summary: "创建角色",
  description: "创建实例角色(source=instance,可改删)。角色名唯一。需 roles.create。",
  middleware: rolesCreateMiddleware,
  security: authedSecurity,
  request: { body: { content: { "application/json": { schema: CreateRoleSchema } } } },
  responses: {
    200: jsonSuccessResponse(RoleSchema, "创建成功"),
    ...authErrorResponses,
    409: jsonErrorResponse("角色名已存在", "ROLE_NAME_CONFLICT"),
  },
});

export const updateRoleRoute = createRoute({
  method: "patch",
  path: "/roles/{roleId}",
  tags: ["IAM"],
  operationId: "updateRole",
  summary: "修改角色",
  description: "修改实例角色的 name/description。code 角色不可改删。需 roles.update。",
  middleware: rolesUpdateMiddleware,
  security: authedSecurity,
  request: {
    params: RoleIdParamSchema,
    body: { content: { "application/json": { schema: UpdateRoleSchema } } },
  },
  responses: {
    200: jsonSuccessResponse(RoleSchema, "修改成功"),
    ...authErrorResponses,
    404: jsonErrorResponse("角色不存在", "ROLE_NOT_FOUND"),
    409: jsonErrorResponse("角色名已存在", "ROLE_NAME_CONFLICT"),
  },
});

export const deleteRoleRoute = createRoute({
  method: "delete",
  path: "/roles/{roleId}",
  tags: ["IAM"],
  operationId: "deleteRole",
  summary: "删除角色",
  description: "删除实例角色及其关联授权。code 角色不可删。需 roles.delete。",
  middleware: rolesDeleteMiddleware,
  security: authedSecurity,
  request: { params: RoleIdParamSchema },
  responses: {
    200: jsonSuccessResponse(z.object({ id: z.string() }), "删除成功"),
    ...authErrorResponses,
    404: jsonErrorResponse("角色不存在", "ROLE_NOT_FOUND"),
  },
});

export const listRolePermissionsRoute = createRoute({
  method: "get",
  path: "/roles/{roleId}/permissions",
  tags: ["IAM"],
  operationId: "listRolePermissions",
  summary: "列出角色权限",
  description: "返回角色已配置的权限名列表。需 roles.read。",
  middleware: rolesReadMiddleware,
  security: authedSecurity,
  request: { params: RoleIdParamSchema },
  responses: {
    200: jsonSuccessResponse(z.array(z.string()), "权限名列表"),
    ...authErrorResponses,
    404: jsonErrorResponse("角色不存在", "ROLE_NOT_FOUND"),
  },
});

export const assignRolePermissionsRoute = createRoute({
  method: "post",
  path: "/roles/{roleId}/permissions",
  tags: ["IAM"],
  operationId: "assignRolePermissions",
  summary: "给角色配权限",
  description: "批量授予实例角色权限,已授权的幂等跳过。需 roles.assign-permissions。",
  middleware: rolesAssignPermissionsMiddleware,
  security: authedSecurity,
  request: {
    params: RoleIdParamSchema,
    body: { content: { "application/json": { schema: AssignRolePermissionsSchema } } },
  },
  responses: {
    200: jsonSuccessResponse(z.array(z.string()), "角色当前权限列表"),
    ...authErrorResponses,
    404: jsonErrorResponses("角色或权限不存在", ["ROLE_NOT_FOUND", "PERMISSION_NOT_FOUND"]),
  },
});

export const deleteRolePermissionRoute = createRoute({
  method: "delete",
  path: "/roles/{roleId}/permissions/{permission}",
  tags: ["IAM"],
  operationId: "deleteRolePermission",
  summary: "撤角色权限",
  description: "撤销实例角色的单个权限。需 roles.revoke-permissions。",
  middleware: rolesRevokePermissionsMiddleware,
  security: authedSecurity,
  request: { params: z.object({ roleId: z.string(), permission: z.string() }) },
  responses: {
    200: jsonSuccessResponse(z.object({ permission: z.string() }), "已撤销"),
    ...authErrorResponses,
    404: jsonErrorResponse("角色不存在", "ROLE_NOT_FOUND"),
  },
});

export const listRoleUsersRoute = createRoute({
  method: "get",
  path: "/roles/{roleId}/users",
  tags: ["IAM"],
  operationId: "listRoleUsers",
  summary: "列出角色已授用户",
  description: "返回操作者管理子树内直接授予该角色的用户记录(含过期)。需 assignments.read。",
  middleware: assignmentsReadMiddleware,
  security: authedSecurity,
  request: { params: RoleIdParamSchema },
  responses: {
    200: jsonSuccessResponse(z.array(RoleUserAssignmentSchema), "已授用户记录列表"),
    ...authErrorResponses,
    404: jsonErrorResponse("角色不存在", "ROLE_NOT_FOUND"),
  },
});

// --- 用户 ---
export const listUsersRoute = createRoute({
  method: "get",
  path: "/users",
  tags: ["IAM"],
  operationId: "listUsers",
  summary: "列出用户",
  description: "返回操作者管理子树(自身+子孙组织)下的用户。需 users.read。",
  middleware: usersReadMiddleware,
  security: authedSecurity,
  responses: {
    200: jsonSuccessResponse(z.array(UserSummarySchema), "用户列表"),
    ...authErrorResponses,
  },
});

// --- 用户管理 ---
export const createUserRoute = createRoute({
  method: "post",
  path: "/users",
  tags: ["IAM"],
  operationId: "createUser",
  summary: "创建用户",
  description: "管理员代创建用户,目标 org 须在操作者管理子树内。需 users.create。",
  middleware: usersCreateMiddleware,
  security: authedSecurity,
  request: {
    body: { content: { "application/json": { schema: CreateUserSchema } } },
  },
  responses: {
    200: jsonSuccessResponse(UserSummarySchema, "创建成功"),
    ...authErrorResponses,
    404: jsonErrorResponse("组织不存在或不在管理范围内", "ORG_NOT_FOUND"),
    409: jsonErrorResponse("邮箱已存在", "USER_EMAIL_ALREADY_EXISTS"),
  },
});

export const updateUserRoute = createRoute({
  method: "patch",
  path: "/users/{userId}",
  tags: ["IAM"],
  operationId: "updateUser",
  summary: "修改用户资料",
  description: "改用户资料(name/email),不改 orgId。需 users.update。",
  middleware: usersUpdateMiddleware,
  security: authedSecurity,
  request: {
    params: UserIdParamSchema,
    body: { content: { "application/json": { schema: UpdateUserSchema } } },
  },
  responses: {
    200: jsonSuccessResponse(UserSummarySchema, "修改成功"),
    ...authErrorResponses,
    404: jsonErrorResponse("用户不存在", "USER_NOT_FOUND"),
    409: jsonErrorResponse("邮箱已存在", "USER_EMAIL_ALREADY_EXISTS"),
  },
});

export const resetUserPasswordRoute = createRoute({
  method: "post",
  path: "/users/{userId}/reset-password",
  tags: ["IAM"],
  operationId: "resetUserPassword",
  summary: "重置密码",
  description: "重置用户密码并清除其所有 session。需 users.reset-password。",
  middleware: usersResetPasswordMiddleware,
  security: authedSecurity,
  request: {
    params: UserIdParamSchema,
    body: { content: { "application/json": { schema: ResetPasswordSchema } } },
  },
  responses: {
    200: jsonSuccessResponse(z.object({ userId: z.string() }), "重置成功"),
    ...authErrorResponses,
    404: jsonErrorResponses("用户不存在或无密码账号", ["USER_NOT_FOUND", "USER_NO_CREDENTIAL_ACCOUNT"]),
  },
});

export const disableUserRoute = createRoute({
  method: "post",
  path: "/users/{userId}/disable",
  tags: ["IAM"],
  operationId: "disableUser",
  summary: "禁用用户",
  description: "禁用用户并清除其所有 session。禁止禁用自己。需 users.disable。",
  middleware: usersDisableMiddleware,
  security: authedSecurity,
  request: { params: UserIdParamSchema },
  responses: {
    200: jsonSuccessResponse(UserSummarySchema, "已禁用"),
    401: jsonErrorResponse("未认证", "COMMON_UNAUTHORIZED"),
    403: jsonErrorResponses("无权限或禁止禁用自己", ["COMMON_FORBIDDEN", "USER_CANNOT_DISABLE_SELF"]),
    404: jsonErrorResponse("用户不存在", "USER_NOT_FOUND"),
  },
});

export const enableUserRoute = createRoute({
  method: "post",
  path: "/users/{userId}/enable",
  tags: ["IAM"],
  operationId: "enableUser",
  summary: "启用用户",
  description: "启用已禁用的用户。需 users.enable。",
  middleware: usersEnableMiddleware,
  security: authedSecurity,
  request: { params: UserIdParamSchema },
  responses: {
    200: jsonSuccessResponse(UserSummarySchema, "已启用"),
    ...authErrorResponses,
    404: jsonErrorResponse("用户不存在", "USER_NOT_FOUND"),
  },
});

export const transferUserOrganizationRoute = createRoute({
  method: "patch",
  path: "/users/{userId}/organization",
  tags: ["IAM"],
  operationId: "transferUserOrganization",
  summary: "调岗",
  description: "改 user.orgId 到操作者管理子树内的新 org,并清理调岗后失效的授权。clearAllGrants=true 清空全部授权(默认仅清旧组织失效的授权)。禁止调岗自己。需 users.update。",
  middleware: usersUpdateMiddleware,
  security: authedSecurity,
  request: {
    params: UserIdParamSchema,
    body: { content: { "application/json": { schema: TransferUserOrgSchema } } },
  },
  responses: {
    200: jsonSuccessResponse(UserSummarySchema, "调岗成功"),
    401: jsonErrorResponse("未认证", "COMMON_UNAUTHORIZED"),
    403: jsonErrorResponses("无权限或禁止调岗自己", ["COMMON_FORBIDDEN", "USER_CANNOT_TRANSFER_SELF"]),
    404: jsonErrorResponses("用户或目标组织不存在/不在管理范围内", ["USER_NOT_FOUND", "ORG_NOT_FOUND"]),
    409: jsonErrorResponses("目标相同或并发冲突", ["ORG_SAME_AS_CURRENT", "USER_TRANSFER_CONFLICT"]),
  },
});

// --- 用户授权 ---
export const assignUserRoleRoute = createRoute({
  method: "post",
  path: "/users/{userId}/roles/{roleId}",
  tags: ["IAM"],
  operationId: "assignUserRole",
  summary: "授用户角色",
  description: "给用户在指定组织授予角色,可指定过期。重复授可续期。需 assignments.grant。",
  middleware: assignmentsGrantMiddleware,
  security: authedSecurity,
  request: {
    params: UserRoleParamSchema,
    body: { content: { "application/json": { schema: UserRoleBodySchema } } },
  },
  responses: {
    200: jsonSuccessResponse(z.object({ userId: z.string(), roleId: z.string(), orgId: z.string() }), "已授予"),
    ...authErrorResponses,
    404: jsonErrorResponse("角色或组织不存在", "COMMON_NOT_FOUND"),
  },
});

export const deleteUserRoleRoute = createRoute({
  method: "delete",
  path: "/users/{userId}/roles/{roleId}",
  tags: ["IAM"],
  operationId: "deleteUserRole",
  summary: "撤用户角色",
  description: "撤销用户在指定组织的角色授权(需 roleId + orgId 定位)。禁止撤销自己的授权。需 assignments.revoke。",
  middleware: assignmentsRevokeMiddleware,
  security: authedSecurity,
  request: { params: UserRoleParamSchema, query: OrgIdQuerySchema },
  responses: {
    200: jsonSuccessResponse(z.object({ userId: z.string(), roleId: z.string(), orgId: z.string() }), "已撤销"),
    401: jsonErrorResponse("未认证", "COMMON_UNAUTHORIZED"),
    403: jsonErrorResponses("无权限或禁止撤销自己的授权", ["COMMON_FORBIDDEN", "USER_CANNOT_REVOKE_OWN_AUTH"]),
    404: jsonErrorResponse("授权不存在", "COMMON_NOT_FOUND"),
  },
});

export const assignUserPermissionRoute = createRoute({
  method: "post",
  path: "/users/{userId}/permissions/{permission}",
  tags: ["IAM"],
  operationId: "assignUserPermission",
  summary: "授用户权限",
  description: "给用户在指定组织直接授予权限(allow 或 deny),可指定过期。重复授时 effect 以新值为准。需 assignments.grant。",
  middleware: assignmentsGrantMiddleware,
  security: authedSecurity,
  request: {
    params: UserPermissionParamSchema,
    body: { content: { "application/json": { schema: UserPermissionBodySchema } } },
  },
  responses: {
    200: jsonSuccessResponse(z.object({ userId: z.string(), permission: z.string(), orgId: z.string(), effect: z.enum(["allow", "deny"]) }), "已授予"),
    ...authErrorResponses,
    404: jsonErrorResponses("权限或组织不存在", ["PERMISSION_NOT_FOUND", "ORG_NOT_FOUND"]),
  },
});

export const deleteUserPermissionRoute = createRoute({
  method: "delete",
  path: "/users/{userId}/permissions/{permission}",
  tags: ["IAM"],
  operationId: "deleteUserPermission",
  summary: "撤用户权限",
  description: "撤销用户在指定组织的直接权限授权(需 permission + orgId 定位)。禁止撤销自己的授权。需 assignments.revoke。",
  middleware: assignmentsRevokeMiddleware,
  security: authedSecurity,
  request: { params: UserPermissionParamSchema, query: OrgIdQuerySchema },
  responses: {
    200: jsonSuccessResponse(z.object({ userId: z.string(), permission: z.string(), orgId: z.string() }), "已撤销"),
    401: jsonErrorResponse("未认证", "COMMON_UNAUTHORIZED"),
    403: jsonErrorResponses("无权限或禁止撤销自己的授权", ["COMMON_FORBIDDEN", "USER_CANNOT_REVOKE_OWN_AUTH"]),
    404: jsonErrorResponse("授权不存在", "COMMON_NOT_FOUND"),
  },
});

export const listUserPermissionsRoute = createRoute({
  method: "get",
  path: "/users/{userId}/permissions",
  tags: ["IAM"],
  operationId: "listUserPermissions",
  summary: "列出有效权限全集",
  description: "返回用户在目标组织的有效权限全集(含祖先继承),每条权限带来源链,并单独列出被 deny 抵消的权限。需 assignments.read。",
  middleware: assignmentsReadMiddleware,
  security: authedSecurity,
  request: { params: UserIdParamSchema, query: OrgIdQuerySchema },
  responses: {
    200: jsonSuccessResponse(UserPermissionsResultSchema, "有效权限全集(带来源链)"),
    ...authErrorResponses,
    404: jsonErrorResponse("用户或组织不存在或不在管理范围内", "COMMON_NOT_FOUND"),
  },
});

export const listUserRolesRoute = createRoute({
  method: "get",
  path: "/users/{userId}/roles",
  tags: ["IAM"],
  operationId: "listUserRoles",
  summary: "列出已授角色记录",
  description: "返回用户在目标组织直接授予的角色记录(非继承),含过期。需 assignments.read。",
  middleware: assignmentsReadMiddleware,
  security: authedSecurity,
  request: { params: UserIdParamSchema, query: OrgIdQuerySchema },
  responses: {
    200: jsonSuccessResponse(z.array(UserRoleAssignmentSchema), "已授角色记录列表"),
    ...authErrorResponses,
    404: jsonErrorResponse("用户或组织不存在或不在管理范围内", "COMMON_NOT_FOUND"),
  },
});

export const listUserDirectPermissionsRoute = createRoute({
  method: "get",
  path: "/users/{userId}/direct-permissions",
  tags: ["IAM"],
  operationId: "listUserDirectPermissions",
  summary: "列出直接授权记录",
  description: "返回用户在目标组织直接授予的权限记录(allow/deny,非继承),含 effect 与过期。与有效全集 listUserPermissions 区分。需 assignments.read。",
  middleware: assignmentsReadMiddleware,
  security: authedSecurity,
  request: { params: UserIdParamSchema, query: OrgIdQuerySchema },
  responses: {
    200: jsonSuccessResponse(z.array(UserDirectPermissionSchema), "直接授权记录列表"),
    ...authErrorResponses,
    404: jsonErrorResponse("用户或组织不存在或不在管理范围内", "COMMON_NOT_FOUND"),
  },
});

// --- 组织 ---
export const listOrganizationsRoute = createRoute({
  method: "get",
  path: "/organizations",
  tags: ["IAM"],
  operationId: "listOrganizations",
  summary: "列出组织",
  description: "返回所有组织(扁平,带 parentId,前端构建树)。需 organizations.read。",
  middleware: organizationsReadMiddleware,
  security: authedSecurity,
  responses: {
    200: jsonSuccessResponse(z.array(OrganizationSchema), "组织列表"),
    ...authErrorResponses,
  },
});

export const createOrganizationRoute = createRoute({
  method: "post",
  path: "/organizations",
  tags: ["IAM"],
  operationId: "createOrganization",
  summary: "创建组织",
  description: "创建组织,可指定 parentId 挂到父组织下。需 organizations.create。",
  middleware: organizationsCreateMiddleware,
  security: authedSecurity,
  request: { body: { content: { "application/json": { schema: CreateOrganizationSchema } } } },
  responses: {
    200: jsonSuccessResponse(OrganizationSchema, "创建成功"),
    ...authErrorResponses,
    404: jsonErrorResponse("父组织不存在", "ORG_NOT_FOUND"),
  },
});

export const getOrganizationRoute = createRoute({
  method: "get",
  path: "/organizations/{orgId}",
  tags: ["IAM"],
  operationId: "getOrganization",
  summary: "获取组织详情",
  description: "根据组织 ID 获取组织详情。需 organizations.read。",
  middleware: organizationsReadMiddleware,
  security: authedSecurity,
  request: { params: OrganizationIdParamSchema },
  responses: {
    200: jsonSuccessResponse(OrganizationSchema, "组织详情"),
    ...authErrorResponses,
    404: jsonErrorResponse("组织不存在", "ORG_NOT_FOUND"),
  },
});

export const updateOrganizationRoute = createRoute({
  method: "patch",
  path: "/organizations/{orgId}",
  tags: ["IAM"],
  operationId: "updateOrganization",
  summary: "修改组织",
  description: "修改组织 name 或 parentId。改 parentId 时防环。需 organizations.update。",
  middleware: organizationsUpdateMiddleware,
  security: authedSecurity,
  request: {
    params: OrganizationIdParamSchema,
    body: { content: { "application/json": { schema: UpdateOrganizationSchema } } },
  },
  responses: {
    200: jsonSuccessResponse(OrganizationSchema, "修改成功"),
    ...authErrorResponses,
    404: jsonErrorResponse("组织不存在", "ORG_NOT_FOUND"),
    409: jsonErrorResponse("会形成环", "ORG_CYCLE"),
  },
});

export const deleteOrganizationRoute = createRoute({
  method: "delete",
  path: "/organizations/{orgId}",
  tags: ["IAM"],
  operationId: "deleteOrganization",
  summary: "删除组织",
  description: "删除组织。有子组织或有用户时拒绝删除。需 organizations.delete。",
  middleware: organizationsDeleteMiddleware,
  security: authedSecurity,
  request: { params: OrganizationIdParamSchema },
  responses: {
    200: jsonSuccessResponse(z.object({ id: z.string() }), "删除成功"),
    ...authErrorResponses,
    404: jsonErrorResponse("组织不存在", "ORG_NOT_FOUND"),
    409: jsonErrorResponses("有子组织或有用户", ["ORG_HAS_CHILDREN", "ORG_HAS_USERS"]),
  },
});

export type ListPermissionsRoute = typeof listPermissionsRoute;
export type ListUsersRoute = typeof listUsersRoute;
export type CreateUserRoute = typeof createUserRoute;
export type UpdateUserRoute = typeof updateUserRoute;
export type ResetUserPasswordRoute = typeof resetUserPasswordRoute;
export type DisableUserRoute = typeof disableUserRoute;
export type EnableUserRoute = typeof enableUserRoute;
export type TransferUserOrganizationRoute = typeof transferUserOrganizationRoute;
export type ListRolesRoute = typeof listRolesRoute;
export type CreateRoleRoute = typeof createRoleRoute;
export type UpdateRoleRoute = typeof updateRoleRoute;
export type DeleteRoleRoute = typeof deleteRoleRoute;
export type ListRolePermissionsRoute = typeof listRolePermissionsRoute;
export type AssignRolePermissionsRoute = typeof assignRolePermissionsRoute;
export type DeleteRolePermissionRoute = typeof deleteRolePermissionRoute;
export type ListRoleUsersRoute = typeof listRoleUsersRoute;
export type AssignUserRoleRoute = typeof assignUserRoleRoute;
export type DeleteUserRoleRoute = typeof deleteUserRoleRoute;
export type AssignUserPermissionRoute = typeof assignUserPermissionRoute;
export type DeleteUserPermissionRoute = typeof deleteUserPermissionRoute;
export type ListUserPermissionsRoute = typeof listUserPermissionsRoute;
export type ListUserRolesRoute = typeof listUserRolesRoute;
export type ListUserDirectPermissionsRoute = typeof listUserDirectPermissionsRoute;
export type ListOrganizationsRoute = typeof listOrganizationsRoute;
export type CreateOrganizationRoute = typeof createOrganizationRoute;
export type GetOrganizationRoute = typeof getOrganizationRoute;
export type UpdateOrganizationRoute = typeof updateOrganizationRoute;
export type DeleteOrganizationRoute = typeof deleteOrganizationRoute;
