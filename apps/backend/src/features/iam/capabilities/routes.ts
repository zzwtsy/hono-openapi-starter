import { createRoute } from "@hono/zod-openapi";

import { requireAuth } from "@/core/auth/require-auth.js";
import { jsonSuccessResponse } from "@/core/http/openapi/helpers.js";
import { authedSecurity } from "@/core/http/openapi/security.js";
import { TargetCapabilitiesQuerySchema, TargetCapabilitiesSchema } from "../schemas.js";
import { authErrorResponses } from "../shared/route-helpers.js";

export const getTargetCapabilitiesRoute = createRoute({
  method: "get",
  path: "/me/capabilities",
  tags: ["IAM"],
  operationId: "getTargetCapabilities",
  summary: "获取目标组织能力",
  description: "返回当前用户在管理子树内目标组织的有效权限；仅供前端 UX 门控，后端写操作仍会重新鉴权。",
  middleware: [requireAuth()],
  security: authedSecurity,
  request: { query: TargetCapabilitiesQuerySchema },
  responses: {
    200: jsonSuccessResponse(TargetCapabilitiesSchema, "目标组织能力"),
    ...authErrorResponses,
  },
});

export type GetTargetCapabilitiesRoute = typeof getTargetCapabilitiesRoute;
