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
  ]);
  await db.insert(user).values({ id: "u-1", name: "U1", email: "u1@x.com", orgId: "org-root" });
}

describe("iam user assignments", () => {
  it("授角色后 checkPermission 通过", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    await IamService.assignUserRole("u-1", role.id, { orgId: "org-root" });

    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(true);
  });

  it("直接 allow 后 checkPermission 通过", async () => {
    await setup();
    await IamService.assignUserPermission("u-1", "iam.read", { orgId: "org-root", effect: "allow" });

    expect(await checker.check("u-1", "iam.read", "org-root")).toBe(true);
  });

  it("deny 覆盖角色权限", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    await IamService.assignUserRole("u-1", role.id, { orgId: "org-root" });
    await IamService.assignUserPermission("u-1", "projects.read", { orgId: "org-root", effect: "deny" });

    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(false);
  });

  it("祖先继承:在 root 授角色,south 检查通过", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    await IamService.assignUserRole("u-1", role.id, { orgId: "org-root" });

    expect(await checker.check("u-1", "projects.read", "org-south")).toBe(true);
  });

  it("过期授权失效", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    await IamService.assignUserRole("u-1", role.id, { orgId: "org-root", expiresAt: "2020-01-01T00:00:00Z" });

    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(false);
  });

  it("撤角色后 checkPermission 失败", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    await IamService.assignUserRole("u-1", role.id, { orgId: "org-root" });
    await IamService.deleteUserRole("u-1", role.id, "org-root");

    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(false);
  });

  it("授角色到不存在的角色抛错", async () => {
    await setup();
    await expect(IamService.assignUserRole("u-1", "role-nope", { orgId: "org-root" })).rejects.toThrow();
  });

  it("授角色到不存在的组织抛错", async () => {
    await setup();
    await expect(IamService.assignUserRole("u-1", "role-admin", { orgId: "org-nope" })).rejects.toThrow();
  });

  it("撤不存在的授权抛 NOT_FOUND", async () => {
    await setup();
    await expect(IamService.deleteUserRole("u-1", "role-admin", "org-root")).rejects.toThrow();
  });
});
