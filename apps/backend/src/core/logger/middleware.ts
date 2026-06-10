import type { MiddlewareHandler } from "hono";

import type { AppBindings } from "../http/context.js";
import type { AppLogger } from "./index.js";

import { honoLogLayer } from "@loglayer/hono";
import { resolveRequestId } from "../http/request-id-middleware.js";

export interface LoggerMiddlewareOptions {
  logger: AppLogger;
}

export function loggerMiddleware(options: LoggerMiddlewareOptions): MiddlewareHandler<AppBindings> {
  return honoLogLayer({
    instance: options.logger,
    requestId: resolveRequestId,
    autoLogging: {
      request: false,
      response: true,
    },
  }) as unknown as MiddlewareHandler<AppBindings>;
}
