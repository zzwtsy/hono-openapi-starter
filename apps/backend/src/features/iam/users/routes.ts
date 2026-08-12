import { createRoute, z } from "@hono/zod-openapi";

import { audit } from "@/core/audit/index.js";
import { jsonErrorResponse, jsonErrorResponses, jsonSuccessResponse } from "@/core/http/openapi/helpers.js";
import { authedSecurity } from "@/core/http/openapi/security.js";
import { iamAuditActions } from "../audit-actions.js";
import {
  CreateUserSchema,
  ResetPasswordSchema,
  TransferUserOrgSchema,
  UpdateUserSchema,
  UserIdParamSchema,
  UserSummarySchema,
} from "../schemas.js";
import { IamService } from "../service.js";
import {
  authErrorResponses,
  usersCreateMiddleware,
  usersDisableMiddleware,
  usersEnableMiddleware,
  usersReadMiddleware,
  usersResetPasswordMiddleware,
  usersUpdateMiddleware,
} from "../shared/route-helpers.js";

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
  middleware: [...usersCreateMiddleware, audit({
    action: iamAuditActions.userCreate,
    resourceType: "user",
    resourceId: async (c) => {
      const body = await c.res.clone().json() as { data?: { id?: string } };
      return body.data?.id ?? "";
    },
    relations: [{ field: "orgId", resourceType: "org" }],
    after: "response",
  })],
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
  middleware: [...usersUpdateMiddleware, audit({
    action: iamAuditActions.userUpdate,
    resourceType: "user",
    resourceId: c => c.req.param("userId")!,
    before: async c => IamService.getUserById(c.req.param("userId")!),
    after: "response",
  })],
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
  middleware: [...usersResetPasswordMiddleware, audit({
    action: iamAuditActions.userResetPassword,
    resourceType: "user",
    resourceId: c => c.req.param("userId")!,
    after: "none",
  })],
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
  middleware: [...usersDisableMiddleware, audit({
    action: iamAuditActions.userDisable,
    resourceType: "user",
    resourceId: c => c.req.param("userId")!,
    before: async c => IamService.getUserById(c.req.param("userId")!),
    after: "response",
  })],
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
  middleware: [...usersEnableMiddleware, audit({
    action: iamAuditActions.userEnable,
    resourceType: "user",
    resourceId: c => c.req.param("userId")!,
    before: async c => IamService.getUserById(c.req.param("userId")!),
    after: "response",
  })],
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
  middleware: [...usersUpdateMiddleware, audit({
    action: iamAuditActions.userTransferOrg,
    resourceType: "user",
    resourceId: c => c.req.param("userId")!,
    relations: [{ field: "orgId", resourceType: "org" }],
    before: async c => IamService.getUserById(c.req.param("userId")!),
    metadata: async (c) => {
      // 路由 middleware 先于 zod validators 执行,valid() 不可用;c.req.json() 有 Hono body 缓存,后读安全。
      const body = await c.req.json<{ clearAllGrants?: boolean }>();
      return { clearAllGrants: body.clearAllGrants ?? false };
    },
    after: "response",
  })],
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

export type ListUsersRoute = typeof listUsersRoute;
export type CreateUserRoute = typeof createUserRoute;
export type UpdateUserRoute = typeof updateUserRoute;
export type ResetUserPasswordRoute = typeof resetUserPasswordRoute;
export type DisableUserRoute = typeof disableUserRoute;
export type EnableUserRoute = typeof enableUserRoute;
export type TransferUserOrganizationRoute = typeof transferUserOrganizationRoute;
