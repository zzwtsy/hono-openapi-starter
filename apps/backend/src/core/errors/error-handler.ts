import type { ErrorHandler } from "hono";

import type { AppBindings } from "../http/context.js";
import { errorResponse } from "../http/response.js";

import { mapError } from "./error-mapper.js";

export const errorHandler: ErrorHandler<AppBindings> = (error, c) => {
  const mappedError = mapError(error);

  return errorResponse(c, mappedError.code, {
    details: mappedError.details,
    message: mappedError.message,
    type: mappedError.type,
  });
};
