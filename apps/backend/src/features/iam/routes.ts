import { createRoute, z } from "@hono/zod-openapi";

import { requireAuth } from "@/core/auth/require-auth.js";
import { requirePermission } from "@/core/auth/require-permission.js";
import { jsonErrorResponse, jsonSuccessResponse } from "@/core/http/openapi/helpers.js";
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
  UpdateOrganizationSchema,
  UpdateRoleSchema,
  UpdateUserSchema,
  UserDirectPermissionSchema,
  UserIdParamSchema,
  UserPermissionBodySchema,
  UserPermissionParamSchema,
  UserRoleAssignmentSchema,
  UserRoleBodySchema,
  UserRoleParamSchema,
  UserSummarySchema,
} from "./schemas.js";

/** iam feature 共享:认证 + 权限 + 401/403 响应。 */
const iamReadMiddleware = [requireAuth(), requirePermission("iam.read")];
const rolesManageMiddleware = [requireAuth(), requirePermission("roles.manage")];
const assignmentsManageMiddleware = [requireAuth(), requirePermission("assignments.manage")];
const organizationsManageMiddleware = [requireAuth(), requirePermission("organizations.manage")];
const usersReadMiddleware = [requireAuth(), requirePermission("users.read")];
const usersCreateMiddleware = [requireAuth(), requirePermission("users.create")];
const usersUpdateMiddleware = [requireAuth(), requirePermission("users.update")];
const usersResetPasswordMiddleware = [requireAuth(), requirePermission("users.reset-password")];
const usersDisableMiddleware = [requireAuth(), requirePermission("users.disable")];
const usersEnableMiddleware = [requireAuth(), requirePermission("users.enable")];
const authErrorResponses = {
  401: jsonErrorResponse("未认证"),
  403: jsonErrorResponse("无权限"),
};

// --- 权限目录 ---
export const listPermissionsRoute = createRoute({
  method: "get",
  path: "/permissions",
  tags: ["IAM"],
  operationId: "listPermissions",
  summary: "列出所有权限(代码同步目录)",
  description: "返回代码同步的权限目录,供管理端建角色时选择。管理 API 不建实例权限(ADR-0004)。",
  middleware: iamReadMiddleware,
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
  summary: "列出所有角色",
  description: "返回所有角色(含 code 与 instance)。`source='code'` 为代码同步角色(admin),管理 API 不可改删。",
  middleware: iamReadMiddleware,
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
  summary: "创建角色(实例角色)",
  middleware: rolesManageMiddleware,
  security: authedSecurity,
  request: { body: { content: { "application/json": { schema: CreateRoleSchema } } } },
  responses: {
    200: jsonSuccessResponse(RoleSchema, "创建成功"),
    ...authErrorResponses,
    409: jsonErrorResponse("角色名已存在"),
  },
});

export const updateRoleRoute = createRoute({
  method: "patch",
  path: "/roles/{roleId}",
  tags: ["IAM"],
  operationId: "updateRole",
  summary: "修改角色(仅实例角色)",
  middleware: rolesManageMiddleware,
  security: authedSecurity,
  request: {
    params: RoleIdParamSchema,
    body: { content: { "application/json": { schema: UpdateRoleSchema } } },
  },
  responses: {
    200: jsonSuccessResponse(RoleSchema, "修改成功"),
    ...authErrorResponses,
    404: jsonErrorResponse("角色不存在"),
  },
});

export const deleteRoleRoute = createRoute({
  method: "delete",
  path: "/roles/{roleId}",
  tags: ["IAM"],
  operationId: "deleteRole",
  summary: "删除角色(仅实例角色,cascade 删 role_permissions 与 user_roles)",
  middleware: rolesManageMiddleware,
  security: authedSecurity,
  request: { params: RoleIdParamSchema },
  responses: {
    200: jsonSuccessResponse(z.object({ id: z.string() }), "删除成功"),
    ...authErrorResponses,
    404: jsonErrorResponse("角色不存在"),
  },
});

export const listRolePermissionsRoute = createRoute({
  method: "get",
  path: "/roles/{roleId}/permissions",
  tags: ["IAM"],
  operationId: "listRolePermissions",
  summary: "列出角色含的权限",
  middleware: iamReadMiddleware,
  security: authedSecurity,
  request: { params: RoleIdParamSchema },
  responses: {
    200: jsonSuccessResponse(z.array(z.string()), "权限名列表"),
    ...authErrorResponses,
    404: jsonErrorResponse("角色不存在"),
  },
});

