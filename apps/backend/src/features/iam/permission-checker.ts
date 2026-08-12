import type { PermissionCode } from "@/core/auth/permissions.js";
import type { PermissionChecker, PermissionSource, UserPermissionsResult } from "@/core/authorization/permission-checker.js";

import { sql } from "drizzle-orm";
import { getPermissionRef } from "@/catalogs/permissions.js";
import { db } from "@/db/client.js";
import { organizations, rolePermissions, roles, userPermissions, userRoles } from "@/db/schema/index.js";

interface CheckPermissionRow extends Record<string, unknown> {
  allowed: boolean;
}

/**
 * CTE + UNION 查询的数据库结果行。
 *
 * permission_code 仍保持 string:数据库只保证它存在于 permissions registry,
 * 是否属于当前应用 catalog 要在进入权限领域模型前由 getPermissionRef 收窄。
 */
interface GrantPermissionQueryRow extends Record<string, unknown> {
  kind: "grant";
  permission_code: string;
  source_type: "role" | "direct";
  role_id: string | null;
  role_name: string | null;
  org_id: string;
  expires_at: Date | null;
}

interface DenyPermissionQueryRow extends Record<string, unknown> {
  kind: "deny";
  permission_code: string;
  source_type: null;
  role_id: null;
  role_name: null;
  org_id: string;
  expires_at: Date | null;
}

type PermissionQueryRow = GrantPermissionQueryRow | DenyPermissionQueryRow;

/**
 * PermissionChecker 的本地 Adapter:递归 CTE 实现 ADR-0004 的权限算法
 * (祖先遍历 + 角色权限 ∪ 直接allow − 直接deny + 过期过滤)。
 *
 * 不含 memoize(由 core 的 PermissionService 装饰,读 ALS)。本类只管纯算法 + db 查询。
 */
export class IamPermissionChecker implements PermissionChecker {
  async check(userId: string, permissionCode: PermissionCode, orgId: string): Promise<boolean> {
    const [result] = await db.execute<CheckPermissionRow>(sql`
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
          SELECT ${rolePermissions.permissionCode}
          FROM ${userRoles}
          JOIN ${rolePermissions} ON ${userRoles.roleId} = ${rolePermissions.roleId}
          WHERE ${userRoles.userId} = ${userId}
            AND ${userRoles.orgId} IN (SELECT id FROM org_ancestors)
            AND (${userRoles.expiresAt} IS NULL OR ${userRoles.expiresAt} > now())
          UNION
          SELECT ${userPermissions.permissionCode} FROM ${userPermissions}
          WHERE ${userPermissions.userId} = ${userId}
            AND ${userPermissions.orgId} IN (SELECT id FROM org_ancestors)
            AND ${userPermissions.effect} = 'allow'
            AND (${userPermissions.expiresAt} IS NULL OR ${userPermissions.expiresAt} > now())
        ) effective
        WHERE effective.permission_code = ${permissionCode}
        AND effective.permission_code NOT IN (
          SELECT ${userPermissions.permissionCode} FROM ${userPermissions}
          WHERE ${userPermissions.userId} = ${userId}
            AND ${userPermissions.orgId} IN (SELECT id FROM org_ancestors)
            AND ${userPermissions.effect} = 'deny'
            AND (${userPermissions.expiresAt} IS NULL OR ${userPermissions.expiresAt} > now())
        )
      ) AS allowed
    `);

    return result?.allowed === true;
  }

