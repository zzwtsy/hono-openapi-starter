import { createRoute, z } from "@hono/zod-openapi";

import { requireAuth } from "@/core/auth/require-auth.js";
import { requirePermission } from "@/core/auth/require-permission.js";
import { jsonErrorResponse, jsonSuccessResponse } from "@/core/http/openapi/helpers.js";
import { authedSecurity } from "@/core/http/openapi/security.js";
import { SettingKeyParamSchema, SystemSettingSchema, UpdateSettingSchema } from "./schemas.js";

const authErrorResponses = {
  401: jsonErrorResponse("未认证", "COMMON_UNAUTHORIZED"),
  403: jsonErrorResponse("无权限", "COMMON_FORBIDDEN"),
};

export const listSettingsRoute = createRoute({
  method: "get",
  path: "/settings",
  tags: ["Settings"],
  operationId: "listSettings",
  summary: "列出全部系统配置",
  description: "返回全部系统配置。需 settings.read 权限。",
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
  description: "upsert 一条配置。需 settings.update 权限。",
  middleware: [requireAuth(), requirePermission("settings.update")] as const,
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