export const assignRolePermissionsRoute = createRoute({
  method: "post",
  path: "/roles/{roleId}/permissions",
  tags: ["IAM"],
  operationId: "assignRolePermissions",
  summary: "给角色批量配权限(仅实例角色)",
  middleware: rolesManageMiddleware,
  security: authedSecurity,
  request: {
    params: RoleIdParamSchema,
    body: { content: { "application/json": { schema: AssignRolePermissionsSchema } } },
  },
  responses: {
    200: jsonSuccessResponse(z.array(z.string()), "角色当前权限列表"),
    ...authErrorResponses,
    404: jsonErrorResponse("角色不存在"),
  },
});

export const deleteRolePermissionRoute = createRoute({
  method: "delete",
  path: "/roles/{roleId}/permissions/{permission}",
  tags: ["IAM"],
  operationId: "deleteRolePermission",
  summary: "撤角色的单个权限(仅实例角色)",
  middleware: rolesManageMiddleware,
  security: authedSecurity,
  request: { params: z.object({ roleId: z.string(), permission: z.string() }) },
  responses: {
    200: jsonSuccessResponse(z.object({ permission: z.string() }), "已撤销"),
    ...authErrorResponses,
    404: jsonErrorResponse("角色不存在"),
  },
});

// --- 用户 ---
export const listUsersRoute = createRoute({
  method: "get",
  path: "/users",
  tags: ["IAM"],
  operationId: "listUsers",
  summary: "列出管理子树下的用户",
  description: "返回操作者管理子树(自身+子孙组织)下的所有用户。需 users.read 权限。",
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
  summary: "管理员代创建用户",
  description: "email+password+name+orgId(目标 org,须在操作者管理子树内)。同 email 返回 409。需 users.create。",
  middleware: usersCreateMiddleware,
  security: authedSecurity,
  request: {
    body: { content: { "application/json": { schema: CreateUserSchema } } },
  },
  responses: {
    200: jsonSuccessResponse(UserSummarySchema, "创建成功"),
    ...authErrorResponses,
    404: jsonErrorResponse("组织不存在或不在管理范围"),
    409: jsonErrorResponse("邮箱已存在"),
  },
});

export const updateUserRoute = createRoute({
  method: "patch",
  path: "/users/{userId}",
  tags: ["IAM"],
  operationId: "updateUser",
  summary: "修改用户资料",
  description: "改 name/email,不改 orgId。目标须本组织,否则 404。需 users.update。",
  middleware: usersUpdateMiddleware,
  security: authedSecurity,
  request: {
    params: UserIdParamSchema,
    body: { content: { "application/json": { schema: UpdateUserSchema } } },
  },
  responses: {
    200: jsonSuccessResponse(UserSummarySchema, "修改成功"),
    ...authErrorResponses,
    404: jsonErrorResponse("用户不存在"),
    409: jsonErrorResponse("邮箱已存在"),
  },
});

export const resetUserPasswordRoute = createRoute({
  method: "post",
  path: "/users/{userId}/reset-password",
  tags: ["IAM"],
  operationId: "resetUserPassword",
  summary: "重置用户密码",
  description: "hashPassword + update account;删该用户全部 session。需 users.reset-password。",
  middleware: usersResetPasswordMiddleware,
  security: authedSecurity,
  request: {
    params: UserIdParamSchema,
    body: { content: { "application/json": { schema: ResetPasswordSchema } } },
  },
  responses: {
    200: jsonSuccessResponse(z.object({ userId: z.string() }), "重置成功"),
    ...authErrorResponses,
    404: jsonErrorResponse("用户不存在或无密码账号"),
  },
});

export const disableUserRoute = createRoute({
  method: "post",
  path: "/users/{userId}/disable",
  tags: ["IAM"],
  operationId: "disableUser",
  summary: "禁用用户",
  description: "set disabled=true + 删全部 session。禁止禁用自己。需 users.disable。",
  middleware: usersDisableMiddleware,
  security: authedSecurity,
  request: { params: UserIdParamSchema },
  responses: {
    200: jsonSuccessResponse(UserSummarySchema, "已禁用"),
    ...authErrorResponses,
    404: jsonErrorResponse("用户不存在"),
  },
});

