import { and, asc, eq } from "drizzle-orm";

import { toPermissionRefs } from "@/catalogs/permissions.js";
import { PermissionService } from "@/core/authorization/index.js";
import { AppError } from "@/core/errors/app-error.js";
import { db } from "@/db/client.js";
import { roles, user, userPermissions, userRoles } from "@/db/schema/index.js";
import { assertOrgInSubtree } from "../org-tree.js";
import {
  assertNotSelf,
  requireExistingPermission,
  requireExistingRole,
  requireUserInSubtree,
} from "../shared/service-helpers.js";

/** IAM 用户角色与直接权限授权子能力。 */
export const AssignmentService = {
  async assignUserRole(actorOrgId: string, userId: string, roleId: string, input: { orgId: string; expiresAt?: string }) {
    await requireExistingRole(roleId);
    await requireUserInSubtree(actorOrgId, userId);
    await assertOrgInSubtree(actorOrgId, input.orgId);
    const expiresAt = input.expiresAt != null ? new Date(input.expiresAt) : null;
    const insert = db.insert(userRoles).values({ userId, roleId, orgId: input.orgId, expiresAt });
    // 重复授:提供 expiresAt -> 更新(续期);省略 -> 保留原值(DoNothing 幂等,不清空)。
    // 不用空 set onConflictDoUpdate(Drizzle 拒绝空 set),省略走 DoNothing。
    if (input.expiresAt != null) {
      await insert.onConflictDoUpdate({
        target: [userRoles.userId, userRoles.roleId, userRoles.orgId],
        set: { expiresAt },
      });
    } else {
      await insert.onConflictDoNothing();
    }
  },

  /**
   * 撤用户角色(需 roleId + orgId 精确定位);user 与 grant.orgId 须在操作者管理子树内;不存在抛 NOT_FOUND。
   *  禁止撤销自己的授权 -> 403(防自我降级锁死,对齐 disableUser)。
   */
  async deleteUserRole(actorOrgId: string, actorUserId: string, userId: string, roleId: string, orgId: string) {
    assertNotSelf(actorUserId, userId, "USER_CANNOT_REVOKE_OWN_AUTH");
    await requireUserInSubtree(actorOrgId, userId);
    await assertOrgInSubtree(actorOrgId, orgId);
    const [row] = await db
      .delete(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId), eq(userRoles.orgId, orgId)))
      .returning();
    if (row == null) {
      throw new AppError("COMMON_NOT_FOUND");
    }
  },

  /**
   * 直接授用户权限(allow/deny,在某组织),可指定过期。user 与 grant.orgId 须在操作者管理子树内。
   * 重复授:effect 总以新值为准(必填,allow↔deny 可切);expiresAt 提供 -> 更新,省略 -> 保留原值(不清空)。
   */
  async assignUserPermission(
    actorOrgId: string,
    userId: string,
    permissionCode: string,
    input: { orgId: string; effect: "allow" | "deny"; expiresAt?: string },
  ) {
    await requireExistingPermission(permissionCode);
    await requireUserInSubtree(actorOrgId, userId);
    await assertOrgInSubtree(actorOrgId, input.orgId);
    const expiresAt = input.expiresAt != null ? new Date(input.expiresAt) : null;
    const insert = db.insert(userPermissions).values({ userId, permissionCode, orgId: input.orgId, effect: input.effect, expiresAt });
    // 重复授:effect 总更新(必填);expiresAt 提供 -> 更新(续期),省略 -> 保留原值(仅 set effect,不清空 expiresAt)。
    if (input.expiresAt != null) {
      await insert.onConflictDoUpdate({
        target: [userPermissions.userId, userPermissions.permissionCode, userPermissions.orgId],
        set: { expiresAt, effect: input.effect },
      });
    } else {
      await insert.onConflictDoUpdate({
        target: [userPermissions.userId, userPermissions.permissionCode, userPermissions.orgId],
        set: { effect: input.effect },
      });
    }
  },

  /**
   * 撤用户直接权限(需 permissionCode + orgId);user 与 grant.orgId 须在操作者管理子树内;不存在抛 NOT_FOUND。
   *  禁止撤销自己的授权 -> 403(防自我降级锁死,对齐 disableUser)。
   */
  async deleteUserPermission(actorOrgId: string, actorUserId: string, userId: string, permissionCode: string, orgId: string) {
    await requireExistingPermission(permissionCode);
    assertNotSelf(actorUserId, userId, "USER_CANNOT_REVOKE_OWN_AUTH");
    await requireUserInSubtree(actorOrgId, userId);
    await assertOrgInSubtree(actorOrgId, orgId);
    const [row] = await db
      .delete(userPermissions)
      .where(and(eq(userPermissions.userId, userId), eq(userPermissions.permissionCode, permissionCode), eq(userPermissions.orgId, orgId)))
      .returning();
    if (row == null) {
      throw new AppError("COMMON_NOT_FOUND");
    }
  },

  /** 列出用户在某组织的有效权限全集(走 PermissionService memoize)。user 与 orgId 须在操作者管理子树内。 */
  async listUserEffectivePermissions(actorOrgId: string, userId: string, orgId: string) {
    await requireUserInSubtree(actorOrgId, userId);
    await assertOrgInSubtree(actorOrgId, orgId);
    return PermissionService.listEffectivePermissions(userId, orgId);
  },

  /** 列出用户在某组织已授的角色记录(原始授权,非祖先继承,含过期)。user 与 orgId 须在操作者管理子树内。 */
  async listUserRoles(actorOrgId: string, userId: string, orgId: string) {
    await requireUserInSubtree(actorOrgId, userId);
    await assertOrgInSubtree(actorOrgId, orgId);
    return db
      .select({
        roleId: userRoles.roleId,
        roleName: roles.name,
        orgId: userRoles.orgId,
        expiresAt: userRoles.expiresAt,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(eq(userRoles.userId, userId), eq(userRoles.orgId, orgId)))
      .orderBy(asc(roles.name));
  },

  /** 列出用户在某组织的直接授权记录(原始授权,allow/deny,非祖先继承,含过期)。user 与 orgId 须在操作者管理子树内。 */
  async listUserDirectPermissions(actorOrgId: string, userId: string, orgId: string) {
    await requireUserInSubtree(actorOrgId, userId);
    await assertOrgInSubtree(actorOrgId, orgId);
    return db
      .select({
        permissionCode: userPermissions.permissionCode,
        effect: userPermissions.effect,
        orgId: userPermissions.orgId,
        expiresAt: userPermissions.expiresAt,
      })
      .from(userPermissions)
      .where(and(eq(userPermissions.userId, userId), eq(userPermissions.orgId, orgId)))
      .orderBy(asc(userPermissions.permissionCode))
      .then(rows => rows.map((row) => {
        const { permissionCode, ...grant } = row;
        return { ...grant, permission: toPermissionRefs([permissionCode])[0] };
      }));
  },

  // --- 审计 before 快照(供 audit() 中间件查旧值;不校验归属,校验由 handler 做) ---
  /** 审计 before 快照:查用户(UserSummary 形状,不含 password 等敏感列)。 */
  async getUserById(id: string) {
    const [row] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        orgId: user.orgId,
        disabled: user.disabled,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.id, id));
    return row;
  },

  /** 审计 before 快照:用户在某组织对某角色的授权记录(userRoles 主键 (userId, roleId, orgId),单行)。 */
  async getUserRoleGrant(userId: string, roleId: string, orgId: string) {
    const [row] = await db
      .select({
        roleId: userRoles.roleId,
        roleName: roles.name,
        orgId: userRoles.orgId,
        expiresAt: userRoles.expiresAt,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, roleId),
        eq(userRoles.orgId, orgId),
      ));
    return row;
  },

  /** 审计 before 快照:用户在某组织的直接权限授权记录(userPermissions 主键 (userId, permissionCode, orgId),单行)。 */
  async getUserPermissionGrant(userId: string, permissionCode: string, orgId: string) {
    const [row] = await db
      .select({
        permissionCode: userPermissions.permissionCode,
        effect: userPermissions.effect,
        orgId: userPermissions.orgId,
        expiresAt: userPermissions.expiresAt,
      })
      .from(userPermissions)
      .where(and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.permissionCode, permissionCode),
        eq(userPermissions.orgId, orgId),
      ));
    return row;
  },
};
