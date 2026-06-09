import type { NotFoundHandler } from "hono";

import type { AppBindings } from "../http/context.js";

import { errorResponse } from "../http/response.js";

export const notFoundHandler: NotFoundHandler<AppBindings> = (c) => {
  return errorResponse(c, "COMMON_NOT_FOUND");
};
