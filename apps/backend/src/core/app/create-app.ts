import { honoLogLayer } from "@loglayer/hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import env from "../../env.js";
import { permissionCacheMiddleware } from "../authorization/index.js";
import { errorHandler } from "../errors/error-handler.js";
import { requestIdMiddleware, resolveRequestId } from "../http/request-id-middleware.js";
import { logger } from "../logger/index.js";
import { createRouter } from "./create-router.js";
import { notFoundHandler } from "./not-found.js";

export function createApp() {
  const app = createRouter();

  // 全局中间件必须先写入 requestId，后续错误响应和 404 才能复用同一个追踪标识。
  app.use("*", requestIdMiddleware());
  // 前后端分离场景需 CORS 控制允许的前端来源；留空则放行所有来源。
  app.use("*", cors({
    origin: env.CORS_ORIGINS !== undefined && env.CORS_ORIGINS !== ""
      ? env.CORS_ORIGINS.split(",").map(o => o.trim()).filter(Boolean)
      : "*",
    credentials: true,
  }));
  // 安全响应头与请求体上限是生产级模板的安全基线，低成本高收益。
  app.use("*", secureHeaders());
  app.use("*", bodyLimit({ maxSize: 1024 * 1024 }));
  // logger 依赖 requestId，使用官方 Hono 集成创建 request-scoped logger 并记录 pino-http 风格 access log。
  app.use("*", honoLogLayer({
    instance: logger,
    requestId: resolveRequestId,
    autoLogging: {
      request: false,
      response: true,
    },
  }));
  // 请求级权限 cache（ALS）：同请求内 PermissionService.check 共享结果，避免重复递归 CTE。
  app.use("*", permissionCacheMiddleware());
  // 错误处理和 404 在 app 边界统一收口，避免 feature handler 自己拼响应格式。
  app.onError(errorHandler);
  app.notFound(notFoundHandler);

  return app;
}
