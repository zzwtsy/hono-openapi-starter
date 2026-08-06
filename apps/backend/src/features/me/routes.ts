import { createRoute, z } from "@hono/zod-openapi";

import { audit } from "@/core/audit/index.js";
import { requireAuth } from "@/core/auth/require-auth.js";
import { jsonErrorResponse, jsonErrorResponses, jsonSuccessResponse } from "@/core/http/openapi/helpers.js";
import { authedSecurity } from "@/core/http/openapi/security.js";
import { meAuditActions } from "./audit-actions.js";
import { ChangeMyPasswordSchema, MeSchema, UpdateMeSchema, UserSchema } from "./schemas.js";
import { MeService } from "./service.js";

export const getMeRoute = createRoute({
  method: "get",
  path: "/me",
  tags: ["Me"],
  operationId: "getMe",
  summary: "获取当前用户信息与权限",
  description: "返回当前登录用户信息及在其所属组织下的有效权限全集。未绑定组织时 permissions 为空。",
  middleware: [requireAuth()],
  security: authedSecurity,
  responses: {
    200: jsonSuccessResponse(MeSchema, "当前用户与权限"),
    401: jsonErrorResponse("未认证", "COMMON_UNAUTHORIZED"),
  },
});

export type GetMeRoute = typeof getMeRoute;

export const updateMeRoute = createRoute({
  method: "patch",
  path: "/me",
  tags: ["Me"],
  operationId: "updateMe",
  summary: "自助修改显示名",
  description: "当前用户修改自己的显示名(name)。不改 email/orgId/disabled;不删 session。",
  middleware: [requireAuth(), audit({
    action: meAuditActions.update,
    resourceType: "user",
    resourceId: c => c.get("user")?.id ?? "",
    before: async c => MeService.getUserSnapshot(c.get("user")?.id ?? ""),
  })],
  security: authedSecurity,
  request: {
    body: {
      content: { "application/json": { schema: UpdateMeSchema } },
    },
  },
  responses: {
    200: jsonSuccessResponse(UserSchema, "更新后的用户信息"),
    401: jsonErrorResponse("未认证", "COMMON_UNAUTHORIZED"),
    404: jsonErrorResponse("用户不存在", "USER_NOT_FOUND"),
  },
});

export type UpdateMeRoute = typeof updateMeRoute;

export const changeMyPasswordRoute = createRoute({
  method: "post",
  path: "/me/password",
  tags: ["Me"],
  operationId: "changeMyPassword",
  summary: "自助修改密码",
  description:
    "当前用户修改自己的密码:验证当前密码 → 更新 → 删除全部 session(强制重新登录)。OAuth 用户无 credential account 返回 404。",
  middleware: [requireAuth(), audit({
    action: meAuditActions.changePassword,
    resourceType: "user",
    resourceId: c => c.get("user")?.id ?? "",
  })],
  security: authedSecurity,
  request: {
    body: {
      content: { "application/json": { schema: ChangeMyPasswordSchema } },
    },
  },
  responses: {
    200: jsonSuccessResponse(z.null(), "密码已修改,需重新登录"),
    401: jsonErrorResponses("当前密码错误或未认证", ["USER_INVALID_PASSWORD", "COMMON_UNAUTHORIZED"]),
    404: jsonErrorResponse("无 credential account", "USER_NO_CREDENTIAL_ACCOUNT"),
  },
});

export type ChangeMyPasswordRoute = typeof changeMyPasswordRoute;
