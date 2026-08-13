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
  const actor = requireOrgUser(c);
  const body = c.req.valid("json");
  const created = await IamService.createUser(actor, body);
  return successResponse(c, created);
};

export const updateUserHandler: AppRouteHandler<UpdateUserRoute> = async (c) => {
  const actor = requireOrgUser(c);
  const { userId } = c.req.valid("param");
  const body = c.req.valid("json");
  const updated = await IamService.updateUser(actor, userId, body);
  return successResponse(c, updated);
};

export const resetUserPasswordHandler: AppRouteHandler<ResetUserPasswordRoute> = async (c) => {
  const actor = requireOrgUser(c);
  const { userId } = c.req.valid("param");
  const body = c.req.valid("json");
  await IamService.resetPassword(actor, userId, body.newPassword);
  return successResponse(c, { userId });
};

export const disableUserHandler: AppRouteHandler<DisableUserRoute> = async (c) => {
  const actor = requireOrgUser(c);
  const { userId } = c.req.valid("param");
  const updated = await IamService.disableUser(actor, userId);
  return successResponse(c, updated);
};

export const enableUserHandler: AppRouteHandler<EnableUserRoute> = async (c) => {
  const actor = requireOrgUser(c);
  const { userId } = c.req.valid("param");
  const updated = await IamService.enableUser(actor, userId);
  return successResponse(c, updated);
};

export const transferUserOrganizationHandler: AppRouteHandler<TransferUserOrganizationRoute> = async (c) => {
  const actor = requireOrgUser(c);
  const { userId } = c.req.valid("param");
  const body = c.req.valid("json");
  const updated = await IamService.transferUserOrganization(actor, userId, body.orgId, body.clearAllGrants);
  return successResponse(c, updated);
};
