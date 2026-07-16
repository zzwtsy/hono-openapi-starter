import { beforeEach, describe, expect, it } from "vitest";

import { syncAuthorizationCatalog } from "@/core/authorization/index.js";
import { db } from "@/db/client.js";
import { user } from "@/db/schema/auth-schema.js";
import { organizations } from "@/db/schema/authorization-schema.js";
import { IamPermissionChecker } from "@/features/iam/permission-checker.js";
import { IamService } from "@/features/iam/service.js";
import { allPermissions } from "@/permissions-catalog.js";
import { resetDb } from "../../helpers/db.js";

/**
 * iam 用户授权集成测试:真实 PG(testcontainers)通过 IamService 授角色/直接授权,
 * 用 checkPermission 验证 ADR-0004 全部语义(并集/deny/祖先继承/过期/撤销)。
 */

const checker = new IamPermissionChecker();

beforeEach(async () => {
  await resetDb();
  await syncAuthorizationCatalog(allPermissions);
});

async function setup() {
  await db.insert(organizations).values([
    { id: "org-root", name: "Root" },
    { id: "org-south", name: "South", parentId: "org-root" },
    { id: "org-other", name: "Other" },
  ]);
  await db.insert(user).values([
    { id: "u-1", name: "U1", email: "u1@x.com", orgId: "org-root" },
    { id: "u-2", name: "U2", email: "u2@x.com", orgId: "org-other" },
  ]);
}

describe("iam user assignments", () => {
  it("授角色后 checkPermission 通过", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-root" });

    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(true);
  });

  it("直接 allow 后 checkPermission 通过", async () => {
    await setup();
    await IamService.assignUserPermission("org-root", "u-1", "iam.read", { orgId: "org-root", effect: "allow" });

    expect(await checker.check("u-1", "iam.read", "org-root")).toBe(true);
  });

  it("deny 覆盖角色权限", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-root" });
    await IamService.assignUserPermission("org-root", "u-1", "projects.read", { orgId: "org-root", effect: "deny" });

    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(false);
  });

  it("祖先继承:在 root 授角色,south 检查通过", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-root" });

    expect(await checker.check("u-1", "projects.read", "org-south")).toBe(true);
  });

  it("过期授权失效", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-root", expiresAt: "2020-01-01T00:00:00Z" });

    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(false);
  });

  it("撤角色后 checkPermission 失败", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-root" });
    await IamService.deleteUserRole("org-root", "u-1", role.id, "org-root");

    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(false);
  });

  it("授角色到不存在的角色抛错", async () => {
    await setup();
    await expect(IamService.assignUserRole("org-root", "u-1", "role-nope", { orgId: "org-root" })).rejects.toThrow();
  });

  it("授角色到不存在的组织抛错", async () => {
    await setup();
    await expect(IamService.assignUserRole("org-root", "u-1", "role-admin", { orgId: "org-nope" })).rejects.toThrow();
  });

  it("撤不存在的授权抛 NOT_FOUND", async () => {
    await setup();
    await expect(IamService.deleteUserRole("org-root", "u-1", "role-admin", "org-root")).rejects.toThrow();
  });

  it("授角色到子树外 grant.orgId -> 404(不暴露)", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await expect(
      IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-other" }),
    ).rejects.toMatchObject({ code: "COMMON_NOT_FOUND" });
  });

  it("授角色给子树外 user -> 404(不暴露)", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await expect(
      IamService.assignUserRole("org-root", "u-2", role.id, { orgId: "org-root" }),
    ).rejects.toMatchObject({ code: "COMMON_NOT_FOUND" });
  });

  it("重复授角色更新 expiresAt(续期)", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-root", expiresAt: "2020-01-01T00:00:00Z" });
    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(false);
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-root", expiresAt: "2099-01-01T00:00:00Z" });
    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(true);
  });

  it("重复授角色省略 expiresAt 保留原过期时间(不清空)", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    // 先授 2020(已过期)
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-root", expiresAt: "2020-01-01T00:00:00Z" });
    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(false);
    // 重授省略 expiresAt:原 2020 过期保留,仍失效(未被清空为永久)
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-root" });
    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(false);
    // 提供新 expiresAt 续期到 2099 -> 生效
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-root", expiresAt: "2099-01-01T00:00:00Z" });
    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(true);
  });

  it("重复授直接权限省略 expiresAt 保留原过期,effect 仍更新", async () => {
    await setup();
    // 先授 allow + 2020(已过期)
    await IamService.assignUserPermission("org-root", "u-1", "projects.read", { orgId: "org-root", effect: "allow", expiresAt: "2020-01-01T00:00:00Z" });
    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(false);
    // 重授 deny 省略 expiresAt:effect 变 deny,expiresAt 保留 2020(过期)
    await IamService.assignUserPermission("org-root", "u-1", "projects.read", { orgId: "org-root", effect: "deny" });
    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(false);
    // 续期到 2099(effect 仍 deny,保留):deny 拒绝
    await IamService.assignUserPermission("org-root", "u-1", "projects.read", { orgId: "org-root", effect: "deny", expiresAt: "2099-01-01T00:00:00Z" });
    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(false);
    // 切回 allow + 2099:通过
    await IamService.assignUserPermission("org-root", "u-1", "projects.read", { orgId: "org-root", effect: "allow", expiresAt: "2099-01-01T00:00:00Z" });
    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(true);
  });

  it("重复授直接权限更新 effect(allow->deny)", async () => {
    await setup();
    await IamService.assignUserPermission("org-root", "u-1", "projects.read", { orgId: "org-root", effect: "allow" });
    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(true);
    await IamService.assignUserPermission("org-root", "u-1", "projects.read", { orgId: "org-root", effect: "deny" });
    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(false);
  });

  it("撤子树外 grant -> 404", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-root" });
    await expect(
      IamService.deleteUserRole("org-root", "u-1", role.id, "org-other"),
    ).rejects.toMatchObject({ code: "COMMON_NOT_FOUND" });
  });
});
