import { createRoute } from "@hono/zod-openapi";

import { requireAuth } from "@/core/auth/require-auth.js";
import { jsonErrorResponse, jsonSuccessResponse } from "@/core/http/openapi/helpers.js";
import { authedSecurity } from "@/core/http/openapi/security.js";
import { MeSchema } from "./schemas.js";

export const getMeRoute = createRoute({
  method: "get",
  path: "/me",
  tags: ["Me"],
  operationId: "getMe",
  summary: "获取当前用户信息与有效权限",
  description: "返回当前登录用户信息及在其所属组织下的有效权限全集。未绑定组织时 permissions 为空。",
  middleware: [requireAuth()],
  security: authedSecurity,
  responses: {
    200: jsonSuccessResponse(MeSchema, "当前用户与权限"),
    401: jsonErrorResponse("未认证", "COMMON_UNAUTHORIZED"),
  },
});

export type GetMeRoute = typeof getMeRoute;
