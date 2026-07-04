import type { GetHealthRoute } from "./routes.js";

import type { AppRouteHandler } from "@/core/http/context.js";
import { successResponse } from "@/core/http/response.js";

export const getHealthHandler: AppRouteHandler<GetHealthRoute> = (c) => {
  return successResponse(c, {
    status: "ok" as const,
  });
};
