import type { PermissionChecker } from "@/core/authorization/permission-checker.js";

import { sql } from "drizzle-orm";
import { db } from "@/db/client.js";
import { organizations, rolePermissions, userPermissions, userRoles } from "@/db/schema/index.js";

/**
 * PermissionChecker 的本地 Adapter:递归 CTE 实现 ADR-0004 的权限算法
 * (祖先遍历 + 角色权限 ∪ 直接allow − 直接deny + 过期过滤)。
 *
 * 不含 memoize(由 core 的 PermissionService 装饰,读 ALS)。本类只管纯算法 + db 查询。
 */
export class IamPermissionChecker implements PermissionChecker {
  async check(userId: string, permission: string, orgId: string): Promise<boolean> {
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

  async listEffectivePermissions(userId: string, orgId: string): Promise<string[]> {
    const rows = await db.execute(sql`
      WITH RECURSIVE org_ancestors AS (
        SELECT ${organizations.id} FROM ${organizations} WHERE ${organizations.id} = ${orgId}
        UNION ALL
        SELECT ${organizations.parentId} FROM ${organizations}
        JOIN org_ancestors oa ON ${organizations.id} = oa.id
      )
      CYCLE id SET is_cycle USING path
      SELECT DISTINCT permission FROM (
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
      WHERE effective.permission NOT IN (
        SELECT ${userPermissions.permission} FROM ${userPermissions}
        WHERE ${userPermissions.userId} = ${userId}
          AND ${userPermissions.orgId} IN (SELECT id FROM org_ancestors)
          AND ${userPermissions.effect} = 'deny'
          AND (${userPermissions.expiresAt} IS NULL OR ${userPermissions.expiresAt} > now())
      )
    `);

    return rows
      .map(row => row.permission)
      .filter((p): p is string => typeof p === "string");
  }
}
