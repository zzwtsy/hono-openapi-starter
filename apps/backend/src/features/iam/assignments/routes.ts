import { createRoute, z } from "@hono/zod-openapi";

import { audit } from "@/core/audit/index.js";
import { jsonErrorResponse, jsonErrorResponses, jsonSuccessResponse } from "@/core/http/openapi/helpers.js";
import { authedSecurity } from "@/core/http/openapi/security.js";
import { iamAuditActions } from "../audit-actions.js";
import {
  OrgIdQuerySchema,
  PermissionCodeSchema,
  UserDirectPermissionSchema,
  UserIdParamSchema,
  UserPermissionBodySchema,
  UserPermissionParamSchema,
  UserPermissionsResultSchema,
  UserRoleAssignmentSchema,
  UserRoleBodySchema,
  UserRoleParamSchema,
} from "../schemas.js";
import { IamService } from "../service.js";
import {
  assignmentsGrantMiddleware,
  assignmentsReadMiddleware,
  assignmentsRevokeMiddleware,
  authErrorResponses,
} from "../shared/route-helpers.js";

export const assignUserRoleRoute = createRoute({
  method: "post",
  path: "/users/{userId}/roles/{roleId}",
  tags: ["IAM"],
  operationId: "assignUserRole",
  summary: "授用户角色",
  description: "给用户在指定组织授予角色,可指定过期。重复授可续期。需 assignments.grant。",
  middleware: [...assignmentsGrantMiddleware, audit({
    action: iamAuditActions.assignmentGrantRole,
    resourceRefs: c => [
      { type: "user", id: c.req.param("userId")! },
      { type: "role", id: c.req.param("roleId")! },
    ],
    relations: [{ field: "orgId", resourceType: "org" }],
    before: async (c) => {
      // 路由 middleware 先于 zod validators 执行,valid() 不可用;c.req.json() 有 Hono body 缓存,后读安全。
      const body = await c.req.json<{ orgId?: string }>();
      return IamService.getUserRoleGrant(c.req.param("userId")!, c.req.param("roleId")!, body.orgId ?? "");
    },
    after: async (c) => {
      const body = await c.req.json<{ orgId?: string }>();
      return IamService.getUserRoleGrant(c.req.param("userId")!, c.req.param("roleId")!, body.orgId ?? "");
    },
  })],
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
  middleware: [...assignmentsRevokeMiddleware, audit({
    action: iamAuditActions.assignmentRevokeRole,
    resourceRefs: c => [
      { type: "user", id: c.req.param("userId")! },
      { type: "role", id: c.req.param("roleId")! },
    ],
    before: async c => IamService.getUserRoleGrant(
      c.req.param("userId")!,
      c.req.param("roleId")!,
      c.req.query("orgId") ?? "",
    ),
    after: async () => null,
  })],
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
  path: "/users/{userId}/permissions/{permissionCode}",
  tags: ["IAM"],
  operationId: "assignUserPermission",
  summary: "授用户权限",
  description: "给用户在指定组织直接授予权限(allow 或 deny),可指定过期。重复授时 effect 以新值为准。需 assignments.grant。",
  middleware: [...assignmentsGrantMiddleware, audit({
    action: iamAuditActions.assignmentGrantPermission,
    resourceType: "user",
    resourceId: c => c.req.param("userId")!,
    before: async (c) => {
      // 路由 middleware 先于 zod validators 执行,valid() 不可用;c.req.json() 有 Hono body 缓存,后读安全。
      const body = await c.req.json<{ orgId?: string }>();
      return IamService.getUserPermissionGrant(c.req.param("userId")!, c.req.param("permissionCode")!, body.orgId ?? "");
    },
    after: async (c) => {
      const body = await c.req.json<{ orgId?: string }>();
      return IamService.getUserPermissionGrant(c.req.param("userId")!, c.req.param("permissionCode")!, body.orgId ?? "");
    },
  })],
  security: authedSecurity,
  request: {
    params: UserPermissionParamSchema,
    body: { content: { "application/json": { schema: UserPermissionBodySchema } } },
  },
  responses: {
    200: jsonSuccessResponse(z.object({ userId: z.string(), permissionCode: PermissionCodeSchema, orgId: z.string(), effect: z.enum(["allow", "deny"]) }), "已授予"),
    400: jsonErrorResponse("权限 code 无效", "PERMISSION_CODE_INVALID"),
    ...authErrorResponses,
    404: jsonErrorResponses("权限或组织不存在", ["PERMISSION_NOT_FOUND", "ORG_NOT_FOUND"]),
  },
});

export const deleteUserPermissionRoute = createRoute({
  method: "delete",
  path: "/users/{userId}/permissions/{permissionCode}",
  tags: ["IAM"],
  operationId: "deleteUserPermission",
  summary: "撤用户权限",
  description: "撤销用户在指定组织的直接权限授权(需 permissionCode + orgId 定位)。禁止撤销自己的授权。需 assignments.revoke。",
  middleware: [...assignmentsRevokeMiddleware, audit({
    action: iamAuditActions.assignmentRevokePermission,
    resourceType: "user",
    resourceId: c => c.req.param("userId")!,
    before: async c => IamService.getUserPermissionGrant(
      c.req.param("userId")!,
      c.req.param("permissionCode")!,
      c.req.query("orgId") ?? "",
    ),
    after: async () => null,
  })],
  security: authedSecurity,
  request: { params: UserPermissionParamSchema, query: OrgIdQuerySchema },
  responses: {
    200: jsonSuccessResponse(z.object({ userId: z.string(), permissionCode: PermissionCodeSchema, orgId: z.string() }), "已撤销"),
    400: jsonErrorResponse("权限 code 无效", "PERMISSION_CODE_INVALID"),
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

export type AssignUserRoleRoute = typeof assignUserRoleRoute;
export type DeleteUserRoleRoute = typeof deleteUserRoleRoute;
export type AssignUserPermissionRoute = typeof assignUserPermissionRoute;
export type DeleteUserPermissionRoute = typeof deleteUserPermissionRoute;
export type ListUserPermissionsRoute = typeof listUserPermissionsRoute;
export type ListUserRolesRoute = typeof listUserRolesRoute;
export type ListUserDirectPermissionsRoute = typeof listUserDirectPermissionsRoute;