  async listEffectivePermissions(userId: string, orgId: string): Promise<UserPermissionsResult> {
    const rows = await db.execute<PermissionQueryRow>(sql`
      WITH RECURSIVE org_ancestors AS (
        SELECT ${organizations.id} FROM ${organizations} WHERE ${organizations.id} = ${orgId}
        UNION ALL
        SELECT ${organizations.parentId} FROM ${organizations}
        JOIN org_ancestors oa ON ${organizations.id} = oa.id
      )
      CYCLE id SET is_cycle USING path,
      grant_sources AS (
        SELECT ${rolePermissions.permissionCode} AS permission_code, 'role'::text AS source_type,
               ${userRoles.roleId} AS role_id, ${roles.name} AS role_name,
               ${userRoles.orgId} AS org_id, ${userRoles.expiresAt} AS expires_at
        FROM ${userRoles}
        JOIN ${rolePermissions} ON ${userRoles.roleId} = ${rolePermissions.roleId}
        JOIN ${roles} ON ${userRoles.roleId} = ${roles.id}
        WHERE ${userRoles.userId} = ${userId}
          AND ${userRoles.orgId} IN (SELECT id FROM org_ancestors)
          AND (${userRoles.expiresAt} IS NULL OR ${userRoles.expiresAt} > now())
        UNION ALL
        SELECT ${userPermissions.permissionCode} AS permission_code, 'direct'::text AS source_type,
               NULL::text AS role_id, NULL::text AS role_name,
               ${userPermissions.orgId} AS org_id, ${userPermissions.expiresAt} AS expires_at
        FROM ${userPermissions}
        WHERE ${userPermissions.userId} = ${userId}
          AND ${userPermissions.orgId} IN (SELECT id FROM org_ancestors)
          AND ${userPermissions.effect} = 'allow'
          AND (${userPermissions.expiresAt} IS NULL OR ${userPermissions.expiresAt} > now())
      ),
      deny_set AS (
        SELECT ${userPermissions.permissionCode} AS permission_code,
               ${userPermissions.orgId} AS org_id,
               ${userPermissions.expiresAt} AS expires_at
        FROM ${userPermissions}
        WHERE ${userPermissions.userId} = ${userId}
          AND ${userPermissions.orgId} IN (SELECT id FROM org_ancestors)
          AND ${userPermissions.effect} = 'deny'
          AND (${userPermissions.expiresAt} IS NULL OR ${userPermissions.expiresAt} > now())
      )
      SELECT 'grant'::text AS kind,
             gs.permission_code AS permission_code,
             gs.source_type AS source_type,
             gs.role_id AS role_id,
             gs.role_name AS role_name,
             gs.org_id AS org_id,
             gs.expires_at AS expires_at
      FROM grant_sources gs
      UNION ALL
      SELECT 'deny'::text AS kind,
             ds.permission_code AS permission_code,
             NULL::text AS source_type,
             NULL::text AS role_id,
             NULL::text AS role_name,
             ds.org_id AS org_id,
             ds.expires_at AS expires_at
      FROM deny_set ds
    `);

    return aggregatePermissionSources(rows);
  }
}

/**
 * 聚合 CTE 来源行:grant 行按 permissionCode 聚合来源,deny 行标注抵消。
 * - 有效:有来源且未被 deny 的 permission。
 * - 被抵消:有来源且被 deny 的 permission(suppressedSources=本会来自,deniedBy=哪些 org deny)。
 * - 无效 deny:deny 了但无来源的 permission(诚实展示,suppressedSources 为空)。
 */
function aggregatePermissionSources(rows: readonly PermissionQueryRow[]): UserPermissionsResult {
  const grantMap = new Map<PermissionCode, PermissionSource[]>();
  const denyByPerm = new Map<PermissionCode, { orgId: string; expiresAt: Date | null }[]>();

  for (const row of rows) {
    const permissionCode = getPermissionRef(row.permission_code).code;
    if (row.kind === "grant") {
      const source: PermissionSource = {
        type: row.source_type,
        roleId: row.role_id,
        roleName: row.role_name,
        orgId: row.org_id,
        expiresAt: row.expires_at,
      };
      let list = grantMap.get(permissionCode);
      if (list === undefined) {
        list = [];
        grantMap.set(permissionCode, list);
      }
      list.push(source);
    } else if (row.kind === "deny") {
      let list = denyByPerm.get(permissionCode);
      if (list === undefined) {
        list = [];
        denyByPerm.set(permissionCode, list);
      }
      list.push({ orgId: row.org_id, expiresAt: row.expires_at });
    }
  }

  const effective: UserPermissionsResult["effective"] = [];
  const denied: UserPermissionsResult["denied"] = [];
  for (const [permissionCode, sources] of grantMap) {
    const denyList = denyByPerm.get(permissionCode);
    if (denyList !== undefined) {
      denied.push({ permissionCode, deniedBy: denyList, suppressedSources: sources });
    } else {
      effective.push({ permissionCode, sources });
    }
  }
  for (const [permissionCode, denyList] of denyByPerm) {
    if (!grantMap.has(permissionCode)) {
      denied.push({ permissionCode, deniedBy: denyList, suppressedSources: [] });
    }
  }
  return { effective, denied };
}
