import { and, eq } from "drizzle-orm";

import { AppError } from "@/core/errors/app-error.js";
import { db } from "@/db/client.js";
import { projects } from "@/db/schema/index.js";

/**
 * projects feature service:数据访问 + 业务规则。
 *
 * 中等 feature 直接用全局 `db`(见 [开发流程](../../../docs/conventions/development-workflow.md))。
 * 权限检查由 `requirePermission` 中间件完成,service 只管数据查询。
 */
export const ProjectService = {
  /** 列出某组织下的所有项目。 */
  async list(orgId: string) {
    return db.select().from(projects).where(eq(projects.orgId, orgId));
  },

  /** 获取项目详情;不存在或不属于该组织抛 COMMON_NOT_FOUND。 */
  async getById(id: string, orgId: string) {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.orgId, orgId)));

    if (project == null) {
      throw new AppError("COMMON_NOT_FOUND");
    }

    return project;
  },
};
