import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { allPermissions } from "@/catalogs/permissions.js";
import { syncAuthorizationCatalog } from "@/core/authorization/index.js";
import { db } from "@/db/client.js";
import { user } from "@/db/schema/auth-schema.js";
import { organizations } from "@/db/schema/organization-schema.js";
import { IamService } from "@/features/iam/service.js";
import { resetDb } from "../../helpers/db.js";

/**
 * iam 组织管理集成测试:真实 PG(testcontainers)验证组织树 CRUD + 防环 + 删除约束。
 */

beforeEach(async () => {
  await resetDb();
  await syncAuthorizationCatalog(allPermissions);
});

async function waitForBlockedQuery(fragment: string) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const [row] = await db.execute(sql<{ blocked: boolean }>`
      SELECT EXISTS (
        SELECT 1
        FROM pg_stat_activity
        WHERE wait_event_type = 'Lock'
          AND lower(query) LIKE ${`%${fragment.toLowerCase()}%`}
      ) AS blocked
    `);
    if (row?.blocked === true) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error(`等待被阻塞的 PostgreSQL 查询超时: ${fragment}`);
}

describe("iam organization management", () => {
  it("建根组织和子组织", async () => {
    const root = await IamService.createOrganization({ name: "Root" });
    const south = await IamService.createOrganization({ name: "South", parentId: root.id });

    expect(root.parentId).toBeNull();
    expect(south.parentId).toBe(root.id);
  });

  it("建组织到不存在父组织抛 NOT_FOUND", async () => {
    await expect(IamService.createOrganization({ name: "X", parentId: "org-nope" })).rejects.toMatchObject({ code: "ORG_NOT_FOUND" });
  });

  it("改 parent 形成环抛 CONFLICT(挂到自身子孙下)", async () => {
    const root = await IamService.createOrganization({ name: "Root" });
    const south = await IamService.createOrganization({ name: "South", parentId: root.id });
    // 把 root 挂到 south 下:root 是 south 的祖先,会成环
    await expect(IamService.updateOrganization(root.id, { parentId: south.id })).rejects.toMatchObject({ code: "ORG_CYCLE" });
  });

  it("改 parent 到自身抛 CONFLICT", async () => {
    const root = await IamService.createOrganization({ name: "Root" });
    await expect(IamService.updateOrganization(root.id, { parentId: root.id })).rejects.toMatchObject({ code: "ORG_CYCLE" });
  });

  it("改 parent 到合法新父成功", async () => {
    const root = await IamService.createOrganization({ name: "Root" });
    const south = await IamService.createOrganization({ name: "South", parentId: root.id });
    const fujian = await IamService.createOrganization({ name: "Fujian", parentId: root.id });
    // fujian 从 root 挂到 south(合法:south 不是 fujian 的子孙)
    const updated = await IamService.updateOrganization(fujian.id, { parentId: south.id });
    expect(updated.parentId).toBe(south.id);
  });

  it("删有子组织的根抛 CONFLICT", async () => {
    const root = await IamService.createOrganization({ name: "Root" });
    await IamService.createOrganization({ name: "South", parentId: root.id });
    await expect(IamService.deleteOrganization(root.id)).rejects.toMatchObject({ code: "ORG_HAS_CHILDREN" });
  });

  it("删叶子组织成功,父组织仍在", async () => {
    const root = await IamService.createOrganization({ name: "Root" });
    const south = await IamService.createOrganization({ name: "South", parentId: root.id });
    await IamService.deleteOrganization(south.id);

    const rootDetail = await IamService.getOrganizationById(root.id);
    expect(rootDetail.id).toBe(root.id);
  });

  it("删不存在组织抛 NOT_FOUND", async () => {
    await expect(IamService.deleteOrganization("org-nope")).rejects.toMatchObject({ code: "ORG_NOT_FOUND" });
  });

  it("删有用户的组织 -> 409(防孤儿用户)", async () => {
    const org = await IamService.createOrganization({ name: "WithUsers" });
    // 直插用户(orgId=org),绕过 createUser
    await db.insert(user).values({ id: "u-orphan-test", name: "U", email: "orphan@test.com", orgId: org.id });
    await expect(IamService.deleteOrganization(org.id)).rejects.toMatchObject({
      code: "ORG_HAS_USERS",
    });
    // 拒绝后组织仍存在(防 guard 误删:若检查顺序错成先删后查,org 已没而 user 成真孤儿)。
    await expect(IamService.getOrganizationById(org.id)).resolves.toBeDefined();
  });

  it("user.orgId 拒绝 null 和不存在的组织", async () => {
    await expect(db.execute(sql`
      INSERT INTO "user" (id, name, email, org_id)
      VALUES ('u-null-org', 'NullOrg', 'null-org@test.com', NULL)
    `)).rejects.toMatchObject({ cause: { code: "23502" } });

    await expect(db.insert(user).values({
      id: "u-missing-org",
      name: "MissingOrg",
      email: "missing-org@test.com",
      orgId: "org-missing",
    })).rejects.toMatchObject({ cause: { code: "23503" } });
  });

  it("绕过 service 直接删除有用户组织仍被 FK 拒绝", async () => {
    const org = await IamService.createOrganization({ name: "FkProtected" });
    await db.insert(user).values({ id: "u-fk", name: "U", email: "fk@test.com", orgId: org.id });

    await expect(db.delete(organizations).where(eq(organizations.id, org.id))).rejects.toMatchObject({
      cause: { code: "23503", constraint_name: "user_org_id_organizations_id_fk" },
    });
    await expect(IamService.getOrganizationById(org.id)).resolves.toBeDefined();
  });

  it("创建用户先持有 KEY SHARE 时，组织删除等待后返回 ORG_HAS_USERS", async () => {
    const org = await IamService.createOrganization({ name: "CreateWins" });
    const locked = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const creating = db.transaction(async (tx) => {
      await tx.select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, org.id))
        .for("key share");
      locked.resolve();
      await release.promise;
      await tx.insert(user).values({ id: "u-concurrent", name: "U", email: "concurrent@test.com", orgId: org.id });
    });

    await locked.promise;
    const deleting = IamService.deleteOrganization(org.id);
    await waitForBlockedQuery("for update");
    release.resolve();
    await creating;
    await expect(deleting).rejects.toMatchObject({ code: "ORG_HAS_USERS" });
  });

  it("组织删除先持有 UPDATE 锁时，创建用户等待后返回 ORG_NOT_FOUND", async () => {
    const org = await IamService.createOrganization({ name: "DeleteWins" });
    const locked = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const deleting = db.transaction(async (tx) => {
      await tx.select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, org.id))
        .for("update");
      locked.resolve();
      await release.promise;
      await tx.delete(organizations).where(eq(organizations.id, org.id));
    });

    await locked.promise;
    const creating = IamService.createUser(org.id, {
      email: "delete-wins@test.com",
      password: "password-123",
      name: "DeleteWins",
      orgId: org.id,
    });
    await waitForBlockedQuery("for key share");
    release.resolve();
    await deleting;
    await expect(creating).rejects.toMatchObject({ code: "ORG_NOT_FOUND" });
  });
});
