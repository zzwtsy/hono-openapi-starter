import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { allPermissions } from "@/catalogs/permissions.js";
import { syncAuthorizationCatalog } from "@/core/authorization/index.js";
import { setPermissionChecker } from "@/core/authorization/permission-checker.js";
import { db } from "@/db/client.js";
import { user } from "@/db/schema/auth-schema.js";
import { rolePermissions, roles, userRoles } from "@/db/schema/authorization-schema.js";
import { organizations } from "@/db/schema/organization-schema.js";
import { IamPermissionChecker } from "@/features/iam/permission-checker.js";
import { IamService as CurrentIamService } from "@/features/iam/service.js";
import { resetDb } from "../../helpers/db.js";

/**
 * iam 角色管理集成测试:真实 PG(testcontainers)验证实例角色 CRUD + source 保护 + 权限分配。
 */

const rootActor = { id: "root-actor", orgId: "org-root" };
const IamService = {
  ...CurrentIamService,
  createRole: async (input: Parameters<typeof CurrentIamService.createRole>[1]) => CurrentIamService.createRole(rootActor, input),
  updateRole: async (roleId: string, input: Parameters<typeof CurrentIamService.updateRole>[2]) => CurrentIamService.updateRole(rootActor, roleId, input),
  deleteRole: async (roleId: string) => CurrentIamService.deleteRole(rootActor, roleId),
  assignRolePermissions: async (roleId: string, codes: string[]) => CurrentIamService.assignRolePermissions(rootActor, roleId, codes),
  updateRolePermissions: async (roleId: string, add: string[], remove: string[]) => CurrentIamService.updateRolePermissions(rootActor, roleId, add, remove),
  deleteRolePermission: async (roleId: string, code: string) => CurrentIamService.deleteRolePermission(rootActor, roleId, code),
  listRoleUsers: async (orgId: string, roleId: string) => CurrentIamService.listRoleUsers({ ...rootActor, orgId }, roleId),
};

beforeEach(async () => {
  await resetDb();
  await syncAuthorizationCatalog(allPermissions);
  await db.insert(organizations).values({ id: "org-root", name: "Root" });
  await db.insert(user).values({ id: "root-actor", name: "Root Actor", email: "root-actor@example.com", orgId: "org-root" });
  await db.insert(userRoles).values({ userId: "root-actor", roleId: "role-admin", orgId: "org-root" });
  setPermissionChecker(new IamPermissionChecker());
});

describe("iam role management", () => {
  it("下级组织管理员即使拥有角色权限也不能维护全局角色", async () => {
    await db.insert(organizations).values({ id: "org-sub", name: "Sub", parentId: "org-root" });
    await db.insert(user).values({ id: "sub-actor", name: "Sub Actor", email: "sub-actor@example.com", orgId: "org-sub" });
    await db.insert(userRoles).values({ userId: "sub-actor", roleId: "role-admin", orgId: "org-sub" });

    await expect(CurrentIamService.createRole(
      { id: "sub-actor", orgId: "org-sub" },
      { name: "sub-created-role" },
    )).rejects.toMatchObject({ code: "ROLE_REQUIRES_SYSTEM_ROOT" });
  });

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

  it("批量配权限会去重重复 code", async () => {
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read", "projects.read"]);

    const perms = await IamService.listRolePermissions(role.id);
    expect(perms.map(permission => permission.code)).toEqual(["projects.read"]);
  });

  it("批量更新角色权限后同时完成新增和撤销", async () => {
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read", "permissions.read"]);

    const current = await IamService.updateRolePermissions(role.id, ["users.read"], ["projects.read"]);

    expect(current.map(permission => permission.code)).toEqual(expect.arrayContaining(["users.read", "permissions.read"]));
    const persisted = await IamService.listRolePermissions(role.id);
    expect(persisted.map(permission => permission.code)).toEqual(expect.arrayContaining(["users.read", "permissions.read"]));
    expect(persisted.map(permission => permission.code)).not.toContain("projects.read");
  });

  it("全选撤销一次性清空角色权限", async () => {
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read", "permissions.read"]);

    const current = await IamService.updateRolePermissions(role.id, [], ["projects.read", "permissions.read"]);

    expect(current).toEqual([]);
    await expect(IamService.listRolePermissions(role.id)).resolves.toEqual([]);
  });

  it("批量更新遇到不存在权限时不改变原集合", async () => {
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);

    await expect(
      IamService.updateRolePermissions(role.id, ["projects.read"], ["permissions.nonexistent"]),
    ).rejects.toMatchObject({ code: "PERMISSION_NOT_FOUND" });

    const persisted = await IamService.listRolePermissions(role.id);
    expect(persisted.map(permission => permission.code)).toEqual(["projects.read"]);
  });

  it("批量更新新增和撤销重复权限时不改变原集合", async () => {
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);

    await expect(
      IamService.updateRolePermissions(role.id, ["projects.read"], ["projects.read"]),
    ).rejects.toMatchObject({ code: "COMMON_VALIDATION_FAILED" });

    await expect(IamService.listRolePermissions(role.id)).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "projects.read" }),
    ]));
  });

  it("代码角色不能批量更新权限", async () => {
    await expect(IamService.updateRolePermissions("role-admin", ["projects.read"], [])).rejects.toMatchObject({ code: "ROLE_NOT_FOUND" });
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
    // 改为已存在的角色名必须返回业务冲突，而不是泄漏数据库 unique 异常。
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
    await db.insert(organizations).values({ id: "org-south", name: "South", parentId: "org-root" });
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
    await db.insert(organizations).values({ id: "org-south", name: "South", parentId: "org-root" });
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
    await db.insert(user).values({ id: "u-1", name: "U1", email: "u1@x.com", orgId: "org-root" });
    await db.insert(userRoles).values({ userId: "u-1", roleId: "role-admin", orgId: "org-root" });

    const users = await IamService.listRoleUsers("org-root", "role-admin");
    expect(users.some(item => item.userId === "u-1")).toBe(true);
  });
});
