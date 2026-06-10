import type { AppBindings } from "./context.js";

import { createMiddleware } from "hono/factory";

export const requestIdHeader = "X-Request-Id";

const requestIds = new WeakMap<Request, string>();

export function resolveRequestId(request: Request) {
  const existingRequestId = requestIds.get(request);

  if (existingRequestId !== undefined) {
    return existingRequestId;
  }

  const incomingRequestId = request.headers.get(requestIdHeader)?.trim();
  const requestId = incomingRequestId !== undefined && incomingRequestId.length > 0
    ? incomingRequestId
    : crypto.randomUUID();

  requestIds.set(request, requestId);

  return requestId;
}

export function requestIdMiddleware() {
  return createMiddleware<AppBindings>(async (c, next) => {
    // 入口处收敛 requestId，保证日志、响应头和响应体后续能使用同一个值。
    const requestId = resolveRequestId(c.req.raw);

    c.set("requestId", requestId);

    try {
      await next();
    } finally {
      c.header(requestIdHeader, requestId);
    }
  });
}
