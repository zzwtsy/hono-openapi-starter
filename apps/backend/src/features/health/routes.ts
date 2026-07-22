import { createRoute } from "@hono/zod-openapi";

import { jsonErrorResponse, jsonSuccessResponse } from "../../core/http/openapi/helpers.js";
import { HealthStatusSchema, HealthzSchema, ReadyzSchema } from "./schemas.js";

export const getHealthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["Health"],
  operationId: "getHealth",
  summary: "获取服务健康状态",
  description: "返回当前服务的健康状态",
  responses: {
    200: jsonSuccessResponse(HealthStatusSchema, "服务健康"),
    500: jsonErrorResponse("内部服务器错误", "COMMON_INTERNAL_ERROR"),
  },
});

export const getHealthzRoute = createRoute({
  method: "get",
  path: "/healthz",
  tags: ["Health"],
  operationId: "getHealthz",
  summary: "存活探针",
  description: "进程存活即返回 ok,不检查依赖。供 K8s livenessProbe。",
  responses: {
    200: jsonSuccessResponse(HealthzSchema, "存活"),
    500: jsonErrorResponse("内部服务器错误", "COMMON_INTERNAL_ERROR"),
  },
});

export const getReadyzRoute = createRoute({
  method: "get",
  path: "/readyz",
  tags: ["Health"],
  operationId: "getReadyz",
  summary: "就绪探针",
  description: "检查 DB 连接;就绪返回 ready,否则 503。供 K8s readinessProbe。",
  responses: {
    200: jsonSuccessResponse(ReadyzSchema, "就绪"),
    503: jsonErrorResponse("DB 未就绪", "COMMON_SERVICE_UNAVAILABLE"),
  },
});

export type GetHealthRoute = typeof getHealthRoute;
export type GetHealthzRoute = typeof getHealthzRoute;
export type GetReadyzRoute = typeof getReadyzRoute;
