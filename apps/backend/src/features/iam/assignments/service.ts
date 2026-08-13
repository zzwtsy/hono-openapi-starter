import type { IamActor } from "../access-policy.js";
import type { AppPermissionCode } from "@/core/auth/permissions.js";

import { and, asc, eq } from "drizzle-orm";
import { toPermissionRefs } from "@/catalogs/permissions.js";
import { PermissionService } from "@/core/authorization/index.js";
import { AppError } from "@/core/errors/app-error.js";
import { db } from "@/db/client.js";
import { roles, user, userPermissions, userRoles } from "@/db/schema/index.js";
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

/** IAM 用户角色与直接权限授权子能力。 */
export const AssignmentService = {
  async assignUserRole(actor: IamActor, userId: string, roleId: string, input: { orgId: string; expiresAt?: string }) {
    assertNotSelf(actor.id, userId, "USER_CANNOT_MODIFY_OWN_AUTH");
    await requireExistingRole(roleId);
    const expiresAt = input.expiresAt == null ? null : new Date(input.expiresAt);

    await db.transaction(async (tx) => {
      await tx.execute(acquireSharedTopologyLock());
      const target = await requireUserInSubtree(actor.orgId, userId);
      await assertGrantOrgForHome(actor.orgId, input.orgId, target.orgId);
      await assertTargetPermission(actor, "assignments.grant", target.orgId);
      await assertTargetPermission(actor, "assignments.grant", input.orgId);
      await assertCanDelegatePermissions(actor.id, await getRolePermissionCodes(roleId), input.orgId, input.expiresAt);

      const insert = tx.insert(userRoles).values({ userId, roleId, orgId: input.orgId, expiresAt });
      if (input.expiresAt == null) {
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
    input: { orgId: string; effect: "allow" | "deny"; expiresAt?: string },
  ) {
    assertNotSelf(actor.id, userId, "USER_CANNOT_MODIFY_OWN_AUTH");
    await requireExistingPermission(permissionCode);
    const expiresAt = input.expiresAt == null ? null : new Date(input.expiresAt);

    await db.transaction(async (tx) => {
      await tx.execute(acquireSharedTopologyLock());
      const target = await requireUserInSubtree(actor.orgId, userId);
      await assertGrantOrgForHome(actor.orgId, input.orgId, target.orgId);
      await assertTargetPermission(actor, "assignments.grant", target.orgId);
      await assertTargetPermission(actor, "assignments.grant", input.orgId);
      await assertCanDelegatePermissions(
        actor.id,
        [permissionCode as AppPermissionCode],
        input.orgId,
        input.expiresAt,
      );

      const insert = tx.insert(userPermissions).values({
        userId,
        permissionCode,
        orgId: input.orgId,
        effect: input.effect,
        expiresAt,
      });
      await insert.onConflictDoUpdate({
        target: [userPermissions.userId, userPermissions.permissionCode, userPermissions.orgId],
        set: input.expiresAt == null ? { effect: input.effect } : { effect: input.effect, expiresAt },
      });
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
