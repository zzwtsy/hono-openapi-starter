import { beforeEach, describe, expect, it } from "vitest";

import { syncAuthorizationCatalog } from "@/core/authorization/index.js";
import { db } from "@/db/client.js";
import { user } from "@/db/schema/auth-schema.js";
import { organizations, rolePermissions, roles, userPermissions, userRoles } from "@/db/schema/authorization-schema.js";
import { IamPermissionChecker } from "@/features/iam/permission-checker.js";
import { allPermissions } from "@/permissions-catalog.js";
import { resetDb } from "../../helpers/db.js";

/**
 * listEffectivePermissions 集成测试:真实 PG(testcontainers)验证有效权限全集算法
 * (角色权限 ∪ 直接allow − 直接deny,过滤过期 + 祖先继承)。
 */

const checker = new IamPermissionChecker();

beforeEach(async () => {
  await resetDb();
  await syncAuthorizationCatalog(allPermissions);
});

/** 建组织树 root -> south -> fujian + 测试用户(归属 fujian)。 */
async function setup() {
  await db.insert(organizations).values([
    { id: "org-root", name: "Root" },
    { id: "org-south", name: "South", parentId: "org-root" },
    { id: "org-fujian", name: "Fujian", parentId: "org-south" },
  ]);
  await db.insert(user).values({ id: "u-1", name: "U1", email: "u1@x.com", orgId: "org-fujian" });
}

/** 建实例角色 viewer(含 projects.read)。 */
async function createViewerRole() {
  await db.insert(roles).values({ id: "role-viewer", name: "viewer", source: "instance" });
  await db.insert(rolePermissions).values({ roleId: "role-viewer", permission: "projects.read" });
}

describe("listEffectivePermissions", () => {
  it("角色权限进入全集", async () => {
    await setup();
    await createViewerRole();
    await db.insert(userRoles).values({ userId: "u-1", roleId: "role-viewer", orgId: "org-fujian" });

    const perms = await checker.listEffectivePermissions("u-1", "org-fujian");
    expect(perms).toContain("projects.read");
  });

  it("祖先继承:在父组织授角色,子组织检查命中", async () => {
    await setup();
    await createViewerRole();
    // 在 root 授 viewer,检查 fujian(祖先集 {fujian, south, root})应命中
    await db.insert(userRoles).values({ userId: "u-1", roleId: "role-viewer", orgId: "org-root" });

    const perms = await checker.listEffectivePermissions("u-1", "org-fujian");
    expect(perms).toContain("projects.read");
  });

  it("deny 覆盖:角色含 projects.read,直接 deny 后全集不含", async () => {
    await setup();
    await createViewerRole();
    await db.insert(userRoles).values({ userId: "u-1", roleId: "role-viewer", orgId: "org-fujian" });
    await db.insert(userPermissions).values({ userId: "u-1", permission: "projects.read", orgId: "org-fujian", effect: "deny" });

    const perms = await checker.listEffectivePermissions("u-1", "org-fujian");
    expect(perms).not.toContain("projects.read");
  });

  it("过期授权不进入全集", async () => {
    await setup();
    await createViewerRole();
    await db.insert(userRoles).values({
      userId: "u-1",
      roleId: "role-viewer",
      orgId: "org-fujian",
      expiresAt: new Date("2020-01-01"),
    });

    const perms = await checker.listEffectivePermissions("u-1", "org-fujian");
    expect(perms).not.toContain("projects.read");
  });

  it("直接 allow 进入全集", async () => {
    await setup();
    await db.insert(userPermissions).values({ userId: "u-1", permission: "iam.read", orgId: "org-fujian", effect: "allow" });

    const perms = await checker.listEffectivePermissions("u-1", "org-fujian");
    expect(perms).toContain("iam.read");
  });
});
