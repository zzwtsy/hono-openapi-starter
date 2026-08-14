import type { GetTargetCapabilitiesRoute } from "./routes.js";
import type { AppRouteHandler } from "@/core/http/context.js";

import { requireOrgUser } from "@/core/auth/context.js";
import { successResponse } from "@/core/http/response.js";
import { IamService } from "../service.js";

export const getTargetCapabilitiesHandler: AppRouteHandler<GetTargetCapabilitiesRoute> = async (c) => {
  const actor = requireOrgUser(c);
  const { orgId } = c.req.valid("query");
  return successResponse(c, await IamService.getTargetCapabilities(actor, orgId));
};
