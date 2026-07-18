import type { GetHealthRoute, GetHealthzRoute, GetReadyzRoute } from "./routes.js";

import type { AppRouteHandler } from "@/core/http/context.js";

import { sql } from "drizzle-orm";
import { AppError } from "@/core/errors/app-error.js";
import { successResponse } from "@/core/http/response.js";
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
    // 不在此处记日志：直接抛出让 errorHandler 用 c.var.logger（带 requestId）统一记录，
    // 避免全局 logger（无请求上下文）与 onError 各记一条导致重复/上下文不一致。
    throw new AppError("COMMON_SERVICE_UNAVAILABLE", { cause: error });
  }
};
