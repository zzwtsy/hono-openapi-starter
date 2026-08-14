import { createRoute } from "@hono/zod-openapi";

import { requireAuth } from "@/core/auth/require-auth.js";
import { jsonErrorResponse, jsonSuccessResponse } from "@/core/http/openapi/helpers.js";
import { authedSecurity } from "@/core/http/openapi/security.js";
import { MyAuthorizationSchema } from "../schemas.js";

export const getMyAuthorizationRoute = createRoute({
  method: "get",
  path: "/me/authorization",
  tags: ["IAM"],
  operationId: "getMyAuthorization",
  summary: "查看我的授权来源",
  description: "返回当前用户 Home org 及祖先 Grant org 的授权记录，以及 Home org 下的有效权限和来源链；仅需认证。",
  middleware: [requireAuth()],
  security: authedSecurity,
  responses: {
    200: jsonSuccessResponse(MyAuthorizationSchema, "我的授权来源"),
    401: jsonErrorResponse("未认证", "COMMON_UNAUTHORIZED"),
    500: jsonErrorResponse("用户组织不变量损坏", "COMMON_INTERNAL_ERROR"),
  },
});

export type GetMyAuthorizationRoute = typeof getMyAuthorizationRoute;
