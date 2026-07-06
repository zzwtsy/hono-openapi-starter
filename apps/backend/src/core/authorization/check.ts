import { sql } from "drizzle-orm";

import { db } from "../../db/client.js";
import { organizations, rolePermissions, userPermissions, userRoles } from "../../db/schema/authorization-schema.js";

/**
 * 检查用户在某组织是否有某权限(递归 CTE 实现)。
 *
 * 算法:查 orgId 祖先(含自身)→ 角色权限 ∪ 直接 allow(过滤过期)→ 减直接 deny → 检查 permission ∈ 结果。
 * 见 [权限层规范](../../../docs/conventions/authorization.md) 检查算法。
 *
 * @param userId Better Auth user.id
 * @param permission `<resource>.<action>`
 * @param orgId 目标组织(检查时向上遍历祖先,祖先授权对当前组织生效)
 * @returns 是否有权限
 */
export async function checkPermission(
  userId: string,
  permission: string,
  orgId: string,
): Promise<boolean> {
  const [result] = await db.execute(sql`
    WITH RECURSIVE org_ancestors AS (
      SELECT ${organizations.id} FROM ${organizations} WHERE ${organizations.id} = ${orgId}
      UNION ALL
      SELECT ${organizations.parentId} FROM ${organizations}
      JOIN org_ancestors oa ON ${organizations.id} = oa.id
    )
    -- CYCLE 兜底:parent_id 形成环时(数据错误)CTE 自动停止该分支,避免无限递归
    CYCLE id SET is_cycle USING path
    SELECT EXISTS (
      SELECT 1 FROM (
        SELECT ${rolePermissions.permission}
        FROM ${userRoles}
        JOIN ${rolePermissions} ON ${userRoles.roleId} = ${rolePermissions.roleId}
        WHERE ${userRoles.userId} = ${userId}
          AND ${userRoles.orgId} IN (SELECT id FROM org_ancestors)
          AND (${userRoles.expiresAt} IS NULL OR ${userRoles.expiresAt} > now())
        UNION
        SELECT ${userPermissions.permission} FROM ${userPermissions}
        WHERE ${userPermissions.userId} = ${userId}
          AND ${userPermissions.orgId} IN (SELECT id FROM org_ancestors)
          AND ${userPermissions.effect} = 'allow'
          AND (${userPermissions.expiresAt} IS NULL OR ${userPermissions.expiresAt} > now())
      ) effective
      WHERE effective.permission = ${permission}
      AND effective.permission NOT IN (
        SELECT ${userPermissions.permission} FROM ${userPermissions}
        WHERE ${userPermissions.userId} = ${userId}
          AND ${userPermissions.orgId} IN (SELECT id FROM org_ancestors)
          AND ${userPermissions.effect} = 'deny'
        AND (${userPermissions.expiresAt} IS NULL OR ${userPermissions.expiresAt} > now())
      )
    ) AS allowed
  `);

  return Boolean(result?.allowed);
}
