import type {
  CreateUserRoute,
  DisableUserRoute,
  EnableUserRoute,
  ListUsersRoute,
  ResetUserPasswordRoute,
  TransferUserOrganizationRoute,
  UpdateUserRoute,
} from "./routes.js";
import type { AppRouteHandler } from "@/core/http/context.js";

import { requireOrgUser } from "@/core/auth/context.js";
import { successResponse } from "@/core/http/response.js";
import { IamService } from "../service.js";

export const listUsersHandler: AppRouteHandler<ListUsersRoute> = async (c) => {
  const { orgId } = requireOrgUser(c);
  const items = await IamService.listUsers(orgId);
  return successResponse(c, items);
};

// --- 用户管理 ---
export const createUserHandler: AppRouteHandler<CreateUserRoute> = async (c) => {
  const { orgId: actorOrgId } = requireOrgUser(c);
  const body = c.req.valid("json");
  const created = await IamService.createUser(actorOrgId, body);
  return successResponse(c, created);
};

export const updateUserHandler: AppRouteHandler<UpdateUserRoute> = async (c) => {
  const { orgId } = requireOrgUser(c);
  const { userId } = c.req.valid("param");
  const body = c.req.valid("json");
  const updated = await IamService.updateUser(orgId, userId, body);
  return successResponse(c, updated);
};

export const resetUserPasswordHandler: AppRouteHandler<ResetUserPasswordRoute> = async (c) => {
  const { orgId } = requireOrgUser(c);
  const { userId } = c.req.valid("param");
  const body = c.req.valid("json");
  await IamService.resetPassword(orgId, userId, body.newPassword);
  return successResponse(c, { userId });
};

export const disableUserHandler: AppRouteHandler<DisableUserRoute> = async (c) => {
  const { id, orgId } = requireOrgUser(c);
  const { userId } = c.req.valid("param");
  const updated = await IamService.disableUser(orgId, id, userId);
  return successResponse(c, updated);
};

export const enableUserHandler: AppRouteHandler<EnableUserRoute> = async (c) => {
  const { orgId } = requireOrgUser(c);
  const { userId } = c.req.valid("param");
  const updated = await IamService.enableUser(orgId, userId);
  return successResponse(c, updated);
};

export const transferUserOrganizationHandler: AppRouteHandler<TransferUserOrganizationRoute> = async (c) => {
  const { id, orgId } = requireOrgUser(c);
  const { userId } = c.req.valid("param");
  const body = c.req.valid("json");
  const updated = await IamService.transferUserOrganization(orgId, id, userId, body.orgId, body.clearAllGrants);
  return successResponse(c, updated);
};
