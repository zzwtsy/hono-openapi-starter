import type {
  CreateOrganizationRoute,
  DeleteOrganizationRoute,
  GetOrganizationRoute,
  ListOrganizationsRoute,
  UpdateOrganizationRoute,
} from "./routes.js";
import type { AppRouteHandler } from "@/core/http/context.js";

import { requireOrgUser } from "@/core/auth/context.js";
import { successResponse } from "@/core/http/response.js";
import { IamService } from "../service.js";

export const listOrganizationsHandler: AppRouteHandler<ListOrganizationsRoute> = async (c) => {
  const { orgId } = requireOrgUser(c);
  const items = await IamService.listOrganizations(orgId);
  return successResponse(c, items);
};

export const createOrganizationHandler: AppRouteHandler<CreateOrganizationRoute> = async (c) => {
  const actor = requireOrgUser(c);
  const body = c.req.valid("json");
  const org = await IamService.createOrganization(actor, body);
  return successResponse(c, org);
};

export const getOrganizationHandler: AppRouteHandler<GetOrganizationRoute> = async (c) => {
  const actor = requireOrgUser(c);
  const { orgId } = c.req.valid("param");
  const org = await IamService.getOrganizationById(orgId, actor.orgId);
  return successResponse(c, org);
};

export const updateOrganizationHandler: AppRouteHandler<UpdateOrganizationRoute> = async (c) => {
  const actor = requireOrgUser(c);
  const { orgId } = c.req.valid("param");
  const body = c.req.valid("json");
  const org = await IamService.updateOrganization(actor, orgId, body);
  return successResponse(c, org);
};

export const deleteOrganizationHandler: AppRouteHandler<DeleteOrganizationRoute> = async (c) => {
  const actor = requireOrgUser(c);
  const { orgId } = c.req.valid("param");
  await IamService.deleteOrganization(actor, orgId);
  return successResponse(c, { id: orgId });
};
