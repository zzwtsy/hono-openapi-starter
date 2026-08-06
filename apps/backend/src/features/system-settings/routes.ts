import { createRoute, z } from "@hono/zod-openapi";

import { audit } from "@/core/audit/index.js";
import { requireAuth } from "@/core/auth/require-auth.js";
import { requirePermission } from "@/core/auth/require-permission.js";
import { jsonErrorResponse, jsonSuccessResponse } from "@/core/http/openapi/helpers.js";
import { authedSecurity } from "@/core/http/openapi/security.js";
import { systemSettingsAuditActions } from "./audit-actions.js";
import { SettingKeyParamSchema, SystemSettingSchema, UpdateSettingSchema } from "./schemas.js";
import { SystemSettingService } from "./service.js";

const authErrorResponses = {
  401: jsonErrorResponse("未认证", "COMMON_UNAUTHORIZED"),
  403: jsonErrorResponse("无权限", "COMMON_FORBIDDEN"),
};

export const listSettingsRoute = createRoute({
  method: "get",
  path: "/settings",
  tags: ["Settings"],
  operationId: "listSettings",
  summary: "列出系统配置",
  description: "返回全部系统配置。需 settings.read。",
  middleware: [requireAuth(), requirePermission("settings.read")],
  security: authedSecurity,
  responses: {
    200: jsonSuccessResponse(z.array(SystemSettingSchema), "配置列表"),
    ...authErrorResponses,
  },
});

export const updateSettingRoute = createRoute({
  method: "patch",
  path: "/settings/{key}",
  tags: ["Settings"],
  operationId: "updateSetting",
  summary: "修改或创建系统配置",
  description: "修改或创建一条配置。需 settings.update。",
  middleware: [requireAuth(), requirePermission("settings.update"), audit({
    action: systemSettingsAuditActions.update,
    resourceType: "setting",
    resourceId: c => c.req.param("key") ?? "",
    before: async (c) => {
      return SystemSettingService.get(c.req.param("key") ?? "");
    },
    after: "response",
  })] as const,
  security: authedSecurity,
  request: {
    params: SettingKeyParamSchema,
    body: { content: { "application/json": { schema: UpdateSettingSchema } } },
  },
  responses: {
    200: jsonSuccessResponse(SystemSettingSchema, "修改成功"),
    ...authErrorResponses,
  },
});

export type ListSettingsRoute = typeof listSettingsRoute;
export type UpdateSettingRoute = typeof updateSettingRoute;
