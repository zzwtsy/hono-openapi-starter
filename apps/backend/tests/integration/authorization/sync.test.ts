import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { syncAuthorizationCatalog } from "@/core/authorization/index.js";
import { db } from "@/db/client.js";
import { user } from "@/db/schema/auth-schema.js";
import { organizations, permissions, rolePermissions, roles, userPermissions } from "@/db/schema/authorization-schema.js";
import { allPermissions } from "@/permissions-catalog.js";
import { resetDb } from "../../helpers/db.js";

/**
 * syncAuthorizationCatalog 集成测试:真实 PG(testcontainers)验证从代码同步权限目录 + 标准 admin 角色。
 * 见 [权限层规范](../../../../docs/conventions/authorization.md) 数据生命周期。
 */

beforeEach(async () => {
  await resetDb();
});

describe("syncAuthorizationCatalog", () => {
  it("同步代码声明的权限 code 到 code-only registry", async () => {
    await syncAuthorizationCatalog(allPermissions);

    const rows = await db.select().from(permissions);
    const codes = rows.map(r => r.code);

    expect(codes).toContain("projects.read");
    expect(rows.some(row => typeof row.code === "string")).toBe(true);
  });

  it("创建标准 admin 角色(标记 source='code',管理 API 不可改删)", async () => {
    await syncAuthorizationCatalog(allPermissions);

    const [admin] = await db.select().from(roles).where(eq(roles.id, "role-admin"));

    expect(admin?.name).toBe("admin");
    expect(admin?.source).toBe("code");
  });

  it("admin 角色授予全部权限(含 projects.read)", async () => {
    await syncAuthorizationCatalog(allPermissions);

    const grants = await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, "role-admin"));
    const perms = grants.map(g => g.permissionCode);

    expect(perms).toContain("projects.read");
  });

  it("幂等:重复同步不产生重复行", async () => {
    await syncAuthorizationCatalog(allPermissions);
    await syncAuthorizationCatalog(allPermissions);

    const permRows = await db.select().from(permissions).where(eq(permissions.code, "projects.read"));
    expect(permRows).toHaveLength(1);

    const adminGrants = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, "role-admin"));
    expect(adminGrants.filter(g => g.permissionCode === "projects.read")).toHaveLength(1);
  });

  it("catalog 外的未引用 code 会被启动同步清理", async () => {
    await db.insert(permissions).values({ code: "legacy.read" });

    await syncAuthorizationCatalog(allPermissions);

    const stale = await db.select().from(permissions).where(eq(permissions.code, "legacy.read"));
    expect(stale).toHaveLength(0);
  });

  it("catalog 外仍被角色或用户授权引用的 code 会阻止启动同步", async () => {
    await db.insert(permissions).values({ code: "legacy.read" });
    await db.insert(roles).values({ id: "role-legacy", name: "legacy", source: "instance" });
    await db.insert(rolePermissions).values({ roleId: "role-legacy", permissionCode: "legacy.read" });

    await expect(
      syncAuthorizationCatalog(allPermissions),
    ).rejects.toThrow("Stale permission code is still referenced: legacy.read");

    const roleGrant = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.permissionCode, "legacy.read"));
    expect(roleGrant).toHaveLength(1);
  });

  it("catalog 外仍被直接授权引用的 code 会阻止启动同步", async () => {
    await db.insert(permissions).values({ code: "legacy.read" });
    await db.insert(organizations).values({ id: "org-legacy", name: "Legacy" });
    await db.insert(user).values({ id: "user-legacy", name: "Legacy", email: "legacy@example.com", orgId: "org-legacy" });
    await db.insert(userPermissions).values({
      userId: "user-legacy",
      permissionCode: "legacy.read",
      orgId: "org-legacy",
      effect: "allow",
    });

    await expect(
      syncAuthorizationCatalog(allPermissions),
    ).rejects.toThrow("Stale permission code is still referenced: legacy.read");

    const userGrant = await db
      .select()
      .from(userPermissions)
      .where(eq(userPermissions.permissionCode, "legacy.read"));
    expect(userGrant).toHaveLength(1);
  });
});
