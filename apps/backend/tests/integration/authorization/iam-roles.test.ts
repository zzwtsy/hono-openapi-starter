import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { syncAuthorizationCatalog } from "@/core/authorization/index.js";
import { db } from "@/db/client.js";
import { rolePermissions, roles } from "@/db/schema/authorization-schema.js";
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

  it("角色名冲突抛 COMMON_CONFLICT", async () => {
    await IamService.createRole({ name: "viewer" });
    await expect(IamService.createRole({ name: "viewer" })).rejects.toMatchObject({ code: "COMMON_CONFLICT" });
  });

  it("给实例角色配权限后 listRolePermissions 含", async () => {
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read", "iam.read"]);

    const perms = await IamService.listRolePermissions(role.id);
    expect(perms).toEqual(expect.arrayContaining(["projects.read", "iam.read"]));
  });

  it("assignRolePermissions 传不存在权限名抛 COMMON_NOT_FOUND", async () => {
    const role = await IamService.createRole({ name: "viewer" });
    // permissions.read 不在权限目录,FK 违例修复前会 500,修复后应 404(B2 D3)。
    await expect(
      IamService.assignRolePermissions(role.id, ["projects.read", "permissions.nonexistent"]),
    ).rejects.toMatchObject({ code: "COMMON_NOT_FOUND" });
  });

  it("删 code 角色(admin)抛错且角色仍在(source 保护)", async () => {
    await expect(IamService.deleteRole("role-admin")).rejects.toThrow();

    const [admin] = await db.select().from(roles).where(eq(roles.id, "role-admin"));
    expect(admin).toBeDefined();
    expect(admin?.source).toBe("code");
  });

  it("改 code 角色抛错(source 保护)", async () => {
    await expect(IamService.updateRole("role-admin", { name: "super-admin" })).rejects.toThrow();
  });

  it("updateRole 改名为已存在名抛 COMMON_CONFLICT", async () => {
    const r1 = await IamService.createRole({ name: "viewer" });
    await IamService.createRole({ name: "editor" });
    // 改 editor 为 viewer(已存在)-> 409,修复前缺查重会撞 unique 转 500(B2 D4)。
    await expect(IamService.updateRole(r1.id, { name: "editor" })).rejects.toMatchObject({ code: "COMMON_CONFLICT" });
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
    await IamService.assignRolePermissions(role.id, ["projects.read", "iam.read"]);
    await IamService.deleteRolePermission(role.id, "projects.read");

    const perms = await IamService.listRolePermissions(role.id);
    expect(perms).toEqual(["iam.read"]);
  });
});
