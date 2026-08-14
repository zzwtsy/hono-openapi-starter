import type { IamActor } from "../access-policy.js";
import type { AppPermissionCode } from "@/core/auth/permissions.js";

import { and, asc, eq, sql } from "drizzle-orm";
import { toPermissionRefs } from "@/catalogs/permissions.js";
import { PermissionService } from "@/core/authorization/index.js";
import { AppError } from "@/core/errors/app-error.js";
import { db } from "@/db/client.js";
import { organizations, roles, user, userPermissions, userRoles } from "@/db/schema/index.js";
import {
  assertCanDelegatePermissions,
  assertGrantOrgForHome,
  assertTargetPermission,
  getRolePermissionCodes,
} from "../access-policy.js";
import {
  assertNotSelf,
  requireExistingPermission,
  requireExistingRole,
  requireUserInSubtree,
} from "../shared/service-helpers.js";
import { acquireSharedTopologyLock } from "../topology-lock.js";

interface MyAuthorizationGrantRow extends Record<string, unknown> {
  kind: "role" | "direct";
  role_id: string | null;
  role_name: string | null;
  permission_code: string | null;
  effect: "allow" | "deny" | null;
  org_id: string;
  expires_at: Date | string | null;
}

/** IAM 用户角色与直接权限授权子能力。 */
export const AssignmentService = {
  async assignUserRole(actor: IamActor, userId: string, roleId: string, input: { orgId: string; expiresAt?: string | null }) {
    assertNotSelf(actor.id, userId, "USER_CANNOT_MODIFY_OWN_AUTH");
    await requireExistingRole(roleId);
    const expiresAt = input.expiresAt === undefined || input.expiresAt === null ? null : new Date(input.expiresAt);

    await db.transaction(async (tx) => {
      await tx.execute(acquireSharedTopologyLock());
      const target = await requireUserInSubtree(actor.orgId, userId);
      await assertGrantOrgForHome(actor.orgId, input.orgId, target.orgId);
      await assertTargetPermission(actor, "assignments.grant", target.orgId);
      await assertTargetPermission(actor, "assignments.grant", input.orgId);
      const [existing] = await tx.select({ expiresAt: userRoles.expiresAt }).from(userRoles).where(and(
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, roleId),
        eq(userRoles.orgId, input.orgId),
      ));
      const requestedExpiresAt = input.expiresAt === undefined
        ? (existing?.expiresAt?.toISOString() ?? null)
        : input.expiresAt;
      await assertCanDelegatePermissions(actor.id, await getRolePermissionCodes(roleId), input.orgId, requestedExpiresAt);

      const insert = tx.insert(userRoles).values({ userId, roleId, orgId: input.orgId, expiresAt });
      if (input.expiresAt === undefined) {
        await insert.onConflictDoNothing();
      } else {
        await insert.onConflictDoUpdate({
          target: [userRoles.userId, userRoles.roleId, userRoles.orgId],
          set: { expiresAt },
        });
      }
    });
  },

  async deleteUserRole(actor: IamActor, userId: string, roleId: string, orgId: string) {
    assertNotSelf(actor.id, userId, "USER_CANNOT_REVOKE_OWN_AUTH");
    await db.transaction(async (tx) => {
      await tx.execute(acquireSharedTopologyLock());
      const target = await requireUserInSubtree(actor.orgId, userId);
      await assertGrantOrgForHome(actor.orgId, orgId, target.orgId);
      await assertTargetPermission(actor, "assignments.revoke", target.orgId);
      await assertTargetPermission(actor, "assignments.revoke", orgId);
      const [row] = await tx.delete(userRoles).where(and(
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, roleId),
        eq(userRoles.orgId, orgId),
      )).returning();
      if (row == null) {
        throw new AppError("COMMON_NOT_FOUND");
      }
    });
  },

  async assignUserPermission(
    actor: IamActor,
    userId: string,
    permissionCode: string,
    input: { orgId: string; effect: "allow" | "deny"; expiresAt?: string | null },
  ) {
    assertNotSelf(actor.id, userId, "USER_CANNOT_MODIFY_OWN_AUTH");
    await requireExistingPermission(permissionCode);
    const expiresAt = input.expiresAt === undefined || input.expiresAt === null ? null : new Date(input.expiresAt);

    await db.transaction(async (tx) => {
      await tx.execute(acquireSharedTopologyLock());
      const target = await requireUserInSubtree(actor.orgId, userId);
      await assertGrantOrgForHome(actor.orgId, input.orgId, target.orgId);
      await assertTargetPermission(actor, "assignments.grant", target.orgId);
      await assertTargetPermission(actor, "assignments.grant", input.orgId);
      const [existing] = await tx.select({ expiresAt: userPermissions.expiresAt }).from(userPermissions).where(and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.permissionCode, permissionCode),
        eq(userPermissions.orgId, input.orgId),
      ));
      const requestedExpiresAt = input.expiresAt === undefined
        ? (existing?.expiresAt?.toISOString() ?? null)
        : input.expiresAt;
      await assertCanDelegatePermissions(
        actor.id,
        [permissionCode as AppPermissionCode],
        input.orgId,
        requestedExpiresAt,
      );

      const insert = tx.insert(userPermissions).values({
        userId,
        permissionCode,
        orgId: input.orgId,
        effect: input.effect,
        expiresAt,
      });
      if (input.expiresAt === undefined) {
        await insert.onConflictDoUpdate({
          target: [userPermissions.userId, userPermissions.permissionCode, userPermissions.orgId],
          set: { effect: input.effect },
        });
      } else {
        await insert.onConflictDoUpdate({
          target: [userPermissions.userId, userPermissions.permissionCode, userPermissions.orgId],
          set: { effect: input.effect, expiresAt },
        });
      }
    });
  },

  async deleteUserPermission(actor: IamActor, userId: string, permissionCode: string, orgId: string) {
    await requireExistingPermission(permissionCode);
    assertNotSelf(actor.id, userId, "USER_CANNOT_REVOKE_OWN_AUTH");
    await db.transaction(async (tx) => {
      await tx.execute(acquireSharedTopologyLock());
      const target = await requireUserInSubtree(actor.orgId, userId);
      await assertGrantOrgForHome(actor.orgId, orgId, target.orgId);
      await assertTargetPermission(actor, "assignments.revoke", target.orgId);
      await assertTargetPermission(actor, "assignments.revoke", orgId);
      const [row] = await tx.delete(userPermissions).where(and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.permissionCode, permissionCode),
        eq(userPermissions.orgId, orgId),
      )).returning();
      if (row == null) {
        throw new AppError("COMMON_NOT_FOUND");
      }
    });
  },

  async getMyAuthorization(userId: string, orgId: string) {
    const [rows, effective] = await Promise.all([
      db.execute<MyAuthorizationGrantRow>(sql`
        WITH RECURSIVE org_ancestors AS (
          SELECT ${organizations.id}, ${organizations.parentId}
          FROM ${organizations}
          WHERE ${organizations.id} = ${orgId}
          UNION ALL
          SELECT ${organizations.id}, ${organizations.parentId}
          FROM ${organizations}
          JOIN org_ancestors oa ON ${organizations.id} = oa.parent_id
        )
        CYCLE id SET is_cycle USING path
        SELECT 'role'::text AS kind,
               ${userRoles.roleId} AS role_id,
               ${roles.name} AS role_name,
               NULL::text AS permission_code,
               NULL::text AS effect,
               ${userRoles.orgId} AS org_id,
               ${userRoles.expiresAt} AS expires_at
        FROM ${userRoles}
        JOIN ${roles} ON ${userRoles.roleId} = ${roles.id}
        WHERE ${userRoles.userId} = ${userId}
          AND ${userRoles.orgId} IN (SELECT id FROM org_ancestors)
        UNION ALL
        SELECT 'direct'::text AS kind,
               NULL::text AS role_id,
               NULL::text AS role_name,
               ${userPermissions.permissionCode} AS permission_code,
               ${userPermissions.effect} AS effect,
               ${userPermissions.orgId} AS org_id,
               ${userPermissions.expiresAt} AS expires_at
        FROM ${userPermissions}
        WHERE ${userPermissions.userId} = ${userId}
          AND ${userPermissions.orgId} IN (SELECT id FROM org_ancestors)
        ORDER BY org_id, kind, role_name, permission_code
      `),
      PermissionService.listEffectivePermissions(userId, orgId),
    ]);

    const roleGrants = rows
      .filter((row): row is MyAuthorizationGrantRow & { kind: "role"; role_id: string; role_name: string } => row.kind === "role" && row.role_id != null && row.role_name != null)
      .map(row => ({
        roleId: row.role_id,
        roleName: row.role_name,
        orgId: row.org_id,
        expiresAt: toDate(row.expires_at),
      }));
    const directGrants = rows
      .filter((row): row is MyAuthorizationGrantRow & { kind: "direct"; permission_code: string; effect: "allow" | "deny" } => row.kind === "direct" && row.permission_code != null && row.effect != null)
      .map(row => ({
        permission: toPermissionRefs([row.permission_code])[0],
        effect: row.effect,
        orgId: row.org_id,
        expiresAt: toDate(row.expires_at),
      }));

    return { orgId, roles: roleGrants, directPermissions: directGrants, effective };
  },

  async listUserEffectivePermissions(actor: IamActor, userId: string, orgId: string) {
    const target = await requireUserInSubtree(actor.orgId, userId);
    await assertTargetPermission(actor, "assignments.read", target.orgId);
    await assertTargetPermission(actor, "assignments.read", orgId);
    return PermissionService.listEffectivePermissions(userId, orgId);
  },

  async listUserRoles(actor: IamActor, userId: string, orgId: string) {
    const target = await requireUserInSubtree(actor.orgId, userId);
    await assertTargetPermission(actor, "assignments.read", target.orgId);
    await assertTargetPermission(actor, "assignments.read", orgId);
    return db.select({
      roleId: userRoles.roleId,
      roleName: roles.name,
      orgId: userRoles.orgId,
      expiresAt: userRoles.expiresAt,
    }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(and(eq(userRoles.userId, userId), eq(userRoles.orgId, orgId))).orderBy(asc(roles.name));
  },

  async listUserDirectPermissions(actor: IamActor, userId: string, orgId: string) {
    const target = await requireUserInSubtree(actor.orgId, userId);
    await assertTargetPermission(actor, "assignments.read", target.orgId);
    await assertTargetPermission(actor, "assignments.read", orgId);
    return db.select({
      permissionCode: userPermissions.permissionCode,
      effect: userPermissions.effect,
      orgId: userPermissions.orgId,
      expiresAt: userPermissions.expiresAt,
    }).from(userPermissions).where(and(eq(userPermissions.userId, userId), eq(userPermissions.orgId, orgId))).orderBy(asc(userPermissions.permissionCode)).then(rows => rows.map((row) => {
      const { permissionCode, ...grant } = row;
      return { ...grant, permission: toPermissionRefs([permissionCode])[0] };
    }));
  },

  async getUserById(id: string) {
    const [row] = await db.select({
      id: user.id,
      name: user.name,
      email: user.email,
      orgId: user.orgId,
      disabled: user.disabled,
      createdAt: user.createdAt,
    }).from(user).where(eq(user.id, id));
    return row;
  },

  async getUserRoleGrant(userId: string, roleId: string, orgId: string) {
    const [row] = await db.select({
      roleId: userRoles.roleId,
      roleName: roles.name,
      orgId: userRoles.orgId,
      expiresAt: userRoles.expiresAt,
    }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(and(
      eq(userRoles.userId, userId),
      eq(userRoles.roleId, roleId),
      eq(userRoles.orgId, orgId),
    ));
    return row;
  },

  async getUserPermissionGrant(userId: string, permissionCode: string, orgId: string) {
    const [row] = await db.select({
      permissionCode: userPermissions.permissionCode,
      effect: userPermissions.effect,
      orgId: userPermissions.orgId,
      expiresAt: userPermissions.expiresAt,
    }).from(userPermissions).where(and(
      eq(userPermissions.userId, userId),
      eq(userPermissions.permissionCode, permissionCode),
      eq(userPermissions.orgId, orgId),
    ));
    return row;
  },
};

function toDate(value: Date | string | null): Date | null {
  return value == null || value instanceof Date ? value : new Date(value);
}
