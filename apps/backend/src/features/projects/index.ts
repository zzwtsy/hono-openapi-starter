import { createRouter } from "@/core/app/create-router.js";

import * as handlers from "./handlers.js";
import * as routes from "./routes.js";

const router = createRouter()
  .openapi(routes.listProjectsRoute, handlers.listProjectsHandler)
  .openapi(routes.getProjectRoute, handlers.getProjectHandler)
  .openapi(routes.createProjectRoute, handlers.createProjectHandler)
  .openapi(routes.updateProjectRoute, handlers.updateProjectHandler)
  .openapi(routes.deleteProjectRoute, handlers.deleteProjectHandler);

export default router;
