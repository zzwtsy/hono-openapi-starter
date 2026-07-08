import { createRoute, z } from "@hono/zod-openapi";

import { requireAuth } from "@/core/auth/require-auth.js";
import { requirePermission } from "@/core/auth/require-permission.js";
import { jsonErrorResponse, jsonSuccessResponse } from "@/core/http/openapi/helpers.js";
import { authedSecurity } from "@/core/http/openapi/security.js";
import {
  AssignRolePermissionsSchema,
  CreateOrganizationSchema,
  CreateRoleSchema,
  OrganizationIdParamSchema,
  OrganizationSchema,
  OrgIdQuerySchema,
  PermissionSchema,
  RoleIdParamSchema,
  RoleSchema,
  UpdateOrganizationSchema,
  UpdateRoleSchema,
  UserPermissionBodySchema,
  UserPermissionParamSchema,
  UserRoleBodySchema,
  UserRoleParamSchema,
} from "./schemas.js";

/** iam feature 共享:认证 + 权限 + 401/403 响应。 */
const iamReadMiddleware = [requireAuth(), requirePermission("iam.read")];
const iamManageMiddleware = [requireAuth(), requirePermission("iam.manage")];
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
  middleware: iamManageMiddleware,
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
  middleware: iamManageMiddleware,
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
  middleware: iamManageMiddleware,
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
  middleware: iamManageMiddleware,
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
  middleware: iamManageMiddleware,
  security: authedSecurity,
  request: { params: z.object({ roleId: z.string(), permission: z.string() }) },
  responses: {
    200: jsonSuccessResponse(z.object({ permission: z.string() }), "已撤销"),
    ...authErrorResponses,
    404: jsonErrorResponse("角色不存在"),
  },
});

// --- 用户授权 ---
export const assignUserRoleRoute = createRoute({
  method: "post",
  path: "/users/{userId}/roles/{roleId}",
  tags: ["IAM"],
  operationId: "assignUserRole",
  summary: "授用户角色(绑定组织,可指定过期)",
  middleware: iamManageMiddleware,
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
  middleware: iamManageMiddleware,
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
  middleware: iamManageMiddleware,
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
  middleware: iamManageMiddleware,
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
  middleware: iamManageMiddleware,
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
  middleware: iamManageMiddleware,
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
  middleware: iamManageMiddleware,
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
export type ListOrganizationsRoute = typeof listOrganizationsRoute;
export type CreateOrganizationRoute = typeof createOrganizationRoute;
export type GetOrganizationRoute = typeof getOrganizationRoute;
export type UpdateOrganizationRoute = typeof updateOrganizationRoute;
export type DeleteOrganizationRoute = typeof deleteOrganizationRoute;
