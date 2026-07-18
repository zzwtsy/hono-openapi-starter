import { and, asc, eq, ne } from "drizzle-orm";

import { AppError } from "@/core/errors/app-error.js";
import { db } from "@/db/client.js";
import { generateId, projects } from "@/db/schema/index.js";

/**
 * projects feature service:数据访问 + 业务规则。
 *
 * 中等 feature 直接用全局 `db`(见 [开发流程](../../../docs/conventions/development-workflow.md))。
 * 权限检查由 `requirePermission` 中间件完成,service 只管数据查询与写操作的归属/重名校验。
 *
 * 归属 scope:所有写操作只作用于 `orgId` 本组织项目;跨组织一律 NOT_FOUND(不泄露存在性)。
 * 重名:同组织内 `name` 唯一,由 DB unique 约束 `projects_org_name_unq` 兜底,
 * service 写路径在事务内用 onConflict/查重显式抛 COMMON_CONFLICT(B2 D2);不同组织允许重名。
 */

/** 取项目(带归属校验);不存在或不属于该组织抛 COMMON_NOT_FOUND。 */
async function getOwnedProject(id: string, orgId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.orgId, orgId)));
  if (project == null) {
    throw new AppError("PROJECT_NOT_FOUND");
  }
  return project;
}

export const ProjectService = {
  /** 列出某组织下的所有项目(按创建时间、id 确定性排序,避免堆顺序不确定)。 */
  async list(orgId: string) {
    return db
      .select()
      .from(projects)
      .where(eq(projects.orgId, orgId))
      .orderBy(asc(projects.createdAt), asc(projects.id));
  },

  /** 获取项目详情;不存在或不属于该组织抛 COMMON_NOT_FOUND。 */
  async getById(id: string, orgId: string) {
    return getOwnedProject(id, orgId);
  },

  /** 创建项目;同组织内重名抛 COMMON_CONFLICT(事务 + onConflict 根除 TOCTOU)。 */
  async create(orgId: string, input: { name: string; description?: string }) {
    // 事务 + onConflictDoNothing + returning 判空:并发同名第二次 insert 冲突返回空,
    // 抛 COMMON_CONFLICT 而非撞 DB unique 转 500(照 createUser 范本,B2 D2)。
    const [project] = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(projects)
        .values({ id: generateId(), name: input.name, description: input.description, orgId })
        .onConflictDoNothing({ target: [projects.orgId, projects.name] })
        .returning();
      if (row == null) {
        throw new AppError("PROJECT_NAME_CONFLICT");
      }
      return [row];
    });
    return project;
  },

  /**
   * 修改项目;不存在/不属于本组织抛 COMMON_NOT_FOUND,同组织改名重名抛 COMMON_CONFLICT。
   * `description` 传 null 清空;`updatedAt` 由 schema `$onUpdate` 自动刷新,无需手动 set。
   */
  async update(id: string, orgId: string, input: { name?: string; description?: string | null }) {
    const current = await getOwnedProject(id, orgId);
    if (input.name === undefined && input.description === undefined) {
      return current;
    }
    // 事务内 select 查重 + update:压窄 TOCTOU 窗口,unique 约束兜底(B2 D2)。
    return db.transaction(async (tx) => {
      if (input.name !== undefined) {
        const [conflict] = await tx
          .select({ id: projects.id })
          .from(projects)
          .where(and(eq(projects.orgId, orgId), eq(projects.name, input.name), ne(projects.id, id)));
        if (conflict != null) {
          throw new AppError("PROJECT_NAME_CONFLICT");
        }
      }
      const [project] = await tx
        .update(projects)
        .set(input)
        .where(and(eq(projects.id, id), eq(projects.orgId, orgId)))
        .returning();
      return project;
    });
  },

  /** 删除项目;不存在/不属于本组织抛 COMMON_NOT_FOUND。 */
  async remove(id: string, orgId: string) {
    const [row] = await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.orgId, orgId)))
      .returning({ id: projects.id });
    if (row == null) {
      throw new AppError("PROJECT_NOT_FOUND");
    }
  },
};
