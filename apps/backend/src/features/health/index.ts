import { createRouter } from "@/core/app/create-router.js";

import * as handlers from "./handlers.js";
import * as routes from "./routes.js";

const healthRouter = createRouter()
  .openapi(routes.getHealthRoute, handlers.getHealthHandler);

// healthz/readyz 挂根路径(不走 /api/v1),探针不被 rate limit、不需认证。
export const healthzRouter = createRouter()
  .openapi(routes.getHealthzRoute, handlers.getHealthzHandler)
  .openapi(routes.getReadyzRoute, handlers.getReadyzHandler);

export default healthRouter;
