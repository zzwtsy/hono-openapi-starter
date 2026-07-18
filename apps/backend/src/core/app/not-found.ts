import type { NotFoundHandler } from "hono";

import type { AppBindings } from "../http/context.js";

import { errorResponse } from "../http/response.js";
import { createErrorLogFields, getRemoteAddress } from "../logger/fields.js";

export const notFoundHandler: NotFoundHandler<AppBindings> = (c) => {
  // 404 不走 app.onError，需在此补一条结构化日志，保证 requestId 全链路可检索。
  // warn 级：404 高频且通常非致命（扫描、拼写错误），避免淹没 error 级真实故障。
  c.var.logger
    .withMetadata(
      createErrorLogFields(undefined, {
        requestId: c.get("requestId"),
        req: {
          method: c.req.method,
          url: c.req.path,
          remoteAddress: getRemoteAddress(c.req.raw),
        },
        res: {
          statusCode: 404,
        },
      }, { code: "COMMON_NOT_FOUND", type: "business" }),
    )
    .warn("route not found");

  return errorResponse(c, "COMMON_NOT_FOUND");
};
