import { z } from "@hono/zod-openapi";

export const HealthStatusSchema = z.object({
  status: z.literal("ok").openapi({
    description: "当前服务健康状态。",
    example: "ok",
  }),
}).openapi("HealthStatus");

/** 存活探针(liveness)响应。 */
export const HealthzSchema = z.object({
  status: z.literal("ok").openapi({ description: "进程存活", example: "ok" }),
}).openapi("HealthzStatus");

/** 就绪探针(readiness)响应。 */
export const ReadyzSchema = z.object({
  status: z.literal("ready").openapi({ description: "依赖就绪", example: "ready" }),
}).openapi("ReadyzStatus");
