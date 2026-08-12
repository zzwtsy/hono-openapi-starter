import { randomUUID } from "node:crypto";

import { and, asc, eq, inArray, ne } from "drizzle-orm";

import { allPermissions, toPermissionRefs } from "@/catalogs/permissions.js";
import { AppError } from "@/core/errors/app-error.js";
import { db } from "@/db/client.js";
import { permissions, rolePermissions, roles, user, userRoles } from "@/db/schema/index.js";
import { getManagedSubtree } from "../org-tree.js";
import {
  assertPermissionCodeInCatalog,
  getRole,
  requireExistingPermission,
  requireExistingRole,
  requireInstanceRole,
} from "../shared/service-helpers.js";

/** IAM 权限目录与角色管理子能力。 */
export const RoleService = {
  async listPermissions() {
    return toPermissionRefs(allPermissions.map(permission => permission.code));
  },

  // --- 角色 ---
  async listRoles() {
    return db.select().from(roles).orderBy(asc(roles.name));
  },

  async getRoleById(id: string) {
    return getRole(id);
  },

  async createRole(input: { name: string; description?: string }) {
    // 事务 + onConflictDoNothing + returning 判空:并发同名第二次 insert 冲突返回空,
    // 抛 COMMON_CONFLICT 而非撞 DB unique 转 500(照 createUser 范本,B2 D4)。
    const [role] = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(roles)
        .values({ id: randomUUID(), name: input.name, description: input.description, source: "instance" })
        .onConflictDoNothing({ target: roles.name })
        .returning();
      if (row == null) {
        throw new AppError("ROLE_NAME_CONFLICT");
      }
      return [row];
    });
    return role;
  },

  async updateRole(id: string, input: { name?: string; description?: string | null }) {
    await requireInstanceRole(id);
    if (input.name === undefined && input.description === undefined) {
      return getRole(id);
    }
    // 事务内 select 查重 + update:改名时查同组织(全局)重名排除自身,压窄 TOCTOU 窗口,
    // unique 约束兜底(B2 D4)。createRole 已查重,update 原缺查重,改名撞 unique 会 500。
    return db.transaction(async (tx) => {
      if (input.name !== undefined) {
        const [clash] = await tx
          .select({ id: roles.id })
          .from(roles)
          .where(and(eq(roles.name, input.name), ne(roles.id, id)));
        if (clash != null) {
          throw new AppError("ROLE_NAME_CONFLICT");
        }
      }
      const [role] = await tx.update(roles).set(input).where(eq(roles.id, id)).returning();
      return role;
    });
  },

  async deleteRole(id: string) {
    const [role] = await db
      .delete(roles)
      .where(and(eq(roles.id, id), eq(roles.source, "instance")))
      .returning({ id: roles.id });
    if (role == null) {
      throw new AppError("ROLE_NOT_FOUND");
    }
  },

  async listRolePermissions(id: string) {
    await getRole(id);
    const rows = await db
      .select({ permissionCode: rolePermissions.permissionCode })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, id));
    return toPermissionRefs(rows.map(r => r.permissionCode));
  },

  async assignRolePermissions(id: string, permissionCodes: string[]) {
    await requireInstanceRole(id);
    if (permissionCodes.length === 0) {
      return;
    }
    const uniquePermissionCodes = [...new Set(permissionCodes)];
    // 先校验 catalog，再校验 code-only registry；不依赖 DB 展示字段。
    for (const permissionCode of uniquePermissionCodes) {
      assertPermissionCodeInCatalog(permissionCode);
    }
    const existing = await db
      .select({ code: permissions.code })
      .from(permissions)
      .where(inArray(permissions.code, uniquePermissionCodes));
    if (existing.length !== uniquePermissionCodes.length) {
      const found = new Set(existing.map(e => e.code));
      const missing = uniquePermissionCodes.find(p => !found.has(p));
      throw new AppError("PERMISSION_NOT_FOUND", { params: { permissionCode: missing! } });
    }
    await db.transaction(async (tx) => {
      await tx
        .insert(rolePermissions)
        .values(uniquePermissionCodes.map(permissionCode => ({ roleId: id, permissionCode })))
        .onConflictDoNothing();
    });
  },

  /**
   * 原子批量更新实例角色权限差量。所有 code 和角色校验完成后才进入事务,
   * 避免新增成功、逐项删除失败造成角色处于部分状态。
   */
  async updateRolePermissions(id: string, addPermissionCodes: string[], removePermissionCodes: string[]) {
    await requireInstanceRole(id);
    const uniqueAddPermissionCodes = [...new Set(addPermissionCodes)];
    const uniqueRemovePermissionCodes = [...new Set(removePermissionCodes)];
    const removeSet = new Set(uniqueRemovePermissionCodes);
    const overlap = uniqueAddPermissionCodes.find(permissionCode => removeSet.has(permissionCode));
    if (overlap != null) {
      throw new AppError("COMMON_VALIDATION_FAILED", {
        details: [{ path: ["body", "addPermissionCodes"], message: `权限不能同时新增和撤销: ${overlap}` }],
      });
    }

    const changedPermissionCodes = [...uniqueAddPermissionCodes, ...uniqueRemovePermissionCodes];
    for (const permissionCode of changedPermissionCodes) {
      assertPermissionCodeInCatalog(permissionCode);
    }

    if (changedPermissionCodes.length > 0) {
      const existing = await db
        .select({ code: permissions.code })
        .from(permissions)
        .where(inArray(permissions.code, changedPermissionCodes));
      if (existing.length !== changedPermissionCodes.length) {
        const found = new Set(existing.map(e => e.code));
        const missing = changedPermissionCodes.find(p => !found.has(p));
        throw new AppError("PERMISSION_NOT_FOUND", { params: { permissionCode: missing! } });
      }
    }

    await db.transaction(async (tx) => {
      if (uniqueRemovePermissionCodes.length > 0) {
        await tx.delete(rolePermissions).where(
          and(eq(rolePermissions.roleId, id), inArray(rolePermissions.permissionCode, uniqueRemovePermissionCodes)),
        );
      }
      if (uniqueAddPermissionCodes.length > 0) {
        await tx.insert(rolePermissions).values(
          uniqueAddPermissionCodes.map(permissionCode => ({ roleId: id, permissionCode })),
        ).onConflictDoNothing();
      }
    });

    return this.listRolePermissions(id);
  },

  async deleteRolePermission(id: string, permissionCode: string) {
    await requireInstanceRole(id);
    await requireExistingPermission(permissionCode);
    await db
      .delete(rolePermissions)
      .where(and(eq(rolePermissions.roleId, id), eq(rolePermissions.permissionCode, permissionCode)));
  },

  /** 列出操作者管理子树内,直接授予某角色的 (user, org) 记录(含过期)。角色不存在 404;code/instance 均可查。 */
  async listRoleUsers(actorOrgId: string, roleId: string) {
    await requireExistingRole(roleId);
    const subtree = await getManagedSubtree(actorOrgId);
    return db
      .select({
        userId: user.id,
        userName: user.name,
        email: user.email,
        orgId: userRoles.orgId,
        expiresAt: userRoles.expiresAt,
      })
      .from(userRoles)
      .innerJoin(user, eq(userRoles.userId, user.id))
      .where(and(eq(userRoles.roleId, roleId), inArray(userRoles.orgId, subtree)))
      .orderBy(asc(user.name), asc(userRoles.orgId));
  },
};
