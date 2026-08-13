import type { AppPermissionCode } from "@/core/auth/permissions.js";
import { and, eq, isNull, sql } from "drizzle-orm";

import { PermissionService } from "@/core/authorization/index.js";
import { AppError } from "@/core/errors/app-error.js";
import { db } from "@/db/client.js";
import { organizations, rolePermissions } from "@/db/schema/index.js";
import { assertOrgInSubtree } from "./org-tree.js";

export interface IamActor {
  id: string;
  orgId: string;
}

export async function assertTargetPermission(
  actor: IamActor,
  permissionCode: AppPermissionCode,
  targetOrgId: string,
): Promise<void> {
  await assertOrgInSubtree(actor.orgId, targetOrgId);
  if (!await PermissionService.check(actor.id, permissionCode, targetOrgId)) {
    throw new AppError("COMMON_FORBIDDEN");
  }
}

export async function assertSystemRootPermission(
  actor: IamActor,
  permissionCode: AppPermissionCode,
): Promise<void> {
  const [root] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.id, actor.orgId), isNull(organizations.parentId)));
  if (root == null) {
    throw new AppError("ROLE_REQUIRES_SYSTEM_ROOT");
  }
  if (!await PermissionService.check(actor.id, permissionCode, actor.orgId)) {
    throw new AppError("COMMON_FORBIDDEN");
  }
}

export async function assertGrantOrgForHome(
  actorOrgId: string,
  grantOrgId: string,
  targetHomeOrgId: string,
): Promise<void> {
  await assertOrgInSubtree(actorOrgId, grantOrgId);
  const [row] = await db.execute(sql`
    WITH RECURSIVE org_ancestors AS (
      SELECT ${organizations.id}, ${organizations.parentId}
      FROM ${organizations}
      WHERE ${organizations.id} = ${targetHomeOrgId}
      UNION ALL
      SELECT ${organizations.id}, ${organizations.parentId}
      FROM ${organizations}
      JOIN org_ancestors a ON ${organizations.id} = a.parent_id
    )
    CYCLE id SET is_cycle USING path
    SELECT EXISTS(SELECT 1 FROM org_ancestors WHERE id = ${grantOrgId}) AS is_ancestor
  `);
  if (row?.is_ancestor !== true) {
    throw new AppError("ORG_NOT_FOUND");
  }
}

function sourceCoversExpiry(expiresAt: Date | null, requestedExpiresAt: Date | null): boolean {
  if (requestedExpiresAt == null) {
    return expiresAt == null;
  }
  return expiresAt == null || expiresAt.getTime() >= requestedExpiresAt.getTime();
}

export async function assertCanDelegatePermissions(
  actorUserId: string,
  permissionCodes: readonly AppPermissionCode[],
  grantOrgId: string,
  requestedExpiresAt?: string,
): Promise<void> {
  const requested = requestedExpiresAt == null ? null : new Date(requestedExpiresAt);
  const result = await PermissionService.listEffectivePermissions(actorUserId, grantOrgId);
  const effectiveByCode = new Map(result.effective.map(item => [item.permissionCode, item]));

  for (const permissionCode of permissionCodes) {
    const permission = effectiveByCode.get(permissionCode);
    if (permission == null || !permission.sources.some(source => sourceCoversExpiry(source.expiresAt, requested))) {
      throw new AppError("ASSIGNMENT_EXCEEDS_ACTOR_PERMISSION");
    }
  }
}

export async function getRolePermissionCodes(roleId: string): Promise<AppPermissionCode[]> {
  const rows = await db
    .select({ permissionCode: rolePermissions.permissionCode })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, roleId));
  return rows.map(row => row.permissionCode as AppPermissionCode);
}
