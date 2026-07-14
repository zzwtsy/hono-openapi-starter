import type {
  CreateProjectRoute,
  DeleteProjectRoute,
  GetProjectRoute,
  ListProjectsRoute,
  UpdateProjectRoute,
} from "./routes.js";

import type { AppRouteHandler } from "@/core/http/context.js";
import { requireOrgUser } from "@/core/auth/context.js";
import { successResponse } from "@/core/http/response.js";
import { ProjectService } from "./service.js";

/** 列出当前用户组织下的项目。 */
export const listProjectsHandler: AppRouteHandler<ListProjectsRoute> = async (c) => {
  const { orgId } = requireOrgUser(c);
  const items = await ProjectService.list(orgId);

  return successResponse(c, items);
};

/** 获取项目详情。 */
export const getProjectHandler: AppRouteHandler<GetProjectRoute> = async (c) => {
  const { orgId } = requireOrgUser(c);
  const { projectId } = c.req.valid("param");
  const project = await ProjectService.getById(projectId, orgId);

  return successResponse(c, project);
};

/** 创建项目。 */
export const createProjectHandler: AppRouteHandler<CreateProjectRoute> = async (c) => {
  const { orgId } = requireOrgUser(c);
  const body = c.req.valid("json");
  const project = await ProjectService.create(orgId, body);

  return successResponse(c, project);
};

/** 修改项目。 */
export const updateProjectHandler: AppRouteHandler<UpdateProjectRoute> = async (c) => {
  const { orgId } = requireOrgUser(c);
  const { projectId } = c.req.valid("param");
  const body = c.req.valid("json");
  const project = await ProjectService.update(projectId, orgId, body);

  return successResponse(c, project);
};

/** 删除项目。 */
export const deleteProjectHandler: AppRouteHandler<DeleteProjectRoute> = async (c) => {
  const { orgId } = requireOrgUser(c);
  const { projectId } = c.req.valid("param");
  await ProjectService.remove(projectId, orgId);

  return successResponse(c, { id: projectId });
};
