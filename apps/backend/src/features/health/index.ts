import { createRouter } from "@/core/app/create-router.js";

import * as handlers from "./handlers.js";

import * as routes from "./routes.js";

const router = createRouter()
  .openapi(routes.getHealthRoute, handlers.getHealthHandler);

export default router;
