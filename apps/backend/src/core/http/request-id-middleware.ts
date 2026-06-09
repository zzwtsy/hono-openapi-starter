import type { AppBindings } from "./context.js";

import { createMiddleware } from "hono/factory";

const requestIdHeader = "X-Request-Id";

export function requestIdMiddleware() {
  return createMiddleware<AppBindings>(async (c, next) => {
    const incomingRequestId = c.req.header(requestIdHeader)?.trim();
    // 入口处收敛 requestId，保证日志、响应头和响应体后续能使用同一个值。
    const requestId = incomingRequestId !== undefined && incomingRequestId.length > 0
      ? incomingRequestId
      : crypto.randomUUID();

    c.set("requestId", requestId);

    try {
      await next();
    } finally {
      c.header(requestIdHeader, requestId);
    }
  });
}
