import { randomUUID } from "node:crypto";

import { and, asc, eq, sql } from "drizzle-orm";

import { PermissionService } from "@/core/authorization/index.js";
import { AppError } from "@/core/errors/app-error.js";
import { db } from "@/db/client.js";
import { organizations, permissions, rolePermissions, roles, user, userPermissions, userRoles } from "@/db/schema/index.js";

/**
 * iam feature service:权限管理的数据访问。
 *
 * 权限目录(`permissions`)是代码同步的只读目录,管理 API 不建实例权限(ADR-0004)。
 * 角色分两类:`source='code'`(admin,代码同步,管理 API 不可改删)与 `source='instance'`(管理 API 创建)。
 * 角色写操作仅限 instance;授权(授角色/直接授权)可引用任意角色与权限,绑定组织(第一版全局 admin 语义)。
 */

async function getRole(id: string) {
  const [role] = await db.select().from(roles).where(eq(roles.id, id));
  if (role == null) {
    throw new AppError("COMMON_NOT_FOUND");
  }
  return role;
}

/** 校验角色存在且为 instance,否则 NOT_FOUND(供角色写操作复用)。 */
async function requireInstanceRole(id: string) {
  const [role] = await db.select({ source: roles.source }).from(roles).where(eq(roles.id, id));
  if (role == null || role.source !== "instance") {
    throw new AppError("COMMON_NOT_FOUND");
  }
}

/** 校验角色存在(授角色时可引用任意角色,含 code)。 */
async function requireExistingRole(id: string) {
  const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.id, id));
  if (role == null) {
    throw new AppError("COMMON_NOT_FOUND", { message: "角色不存在" });
  }
}

async function requireExistingOrg(id: string) {
  const [org] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, id));
  if (org == null) {
    throw new AppError("COMMON_NOT_FOUND", { message: "组织不存在" });
  }
}

async function requireExistingPermission(name: string) {
  const [perm] = await db.select({ name: permissions.name }).from(permissions).where(eq(permissions.name, name));
  if (perm == null) {
    throw new AppError("COMMON_NOT_FOUND", { message: "权限不存在" });
  }
}

