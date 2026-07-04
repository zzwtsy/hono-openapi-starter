import type { ErrorHandler } from "hono";

import type { AppBindings } from "../http/context.js";
import { errorResponse } from "../http/response.js";
import { createErrorLogFields, getRemoteAddress } from "../logger/fields.js";

import { mapError } from "./error-mapper.js";
import { errorRegistry } from "./error-registry.js";

export const errorHandler: ErrorHandler<AppBindings> = (error, c) => {
  const mappedError = mapError(error);
  const statusCode = errorRegistry[mappedError.code].status;

  c.var.logger
    .withMetadata(
      createErrorLogFields(error, {
        requestId: c.get("requestId"),
        req: {
          method: c.req.method,
          url: c.req.path,
          remoteAddress: getRemoteAddress(c.req.raw),
        },
        res: {
          statusCode,
        },
      }, mappedError),
    )
    .withError(error)
    .error("request failed");

  return errorResponse(c, mappedError.code, {
    details: mappedError.details,
    message: mappedError.message,
    type: mappedError.type,
  });
};
