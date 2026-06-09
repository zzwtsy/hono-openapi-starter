import { z } from "@hono/zod-openapi";

export const HealthStatusSchema = z.object({
  status: z.literal("ok").openapi({
    description: "当前服务健康状态。",
    example: "ok",
  }),
}).openapi("HealthStatus");
