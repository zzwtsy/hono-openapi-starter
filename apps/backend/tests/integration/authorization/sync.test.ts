import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { syncAuthorizationCatalog } from "@/core/authorization/index.js";
import { db } from "@/db/client.js";
import { permissions, rolePermissions, roles } from "@/db/schema/authorization-schema.js";
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
  it("同步代码声明的权限到 permissions 表(含 description)", async () => {
    await syncAuthorizationCatalog(allPermissions);

    const rows = await db.select().from(permissions);
    const names = rows.map(r => r.name);

    expect(names).toContain("projects.read");
    const projectsRead = rows.find(r => r.name === "projects.read");
    expect(projectsRead?.description).toBe("查看项目");
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
    const perms = grants.map(g => g.permission);

    expect(perms).toContain("projects.read");
  });

  it("幂等:重复同步不产生重复行", async () => {
    await syncAuthorizationCatalog(allPermissions);
    await syncAuthorizationCatalog(allPermissions);

    const permRows = await db.select().from(permissions).where(eq(permissions.name, "projects.read"));
    expect(permRows).toHaveLength(1);

    const adminGrants = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, "role-admin"));
    expect(adminGrants.filter(g => g.permission === "projects.read")).toHaveLength(1);
  });
});