export const enableUserRoute = createRoute({
  method: "post",
  path: "/users/{userId}/enable",
  tags: ["IAM"],
  operationId: "enableUser",
  summary: "启用用户",
  description: "清 disabled。需 users.enable。",
  middleware: usersEnableMiddleware,
  security: authedSecurity,
  request: { params: UserIdParamSchema },
  responses: {
    200: jsonSuccessResponse(UserSummarySchema, "已启用"),
    ...authErrorResponses,
    404: jsonErrorResponse("用户不存在"),
  },
});

// --- 用户授权 ---
export const assignUserRoleRoute = createRoute({
  method: "post",
  path: "/users/{userId}/roles/{roleId}",
  tags: ["IAM"],
  operationId: "assignUserRole",
  summary: "授用户角色(绑定组织,可指定过期)",
  middleware: assignmentsManageMiddleware,
  security: authedSecurity,
  request: {
    params: UserRoleParamSchema,
    body: { content: { "application/json": { schema: UserRoleBodySchema } } },
  },
  responses: {
    200: jsonSuccessResponse(z.object({ userId: z.string(), roleId: z.string(), orgId: z.string() }), "已授予"),
    ...authErrorResponses,
    404: jsonErrorResponse("角色或组织不存在"),
  },
});

export const deleteUserRoleRoute = createRoute({
  method: "delete",
  path: "/users/{userId}/roles/{roleId}",
  tags: ["IAM"],
  operationId: "deleteUserRole",
  summary: "撤用户角色(需 orgId 查询参数定位)",
  middleware: assignmentsManageMiddleware,
  security: authedSecurity,
  request: { params: UserRoleParamSchema, query: OrgIdQuerySchema },
  responses: {
    200: jsonSuccessResponse(z.object({ userId: z.string(), roleId: z.string(), orgId: z.string() }), "已撤销"),
    ...authErrorResponses,
    404: jsonErrorResponse("授权不存在"),
  },
});

export const assignUserPermissionRoute = createRoute({
  method: "post",
  path: "/users/{userId}/permissions/{permission}",
  tags: ["IAM"],
  operationId: "assignUserPermission",
  summary: "直接授用户权限(allow/deny,绑定组织)",
  middleware: assignmentsManageMiddleware,
  security: authedSecurity,
  request: {
    params: UserPermissionParamSchema,
    body: { content: { "application/json": { schema: UserPermissionBodySchema } } },
  },
  responses: {
    200: jsonSuccessResponse(z.object({ userId: z.string(), permission: z.string(), orgId: z.string(), effect: z.enum(["allow", "deny"]) }), "已授予"),
    ...authErrorResponses,
    404: jsonErrorResponse("权限或组织不存在"),
  },
});

export const deleteUserPermissionRoute = createRoute({
  method: "delete",
  path: "/users/{userId}/permissions/{permission}",
  tags: ["IAM"],
  operationId: "deleteUserPermission",
  summary: "撤用户直接权限(需 orgId 查询参数定位)",
  middleware: assignmentsManageMiddleware,
  security: authedSecurity,
  request: { params: UserPermissionParamSchema, query: OrgIdQuerySchema },
  responses: {
    200: jsonSuccessResponse(z.object({ userId: z.string(), permission: z.string(), orgId: z.string() }), "已撤销"),
    ...authErrorResponses,
    404: jsonErrorResponse("授权不存在"),
  },
});

export const listUserPermissionsRoute = createRoute({
  method: "get",
  path: "/users/{userId}/permissions",
  tags: ["IAM"],
  operationId: "listUserPermissions",
  summary: "列出用户在某组织的有效权限全集",
  middleware: iamReadMiddleware,
  security: authedSecurity,
  request: { params: z.object({ userId: z.string() }), query: OrgIdQuerySchema },
  responses: {
    200: jsonSuccessResponse(z.array(z.string()), "有效权限名列表"),
    ...authErrorResponses,
  },
});

export const listUserRolesRoute = createRoute({
  method: "get",
  path: "/users/{userId}/roles",
  tags: ["IAM"],
  operationId: "listUserRoles",
  summary: "列出用户在某组织已授的角色记录",
  description: "返回用户在目标组织**直接授予**的角色记录(非祖先继承),含过期时间。供管理端撤销授权用。",
  middleware: iamReadMiddleware,
  security: authedSecurity,
  request: { params: z.object({ userId: z.string() }), query: OrgIdQuerySchema },
  responses: {
    200: jsonSuccessResponse(z.array(UserRoleAssignmentSchema), "已授角色记录列表"),
    ...authErrorResponses,
  },
});

