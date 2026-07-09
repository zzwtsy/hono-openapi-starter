import type { GetHealthRoute, GetHealthzRoute, GetReadyzRoute } from "./routes.js";

import type { AppRouteHandler } from "@/core/http/context.js";

import { sql } from "drizzle-orm";
import { AppError } from "@/core/errors/app-error.js";
import { successResponse } from "@/core/http/response.js";
import { logger } from "@/core/logger/index.js";
import { db } from "@/db/client.js";

/** 获取服务健康状态。 */
export const getHealthHandler: AppRouteHandler<GetHealthRoute> = (c) => {
  return successResponse(c, { status: "ok" as const });
};

/** 存活探针:进程活即 ok,不查依赖。 */
export const getHealthzHandler: AppRouteHandler<GetHealthzRoute> = (c) => {
  return successResponse(c, { status: "ok" as const });
};

/** 就绪探针:查 DB 连接,失败抛 503(经 errorHandler 转 envelope)。 */
export const getReadyzHandler: AppRouteHandler<GetReadyzRoute> = async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
    return successResponse(c, { status: "ready" as const });
  } catch (error) {
    logger.withError(error).warn("readyz: DB 未就绪");
    throw new AppError("COMMON_SERVICE_UNAVAILABLE");
  }
};
