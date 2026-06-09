import { createRoute } from "@hono/zod-openapi";

import { jsonErrorResponse, jsonSuccessResponse } from "../../core/http/openapi/helpers.js";
import { HealthStatusSchema } from "./schemas.js";

export const getHealthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["Health"],
  operationId: "getHealth",
  summary: "获取服务健康状态",
  description: "返回当前服务的健康状态。",
  responses: {
    200: jsonSuccessResponse(HealthStatusSchema, "服务健康。"),
    500: jsonErrorResponse("内部服务器错误。"),
  },
});

export type GetHealthRoute = typeof getHealthRoute;
