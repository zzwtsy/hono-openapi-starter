import { createRoute, z } from "@hono/zod-openapi";

import { audit } from "@/core/audit/index.js";
import { jsonErrorResponse, jsonErrorResponses, jsonSuccessResponse } from "@/core/http/openapi/helpers.js";
import { authedSecurity } from "@/core/http/openapi/security.js";
import { iamAuditActions } from "../audit-actions.js";
import {
  AssignRolePermissionsSchema,
  CreateRoleSchema,
  PermissionCodeSchema,
  PermissionSchema,
  RoleIdParamSchema,
  RoleSchema,
  RoleUserAssignmentSchema,
  UpdateRolePermissionsSchema,
  UpdateRoleSchema,
} from "../schemas.js";
import { IamService } from "../service.js";
import {
  assignmentsReadMiddleware,
  authErrorResponses,
  rolePermissionsUpdateMiddleware,
  rolesAssignPermissionsMiddleware,
  rolesCreateMiddleware,
  rolesDeleteMiddleware,
  rolesReadMiddleware,
  rolesRevokePermissionsMiddleware,
  rolesUpdateMiddleware,
} from "../shared/route-helpers.js";

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
  middleware: [...rolesCreateMiddleware, audit({
    action: iamAuditActions.roleCreate,
    resourceType: "role",
    resourceId: async (c) => {
      const body = await c.res.clone().json() as { data?: { id?: string } };
      return body.data?.id ?? "";
    },
    after: "response",
  })],
  security: authedSecurity,
  request: { body: { content: { "application/json": { schema: CreateRoleSchema } } } },
  responses: {
    200: jsonSuccessResponse(RoleSchema, "创建成功"),
    ...authErrorResponses,
    403: jsonErrorResponses("仅系统根管理员可创建全局角色", ["COMMON_FORBIDDEN", "ROLE_REQUIRES_SYSTEM_ROOT"]),
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
  middleware: [...rolesUpdateMiddleware, audit({
    action: iamAuditActions.roleUpdate,
    resourceType: "role",
    resourceId: c => c.req.param("roleId")!,
    before: async c => IamService.getRoleById(c.req.param("roleId")!),
    after: "response",
  })],
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
  middleware: [...rolesDeleteMiddleware, audit({
    action: iamAuditActions.roleDelete,
    resourceType: "role",
    resourceId: c => c.req.param("roleId")!,
    before: async c => IamService.getRoleById(c.req.param("roleId")!),
    after: async () => null,
  })],
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
  description: "返回角色已配置的权限展示引用列表。需 roles.read。",
  middleware: rolesReadMiddleware,
  security: authedSecurity,
  request: { params: RoleIdParamSchema },
  responses: {
    200: jsonSuccessResponse(z.array(PermissionSchema), "权限列表"),
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
  middleware: [...rolesAssignPermissionsMiddleware, audit({
    action: iamAuditActions.roleAssignPermissions,
    resourceType: "role",
    resourceId: c => c.req.param("roleId")!,
    before: async c => IamService.listRolePermissions(c.req.param("roleId")!),
    after: "response",
  })],
  security: authedSecurity,
  request: {
    params: RoleIdParamSchema,
    body: { content: { "application/json": { schema: AssignRolePermissionsSchema } } },
  },
  responses: {
    200: jsonSuccessResponse(z.array(PermissionSchema), "角色当前权限列表"),
    400: jsonErrorResponse("权限 code 无效", "PERMISSION_CODE_INVALID"),
    ...authErrorResponses,
    404: jsonErrorResponses("角色或权限不存在", ["ROLE_NOT_FOUND", "PERMISSION_NOT_FOUND"]),
  },
});

export const updateRolePermissionsRoute = createRoute({
  method: "patch",
  path: "/roles/{roleId}/permissions",
  tags: ["IAM"],
  operationId: "updateRolePermissions",
  summary: "批量更新角色权限",
  description: "原子批量新增和撤销实例角色权限。code 角色不可修改。权限按变更方向分别校验。",
  middleware: [...rolePermissionsUpdateMiddleware, audit({
    action: iamAuditActions.roleUpdatePermissions,
    resourceType: "role",
    resourceId: c => c.req.param("roleId")!,
    before: async c => IamService.listRolePermissions(c.req.param("roleId")!),
    after: "response",
  })],
  security: authedSecurity,
  request: {
    params: RoleIdParamSchema,
    body: { content: { "application/json": { schema: UpdateRolePermissionsSchema } } },
  },
  responses: {
    200: jsonSuccessResponse(z.array(PermissionSchema), "角色当前权限列表"),
    400: jsonErrorResponse("权限 code 无效", "PERMISSION_CODE_INVALID"),
    422: jsonErrorResponse("新增和撤销权限不能重复", "COMMON_VALIDATION_FAILED"),
    ...authErrorResponses,
    404: jsonErrorResponses("角色或权限不存在", ["ROLE_NOT_FOUND", "PERMISSION_NOT_FOUND"]),
  },
});

export const deleteRolePermissionRoute = createRoute({
  method: "delete",
  path: "/roles/{roleId}/permissions/{permissionCode}",
  tags: ["IAM"],
  operationId: "deleteRolePermission",
  summary: "撤角色权限",
  description: "撤销实例角色的单个权限。需 roles.revoke-permissions。",
  middleware: [...rolesRevokePermissionsMiddleware, audit({
    action: iamAuditActions.roleRevokePermission,
    resourceType: "role",
    resourceId: c => c.req.param("roleId")!,
    before: async c => IamService.listRolePermissions(c.req.param("roleId")!),
    after: "none",
  })],
  security: authedSecurity,
  request: { params: z.object({ roleId: z.string(), permissionCode: PermissionCodeSchema }) },
  responses: {
    200: jsonSuccessResponse(z.object({ permissionCode: PermissionCodeSchema }), "已撤销"),
    400: jsonErrorResponse("权限 code 无效", "PERMISSION_CODE_INVALID"),
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

export type ListRolesRoute = typeof listRolesRoute;
export type CreateRoleRoute = typeof createRoleRoute;
export type UpdateRoleRoute = typeof updateRoleRoute;
export type DeleteRoleRoute = typeof deleteRoleRoute;
export type ListRolePermissionsRoute = typeof listRolePermissionsRoute;
export type AssignRolePermissionsRoute = typeof assignRolePermissionsRoute;
export type UpdateRolePermissionsRoute = typeof updateRolePermissionsRoute;
export type DeleteRolePermissionRoute = typeof deleteRolePermissionRoute;
export type ListRoleUsersRoute = typeof listRoleUsersRoute;