export const IamService = {
  // --- 权限目录 ---
  async listPermissions() {
    return db.select().from(permissions).orderBy(asc(permissions.name));
  },

  // --- 角色 ---
  async listRoles() {
    return db.select().from(roles).orderBy(asc(roles.name));
  },

  async getRoleById(id: string) {
    return getRole(id);
  },

  async createRole(input: { name: string; description?: string }) {
    const [existing] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, input.name));
    if (existing != null) {
      throw new AppError("COMMON_CONFLICT", { message: "角色名已存在" });
    }
    const [role] = await db
      .insert(roles)
      .values({ id: randomUUID(), name: input.name, description: input.description, source: "instance" })
      .returning();
    return role;
  },

  async updateRole(id: string, input: { name?: string; description?: string | null }) {
    await requireInstanceRole(id);
    if (input.name === undefined && input.description === undefined) {
      return getRole(id);
    }
    const [role] = await db.update(roles).set(input).where(eq(roles.id, id)).returning();
    return role;
  },

  async deleteRole(id: string) {
    const [role] = await db
      .delete(roles)
      .where(and(eq(roles.id, id), eq(roles.source, "instance")))
      .returning({ id: roles.id });
    if (role == null) {
      throw new AppError("COMMON_NOT_FOUND");
    }
  },

  async listRolePermissions(id: string) {
    await getRole(id);
    const rows = await db
      .select({ permission: rolePermissions.permission })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, id));
    return rows.map(r => r.permission);
  },

  async assignRolePermissions(id: string, permissionNames: string[]) {
    await requireInstanceRole(id);
    if (permissionNames.length > 0) {
      await db
        .insert(rolePermissions)
        .values(permissionNames.map(p => ({ roleId: id, permission: p })))
        .onConflictDoNothing();
    }
  },

  async deleteRolePermission(id: string, permission: string) {
    await requireInstanceRole(id);
    await db
      .delete(rolePermissions)
      .where(and(eq(rolePermissions.roleId, id), eq(rolePermissions.permission, permission)));
  },

  // --- 用户 ---
  /** 列出某组织下的用户(按创建时间、id 确定性排序)。 */
  async listUsers(orgId: string) {
    return db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        orgId: user.orgId,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.orgId, orgId))
      .orderBy(asc(user.createdAt), asc(user.id));
  },

  // --- 用户授权 ---
  /** 授用户角色(在某组织),可指定过期。重复授幂等(onConflictDoNothing)。 */
  async assignUserRole(userId: string, roleId: string, input: { orgId: string; expiresAt?: string }) {
    await requireExistingRole(roleId);
    await requireExistingOrg(input.orgId);
    await db
      .insert(userRoles)
      .values({
        userId,
        roleId,
        orgId: input.orgId,
        expiresAt: input.expiresAt != null ? new Date(input.expiresAt) : null,
      })
      .onConflictDoNothing();
  },

  /** 撤用户角色(需 roleId + orgId 精确定位);不存在抛 NOT_FOUND。 */
  async deleteUserRole(userId: string, roleId: string, orgId: string) {
    const [row] = await db
      .delete(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId), eq(userRoles.orgId, orgId)))
      .returning();
    if (row == null) {
      throw new AppError("COMMON_NOT_FOUND");
    }
  },

  /** 直接授用户权限(allow/deny,在某组织),可指定过期。重复幂等。 */
  async assignUserPermission(
    userId: string,
    permission: string,
    input: { orgId: string; effect: "allow" | "deny"; expiresAt?: string },
  ) {
    await requireExistingPermission(permission);
    await requireExistingOrg(input.orgId);
    await db
      .insert(userPermissions)
      .values({
        userId,
        permission,
        orgId: input.orgId,
        effect: input.effect,
        expiresAt: input.expiresAt != null ? new Date(input.expiresAt) : null,
      })
      .onConflictDoNothing();
  },

  /** 撤用户直接权限(需 permission + orgId);不存在抛 NOT_FOUND。 */
  async deleteUserPermission(userId: string, permission: string, orgId: string) {
    const [row] = await db
      .delete(userPermissions)
      .where(and(eq(userPermissions.userId, userId), eq(userPermissions.permission, permission), eq(userPermissions.orgId, orgId)))
      .returning();
    if (row == null) {
      throw new AppError("COMMON_NOT_FOUND");
    }
  },

  /** 列出用户在某组织的有效权限全集(走 PermissionService memoize)。 */
  async listUserEffectivePermissions(userId: string, orgId: string) {
    return PermissionService.listEffectivePermissions(userId, orgId);
  },

  // --- 组织 ---
  /** 列出所有组织(扁平,带 parentId,前端构建树)。 */
  async listOrganizations() {
    return db.select().from(organizations).orderBy(asc(organizations.name));
  },

  /** 获取组织详情;不存在抛 NOT_FOUND。 */
  async getOrganizationById(id: string) {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    if (org == null) {
      throw new AppError("COMMON_NOT_FOUND");
    }
    return org;
  },

  /** 建组织(name + 可选 parentId);parentId 存在性校验。 */
  async createOrganization(input: { name: string; parentId?: string | null }) {
    if (input.parentId != null) {
      await requireExistingOrg(input.parentId);
    }
    const [org] = await db
      .insert(organizations)
      .values({ id: randomUUID(), name: input.name, parentId: input.parentId ?? null })
      .returning();
    return org;
  },

  /** 改组织(改 parentId 时防环:新 parent 的祖先集含自身则成环,拒绝)。 */
  async updateOrganization(id: string, input: { name?: string; parentId?: string | null }) {
    await requireExistingOrg(id);
    if (input.parentId !== undefined && input.parentId !== null) {
      await requireExistingOrg(input.parentId);
      // 防环:新 parent 的祖先集(含自身)若含 id,说明 id 是新 parent 的祖先,挂上去成环
      const [row] = await db.execute(sql`
        WITH RECURSIVE org_ancestors AS (
          SELECT ${organizations.id} FROM ${organizations} WHERE ${organizations.id} = ${input.parentId}
          UNION ALL
          SELECT ${organizations.parentId} FROM ${organizations}
          JOIN org_ancestors oa ON ${organizations.id} = oa.id
        )
        SELECT EXISTS(SELECT 1 FROM org_ancestors WHERE id = ${id}) AS is_cycle
      `);
      if (row?.is_cycle === true) {
        throw new AppError("COMMON_CONFLICT", { message: "不能将组织挂到自身或其子孙下(会形成环)" });
      }
    }
    const [org] = await db.update(organizations).set(input).where(eq(organizations.id, id)).returning();
    return org;
  },

  /** 删组织(有子组织拒绝;外键 cascade 删 user_roles/user_permissions/projects)。 */
  async deleteOrganization(id: string) {
    const [child] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.parentId, id))
      .limit(1);
    if (child != null) {
      throw new AppError("COMMON_CONFLICT", { message: "组织有子组织,请先删除子组织" });
    }
    const [org] = await db.delete(organizations).where(eq(organizations.id, id)).returning({ id: organizations.id });
    if (org == null) {
      throw new AppError("COMMON_NOT_FOUND");
    }
  },
};
