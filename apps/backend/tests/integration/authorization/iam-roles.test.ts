import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { syncAuthorizationCatalog } from "@/core/authorization/index.js";
import { db } from "@/db/client.js";
import { user } from "@/db/schema/auth-schema.js";
import { organizations, rolePermissions, roles, userRoles } from "@/db/schema/authorization-schema.js";
import { IamService } from "@/features/iam/service.js";
import { allPermissions } from "@/permissions-catalog.js";
import { resetDb } from "../../helpers/db.js";

/**
 * iam 角色管理集成测试:真实 PG(testcontainers)验证实例角色 CRUD + source 保护 + 权限分配。
 */

beforeEach(async () => {
  await resetDb();
  await syncAuthorizationCatalog(allPermissions);
});

describe("iam role management", () => {
  it("建实例角色(source=instance)", async () => {
    const role = await IamService.createRole({ name: "viewer", description: "只读" });
    expect(role.source).toBe("instance");
    expect(role.name).toBe("viewer");
  });

  it("角色名冲突抛 ROLE_NAME_CONFLICT", async () => {
    await IamService.createRole({ name: "viewer" });
    await expect(IamService.createRole({ name: "viewer" })).rejects.toMatchObject({ code: "ROLE_NAME_CONFLICT" });
  });

  it("给实例角色配权限后 listRolePermissions 含", async () => {
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read", "permissions.read"]);

    const perms = await IamService.listRolePermissions(role.id);
    expect(perms.map(permission => permission.code)).toEqual(expect.arrayContaining(["projects.read", "permissions.read"]));
  });

  it("assignRolePermissions 传不存在权限 code 抛 PERMISSION_NOT_FOUND", async () => {
    const role = await IamService.createRole({ name: "viewer" });
    // permissions.nonexistent 不在权限 catalog,应由 service 返回 PERMISSION_NOT_FOUND。
    await expect(
      IamService.assignRolePermissions(role.id, ["projects.read", "permissions.nonexistent"]),
    ).rejects.toMatchObject({ code: "PERMISSION_NOT_FOUND" });
  });

  it("删 code 角色(admin)抛 NOT_FOUND 且角色仍在(source 保护)", async () => {
    await expect(IamService.deleteRole("role-admin")).rejects.toMatchObject({ code: "ROLE_NOT_FOUND" });

    const [admin] = await db.select().from(roles).where(eq(roles.id, "role-admin"));
    expect(admin).toBeDefined();
    expect(admin?.source).toBe("code");
  });

  it("改 code 角色抛 NOT_FOUND(source 保护)", async () => {
    await expect(IamService.updateRole("role-admin", { name: "super-admin" })).rejects.toMatchObject({ code: "ROLE_NOT_FOUND" });
  });

  it("updateRole 改名为已存在名抛 ROLE_NAME_CONFLICT", async () => {
    const r1 = await IamService.createRole({ name: "viewer" });
    await IamService.createRole({ name: "editor" });
    // 改 editor 为 viewer(已存在)-> 409,修复前缺查重会撞 unique 转 500(B2 D4)。
    await expect(IamService.updateRole(r1.id, { name: "editor" })).rejects.toMatchObject({ code: "ROLE_NAME_CONFLICT" });
  });

  it("删实例角色 cascade 删 role_permissions", async () => {
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    await IamService.deleteRole(role.id);

    const grants = await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, role.id));
    expect(grants).toHaveLength(0);
  });

  it("撤角色的单个权限", async () => {
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read", "permissions.read"]);
    await IamService.deleteRolePermission(role.id, "projects.read");

    const perms = await IamService.listRolePermissions(role.id);
    expect(perms.map(permission => permission.code)).toEqual(["permissions.read"]);
  });
});

describe("listRoleUsers", () => {
  it("返回管理子树内授了该角色的用户(含 userName/email/orgId/expiresAt)", async () => {
    // 组织树 root -> south,操作者 home=root(管理子树={root,south})
    await db.insert(organizations).values([
      { id: "org-root", name: "Root" },
      { id: "org-south", name: "South", parentId: "org-root" },
    ]);
    await db.insert(user).values({ id: "u-2", name: "U2", email: "u2@x.com", orgId: "org-south" });
    const role = await IamService.createRole({ name: "viewer" });
    await db.insert(userRoles).values({ userId: "u-2", roleId: role.id, orgId: "org-south" });

    const users = await IamService.listRoleUsers("org-root", role.id);
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      userId: "u-2",
      userName: "U2",
      email: "u2@x.com",
      orgId: "org-south",
      expiresAt: null,
    });
  });

  it("管理子树外的授权不返回", async () => {
    // root -> south,操作者 home=south(管理子树={south}),root 在子树外
    await db.insert(organizations).values([
      { id: "org-root", name: "Root" },
      { id: "org-south", name: "South", parentId: "org-root" },
    ]);
    await db.insert(user).values([
      { id: "u-1", name: "U1", email: "u1@x.com", orgId: "org-root" },
      { id: "u-2", name: "U2", email: "u2@x.com", orgId: "org-south" },
    ]);
    const role = await IamService.createRole({ name: "viewer" });
    // u-1 在 root 授(子树外),u-2 在 south 授(子树内)
    await db.insert(userRoles).values([
      { userId: "u-1", roleId: role.id, orgId: "org-root" },
      { userId: "u-2", roleId: role.id, orgId: "org-south" },
    ]);

    const users = await IamService.listRoleUsers("org-south", role.id);
    expect(users).toHaveLength(1);
    expect(users[0].userId).toBe("u-2");
  });

  it("角色不存在抛 ROLE_NOT_FOUND", async () => {
    await expect(IamService.listRoleUsers("org-root", "role-nope")).rejects.toMatchObject({ code: "ROLE_NOT_FOUND" });
  });

  it("code 角色可查(admin)", async () => {
    // admin 角色由 syncAuthorizationCatalog 创建,code 角色 listRoleUsers 也能查
    await db.insert(organizations).values({ id: "org-root", name: "Root" });
    await db.insert(user).values({ id: "u-1", name: "U1", email: "u1@x.com", orgId: "org-root" });
    await db.insert(userRoles).values({ userId: "u-1", roleId: "role-admin", orgId: "org-root" });

    const users = await IamService.listRoleUsers("org-root", "role-admin");
    expect(users).toHaveLength(1);
    expect(users[0].userId).toBe("u-1");
  });
});
