import { createRouter } from "@/core/app/create-router.js";

import * as handlers from "./handlers.js";
import * as routes from "./routes.js";

const router = createRouter()
  .openapi(routes.listAuditLogsRoute, handlers.listAuditLogsHandler)
  .openapi(routes.listAuditLogsByResourceRoute, handlers.listAuditLogsByResourceHandler)
  .openapi(routes.listAuditActionsRoute, handlers.listAuditActionsHandler);

export default router;
