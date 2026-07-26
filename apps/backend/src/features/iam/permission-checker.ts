import type { PermissionChecker, PermissionSource, UserPermissionsResult } from "@/core/authorization/permission-checker.js";

import { sql } from "drizzle-orm";
import { db } from "@/db/client.js";
import { organizations, rolePermissions, roles, userPermissions, userRoles } from "@/db/schema/index.js";

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

  async listEffectivePermissions(userId: string, orgId: string): Promise<UserPermissionsResult> {
    const rows = await db.execute(sql`
      WITH RECURSIVE org_ancestors AS (
        SELECT ${organizations.id} FROM ${organizations} WHERE ${organizations.id} = ${orgId}
        UNION ALL
        SELECT ${organizations.parentId} FROM ${organizations}
        JOIN org_ancestors oa ON ${organizations.id} = oa.id
      )
      CYCLE id SET is_cycle USING path,
      grant_sources AS (
        SELECT ${rolePermissions.permission} AS permission, 'role' AS source_type,
               ${userRoles.roleId} AS role_id, ${roles.name} AS role_name,
               ${userRoles.orgId} AS org_id, ${userRoles.expiresAt} AS expires_at
        FROM ${userRoles}
        JOIN ${rolePermissions} ON ${userRoles.roleId} = ${rolePermissions.roleId}
        JOIN ${roles} ON ${userRoles.roleId} = ${roles.id}
        WHERE ${userRoles.userId} = ${userId}
          AND ${userRoles.orgId} IN (SELECT id FROM org_ancestors)
          AND (${userRoles.expiresAt} IS NULL OR ${userRoles.expiresAt} > now())
        UNION ALL
        SELECT ${userPermissions.permission}, 'direct', NULL, NULL,
               ${userPermissions.orgId}, ${userPermissions.expiresAt}
        FROM ${userPermissions}
        WHERE ${userPermissions.userId} = ${userId}
          AND ${userPermissions.orgId} IN (SELECT id FROM org_ancestors)
          AND ${userPermissions.effect} = 'allow'
          AND (${userPermissions.expiresAt} IS NULL OR ${userPermissions.expiresAt} > now())
      ),
      deny_set AS (
        SELECT ${userPermissions.permission} AS permission,
               ${userPermissions.orgId} AS org_id,
               ${userPermissions.expiresAt} AS expires_at
        FROM ${userPermissions}
        WHERE ${userPermissions.userId} = ${userId}
          AND ${userPermissions.orgId} IN (SELECT id FROM org_ancestors)
          AND ${userPermissions.effect} = 'deny'
          AND (${userPermissions.expiresAt} IS NULL OR ${userPermissions.expiresAt} > now())
      )
      SELECT 'grant' AS kind, gs.permission, gs.source_type, gs.role_id, gs.role_name, gs.org_id, gs.expires_at
      FROM grant_sources gs
      UNION ALL
      SELECT 'deny' AS kind, ds.permission, NULL, NULL, NULL, ds.org_id, ds.expires_at
      FROM deny_set ds
    `);

    return aggregatePermissionSources(rows);
  }
}

/**
 * 聚合 CTE 来源行:grant 行按 permission 聚合来源,deny 行标注抵消。
 * - 有效:有来源且未被 deny 的 permission。
 * - 被抵消:有来源且被 deny 的 permission(suppressedSources=本会来自,deniedBy=哪些 org deny)。
 * - 无效 deny:deny 了但无来源的 permission(诚实展示,suppressedSources 为空)。
 */
function aggregatePermissionSources(rows: Record<string, unknown>[]): UserPermissionsResult {
  const grantMap = new Map<string, PermissionSource[]>();
  const denyByPerm = new Map<string, { orgId: string; expiresAt: Date | null }[]>();

  for (const row of rows) {
    const permission = row.permission;
    if (typeof permission !== "string") {
      continue;
    }
    if (row.kind === "grant") {
      const source: PermissionSource = {
        type: row.source_type === "role" ? "role" : "direct",
        roleId: typeof row.role_id === "string" ? row.role_id : null,
        roleName: typeof row.role_name === "string" ? row.role_name : null,
        orgId: typeof row.org_id === "string" ? row.org_id : "",
        expiresAt: row.expires_at instanceof Date ? row.expires_at : null,
      };
      let list = grantMap.get(permission);
      if (list === undefined) {
        list = [];
        grantMap.set(permission, list);
      }
      list.push(source);
    } else if (row.kind === "deny") {
      const orgId = typeof row.org_id === "string" ? row.org_id : "";
      const expiresAt = row.expires_at instanceof Date ? row.expires_at : null;
      let list = denyByPerm.get(permission);
      if (list === undefined) {
        list = [];
        denyByPerm.set(permission, list);
      }
      list.push({ orgId, expiresAt });
    }
  }

  const effective: UserPermissionsResult["effective"] = [];
  const denied: UserPermissionsResult["denied"] = [];
  for (const [permission, sources] of grantMap) {
    const denyList = denyByPerm.get(permission);
    if (denyList !== undefined) {
      denied.push({ permission, deniedBy: denyList, suppressedSources: sources });
    } else {
      effective.push({ permission, sources });
    }
  }
  for (const [permission, denyList] of denyByPerm) {
    if (!grantMap.has(permission)) {
      denied.push({ permission, deniedBy: denyList, suppressedSources: [] });
    }
  }
  return { effective, denied };
}
