import type {
  CreateOrganizationRoute,
  DeleteOrganizationRoute,
  GetOrganizationRoute,
  ListOrganizationsRoute,
  UpdateOrganizationRoute,
} from "./routes.js";
import type { AppRouteHandler } from "@/core/http/context.js";

import { successResponse } from "@/core/http/response.js";
import { IamService } from "../service.js";

export const listOrganizationsHandler: AppRouteHandler<ListOrganizationsRoute> = async (c) => {
  const items = await IamService.listOrganizations();
  return successResponse(c, items);
};

export const createOrganizationHandler: AppRouteHandler<CreateOrganizationRoute> = async (c) => {
  const body = c.req.valid("json");
  const org = await IamService.createOrganization(body);
  return successResponse(c, org);
};

export const getOrganizationHandler: AppRouteHandler<GetOrganizationRoute> = async (c) => {
  const { orgId } = c.req.valid("param");
  const org = await IamService.getOrganizationById(orgId);
  return successResponse(c, org);
};

export const updateOrganizationHandler: AppRouteHandler<UpdateOrganizationRoute> = async (c) => {
  const { orgId } = c.req.valid("param");
  const body = c.req.valid("json");
  const org = await IamService.updateOrganization(orgId, body);
  return successResponse(c, org);
};

export const deleteOrganizationHandler: AppRouteHandler<DeleteOrganizationRoute> = async (c) => {
  const { orgId } = c.req.valid("param");
  await IamService.deleteOrganization(orgId);
  return successResponse(c, { id: orgId });
};
