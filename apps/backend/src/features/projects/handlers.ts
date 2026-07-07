import type { GetProjectRoute, ListProjectsRoute } from "./routes.js";

import type { AppRouteHandler } from "@/core/http/context.js";
import { successResponse } from "@/core/http/response.js";
import { ProjectService } from "./service.js";

/** 列出当前用户组织下的项目。 */
export const listProjectsHandler: AppRouteHandler<ListProjectsRoute> = async (c) => {
  const user = c.get("user")!;
  const items = await ProjectService.list(user.orgId!);

  return successResponse(c, items);
};

/** 获取项目详情。 */
export const getProjectHandler: AppRouteHandler<GetProjectRoute> = async (c) => {
  const user = c.get("user")!;
  const { projectId } = c.req.valid("param");
  const project = await ProjectService.getById(projectId, user.orgId!);

  return successResponse(c, project);
};
