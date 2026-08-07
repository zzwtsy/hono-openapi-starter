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
 * (角色权限 ∪ 直接allow − 直接deny,过滤过期 + 祖先继承),带来源链与 deny 抵消。
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
  await db.insert(rolePermissions).values({ roleId: "role-viewer", permissionCode: "projects.read" });
}

type PermResult = Awaited<ReturnType<typeof checker.listEffectivePermissions>>;

function findEffective(perms: PermResult, permission: string) {
  return perms.effective.find(p => p.permissionCode === permission);
}

function findDenied(perms: PermResult, permission: string) {
  return perms.denied.find(p => p.permissionCode === permission);
}

describe("listEffectivePermissions", () => {
  it("角色权限进入 effective,带 role 来源(roleId/roleName/orgId)", async () => {
    await setup();
    await createViewerRole();
    await db.insert(userRoles).values({ userId: "u-1", roleId: "role-viewer", orgId: "org-fujian" });

    const perms = await checker.listEffectivePermissions("u-1", "org-fujian");
    const perm = findEffective(perms, "projects.read");
    expect(perm).toBeDefined();
    expect(perm!.sources).toHaveLength(1);
    expect(perm!.sources[0]).toMatchObject({
      type: "role",
      roleId: "role-viewer",
      roleName: "viewer",
      orgId: "org-fujian",
    });
  });

  it("祖先继承:在父组织授角色,子组织检查命中,来源 orgId 为祖先组织", async () => {
    await setup();
    await createViewerRole();
    // 在 root 授 viewer,检查 fujian(祖先集 {fujian, south, root})应命中
    await db.insert(userRoles).values({ userId: "u-1", roleId: "role-viewer", orgId: "org-root" });

    const perms = await checker.listEffectivePermissions("u-1", "org-fujian");
    const perm = findEffective(perms, "projects.read");
    expect(perm).toBeDefined();
    expect(perm!.sources[0]).toMatchObject({
      type: "role",
      roleId: "role-viewer",
      orgId: "org-root",
    });
  });

  it("deny 抵消:角色含 projects.read,直接 deny 后进 denied,suppressedSources 含角色来源", async () => {
    await setup();
    await createViewerRole();
    await db.insert(userRoles).values({ userId: "u-1", roleId: "role-viewer", orgId: "org-fujian" });
    await db.insert(userPermissions).values({ userId: "u-1", permissionCode: "projects.read", orgId: "org-fujian", effect: "deny" });

    const perms = await checker.listEffectivePermissions("u-1", "org-fujian");
    expect(findEffective(perms, "projects.read")).toBeUndefined();
    const denied = findDenied(perms, "projects.read");
    expect(denied).toBeDefined();
    expect(denied!.deniedBy).toEqual([{ orgId: "org-fujian", expiresAt: null }]);
    expect(denied!.suppressedSources).toHaveLength(1);
    expect(denied!.suppressedSources[0]).toMatchObject({ type: "role", roleId: "role-viewer", orgId: "org-fujian" });
  });

  it("deny 了但无来源(无效 deny)进 denied,suppressedSources 为空", async () => {
    await setup();
    // deny 了一条根本没授予的权限
    await db.insert(userPermissions).values({ userId: "u-1", permissionCode: "projects.read", orgId: "org-fujian", effect: "deny" });

    const perms = await checker.listEffectivePermissions("u-1", "org-fujian");
    const denied = findDenied(perms, "projects.read");
    expect(denied).toBeDefined();
    expect(denied!.suppressedSources).toEqual([]);
    expect(denied!.deniedBy).toEqual([{ orgId: "org-fujian", expiresAt: null }]);
  });

  it("过期授权不进入 effective 或 denied", async () => {
    await setup();
    await createViewerRole();
    await db.insert(userRoles).values({
      userId: "u-1",
      roleId: "role-viewer",
      orgId: "org-fujian",
      expiresAt: new Date("2020-01-01"),
    });

    const perms = await checker.listEffectivePermissions("u-1", "org-fujian");
    expect(findEffective(perms, "projects.read")).toBeUndefined();
    expect(findDenied(perms, "projects.read")).toBeUndefined();
  });

  it("直接 allow 进入 effective,带 direct 来源(roleId/roleName 为 null)", async () => {
    await setup();
    await db.insert(userPermissions).values({ userId: "u-1", permissionCode: "permissions.read", orgId: "org-fujian", effect: "allow" });

    const perms = await checker.listEffectivePermissions("u-1", "org-fujian");
    const perm = findEffective(perms, "permissions.read");
    expect(perm).toBeDefined();
    expect(perm!.sources).toHaveLength(1);
    expect(perm!.sources[0]).toMatchObject({ type: "direct", roleId: null, roleName: null, orgId: "org-fujian" });
  });

  it("多来源:同一 permission 来自角色 + 直接 allow,sources 聚合两条", async () => {
    await setup();
    await createViewerRole();
    await db.insert(userRoles).values({ userId: "u-1", roleId: "role-viewer", orgId: "org-fujian" });
    // 直接 allow 同一权限
    await db.insert(userPermissions).values({ userId: "u-1", permissionCode: "projects.read", orgId: "org-fujian", effect: "allow" });

    const perms = await checker.listEffectivePermissions("u-1", "org-fujian");
    const perm = findEffective(perms, "projects.read");
    expect(perm).toBeDefined();
    expect(perm!.sources).toHaveLength(2);
    expect(perm!.sources.some(s => s.type === "role" && s.roleId === "role-viewer")).toBe(true);
    expect(perm!.sources.some(s => s.type === "direct")).toBe(true);
  });
});
