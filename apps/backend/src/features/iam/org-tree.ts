import { sql } from "drizzle-orm";

import { AppError } from "@/core/errors/app-error.js";
import { db } from "@/db/client.js";
import { organizations } from "@/db/schema/index.js";

/**
 * 组织树子树原语(PAP 辅助):管理范围 = 操作者 home org 的自身+子孙。
 *
 * 与 permission-checker.ts(祖先 CTE,PDP 权限检查)分工:本文件后代 CTE,管「操作者能管哪些 org」(写范围)。
 * 管理子树(向下)与 Grant 继承(向上)方向相反,见 [authorization.md 组织三轴](../../../docs/conventions/backend/authorization.md)。
 */

/**
 * 取操作者管理子树(自身 + 所有子孙 orgId)。
 * 后代 CTE(向下 walk parent_id),带 CYCLE 兜底(数据成环时自动停止该分支)。供 listUsers 的 IN 过滤。
 */
export async function getManagedSubtree(orgId: string): Promise<string[]> {
  const rows = await db.execute(sql`
    WITH RECURSIVE org_descendants AS (
      SELECT ${organizations.id} FROM ${organizations} WHERE ${organizations.id} = ${orgId}
      UNION ALL
      SELECT ${organizations.id} FROM ${organizations}
      JOIN org_descendants d ON ${organizations.parentId} = d.id
    )
    CYCLE id SET is_cycle USING path
    SELECT id FROM org_descendants
  `);
  return rows
    .map(row => row.id)
    .filter((id): id is string => typeof id === "string");
}

/**
 * 校验 targetOrgId 在操作者管理子树内(自身+子孙),否则 COMMON_NOT_FOUND(不暴露树外 org 是否存在)。
 * 供 createUser 选目标 org 的子树校验。targetOrgId 不存在或不在子树均 -> 404。
 */
export async function assertOrgInSubtree(rootOrgId: string, targetOrgId: string): Promise<void> {
  const [row] = await db.execute(sql`
    WITH RECURSIVE org_descendants AS (
      SELECT ${organizations.id} FROM ${organizations} WHERE ${organizations.id} = ${rootOrgId}
      UNION ALL
      SELECT ${organizations.id} FROM ${organizations}
      JOIN org_descendants d ON ${organizations.parentId} = d.id
    )
    CYCLE id SET is_cycle USING path
    SELECT EXISTS(SELECT 1 FROM org_descendants WHERE id = ${targetOrgId}) AS in_subtree
  `);
  if (row?.in_subtree !== true) {
    throw new AppError("COMMON_NOT_FOUND", { message: "组织不存在或不在管理范围内" });
  }
}
