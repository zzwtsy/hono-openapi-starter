import type { ListPermissionsRoute } from "./routes.js";
import type { AppRouteHandler } from "@/core/http/context.js";

import { successResponse } from "@/core/http/response.js";
import { IamService } from "../service.js";

export const listPermissionsHandler: AppRouteHandler<ListPermissionsRoute> = async (c) => {
  const items = await IamService.listPermissions();
  return successResponse(c, items);
};