export const listUserDirectPermissionsRoute = createRoute({
  method: "get",
  path: "/users/{userId}/direct-permissions",
  tags: ["IAM"],
  operationId: "listUserDirectPermissions",
  summary: "列出用户在某组织的直接授权记录",
  description: "返回用户在目标组织**直接授予**的权限记录(allow/deny,非祖先继承),含 effect 与过期。供管理端撤销授权用。与有效全集 `listUserPermissions`(含祖先继承、CTE 计算)区分。",
  middleware: iamReadMiddleware,
  security: authedSecurity,
  request: { params: z.object({ userId: z.string() }), query: OrgIdQuerySchema },
  responses: {
    200: jsonSuccessResponse(z.array(UserDirectPermissionSchema), "直接授权记录列表"),
    ...authErrorResponses,
  },
});

// --- 组织 ---
export const listOrganizationsRoute = createRoute({
  method: "get",
  path: "/organizations",
  tags: ["IAM"],
  operationId: "listOrganizations",
  summary: "列出所有组织(扁平,前端构建树)",
  middleware: iamReadMiddleware,
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
  summary: "创建组织(可指定父组织)",
  middleware: organizationsManageMiddleware,
  security: authedSecurity,
  request: { body: { content: { "application/json": { schema: CreateOrganizationSchema } } } },
  responses: {
    200: jsonSuccessResponse(OrganizationSchema, "创建成功"),
    ...authErrorResponses,
    404: jsonErrorResponse("父组织不存在"),
  },
});

export const getOrganizationRoute = createRoute({
  method: "get",
  path: "/organizations/{orgId}",
  tags: ["IAM"],
  operationId: "getOrganization",
  summary: "获取组织详情",
  middleware: iamReadMiddleware,
  security: authedSecurity,
  request: { params: OrganizationIdParamSchema },
  responses: {
    200: jsonSuccessResponse(OrganizationSchema, "组织详情"),
    ...authErrorResponses,
    404: jsonErrorResponse("组织不存在"),
  },
});

export const updateOrganizationRoute = createRoute({
  method: "patch",
  path: "/organizations/{orgId}",
  tags: ["IAM"],
  operationId: "updateOrganization",
  summary: "修改组织(改 parentId 时防环)",
  middleware: organizationsManageMiddleware,
  security: authedSecurity,
  request: {
    params: OrganizationIdParamSchema,
    body: { content: { "application/json": { schema: UpdateOrganizationSchema } } },
  },
  responses: {
    200: jsonSuccessResponse(OrganizationSchema, "修改成功"),
    ...authErrorResponses,
    404: jsonErrorResponse("组织不存在"),
    409: jsonErrorResponse("会形成环"),
  },
});

export const deleteOrganizationRoute = createRoute({
  method: "delete",
  path: "/organizations/{orgId}",
  tags: ["IAM"],
  operationId: "deleteOrganization",
  summary: "删除组织(有子组织拒绝)",
  middleware: organizationsManageMiddleware,
  security: authedSecurity,
  request: { params: OrganizationIdParamSchema },
  responses: {
    200: jsonSuccessResponse(z.object({ id: z.string() }), "删除成功"),
    ...authErrorResponses,
    404: jsonErrorResponse("组织不存在"),
    409: jsonErrorResponse("有子组织"),
  },
});

export type ListPermissionsRoute = typeof listPermissionsRoute;
export type ListUsersRoute = typeof listUsersRoute;
export type CreateUserRoute = typeof createUserRoute;
export type UpdateUserRoute = typeof updateUserRoute;
export type ResetUserPasswordRoute = typeof resetUserPasswordRoute;
export type DisableUserRoute = typeof disableUserRoute;
export type EnableUserRoute = typeof enableUserRoute;
export type ListRolesRoute = typeof listRolesRoute;
export type CreateRoleRoute = typeof createRoleRoute;
export type UpdateRoleRoute = typeof updateRoleRoute;
export type DeleteRoleRoute = typeof deleteRoleRoute;
export type ListRolePermissionsRoute = typeof listRolePermissionsRoute;
export type AssignRolePermissionsRoute = typeof assignRolePermissionsRoute;
export type DeleteRolePermissionRoute = typeof deleteRolePermissionRoute;
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
