import { createRouter } from "@/core/app/create-router.js";

import * as handlers from "./handlers.js";
import * as routes from "./routes.js";

const router = createRouter()
  .openapi(routes.listSettingsRoute, handlers.listSettingsHandler)
  .openapi(routes.updateSettingRoute, handlers.updateSettingHandler);

export default router;
