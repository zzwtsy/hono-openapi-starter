import { errorHandler } from "../errors/error-handler.js";
import { requestIdMiddleware } from "../http/request-id-middleware.js";
import { createRouter } from "./create-router.js";
import { notFoundHandler } from "./not-found.js";

export function createApp() {
  const app = createRouter();

  // 全局中间件必须先写入 requestId，后续错误响应和 404 才能复用同一个追踪标识。
  app.use("*", requestIdMiddleware());
  // 错误处理和 404 在 app 边界统一收口，避免 feature handler 自己拼响应格式。
  app.onError(errorHandler);
  app.notFound(notFoundHandler);

  return app;
}
