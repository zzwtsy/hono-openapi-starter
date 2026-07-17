import { beforeEach, describe, expect, it } from "vitest";

import { syncAuthorizationCatalog } from "@/core/authorization/index.js";
import { db } from "@/db/client.js";
import { user } from "@/db/schema/auth-schema.js";
import { IamService } from "@/features/iam/service.js";
import { allPermissions } from "@/permissions-catalog.js";
import { resetDb } from "../../helpers/db.js";

/**
 * iam 组织管理集成测试:真实 PG(testcontainers)验证组织树 CRUD + 防环 + 删除约束。
 */

beforeEach(async () => {
  await resetDb();
  await syncAuthorizationCatalog(allPermissions);
});

describe("iam organization management", () => {
  it("建根组织和子组织", async () => {
    const root = await IamService.createOrganization({ name: "Root" });
    const south = await IamService.createOrganization({ name: "South", parentId: root.id });

    expect(root.parentId).toBeNull();
    expect(south.parentId).toBe(root.id);
  });

  it("建组织到不存在父组织抛错", async () => {
    await expect(IamService.createOrganization({ name: "X", parentId: "org-nope" })).rejects.toThrow();
  });

  it("改 parent 形成环抛错(挂到自身子孙下)", async () => {
    const root = await IamService.createOrganization({ name: "Root" });
    const south = await IamService.createOrganization({ name: "South", parentId: root.id });
    // 把 root 挂到 south 下:root 是 south 的祖先,会成环
    await expect(IamService.updateOrganization(root.id, { parentId: south.id })).rejects.toThrow();
  });

  it("改 parent 到自身抛错", async () => {
    const root = await IamService.createOrganization({ name: "Root" });
    await expect(IamService.updateOrganization(root.id, { parentId: root.id })).rejects.toThrow();
  });

  it("改 parent 到合法新父成功", async () => {
    const root = await IamService.createOrganization({ name: "Root" });
    const south = await IamService.createOrganization({ name: "South", parentId: root.id });
    const fujian = await IamService.createOrganization({ name: "Fujian", parentId: root.id });
    // fujian 从 root 挂到 south(合法:south 不是 fujian 的子孙)
    const updated = await IamService.updateOrganization(fujian.id, { parentId: south.id });
    expect(updated.parentId).toBe(south.id);
  });

  it("删有子组织的根抛错", async () => {
    const root = await IamService.createOrganization({ name: "Root" });
    await IamService.createOrganization({ name: "South", parentId: root.id });
    await expect(IamService.deleteOrganization(root.id)).rejects.toThrow();
  });

  it("删叶子组织成功,父组织仍在", async () => {
    const root = await IamService.createOrganization({ name: "Root" });
    const south = await IamService.createOrganization({ name: "South", parentId: root.id });
    await IamService.deleteOrganization(south.id);

    const rootDetail = await IamService.getOrganizationById(root.id);
    expect(rootDetail.id).toBe(root.id);
  });

  it("删不存在组织抛 NOT_FOUND", async () => {
    await expect(IamService.deleteOrganization("org-nope")).rejects.toThrow();
  });

  it("删有用户的组织 -> 409(防孤儿用户)", async () => {
    const org = await IamService.createOrganization({ name: "WithUsers" });
    // 直插用户(orgId=org),绕过 createUser
    await db.insert(user).values({ id: "u-orphan-test", name: "U", email: "orphan@test.com", orgId: org.id });
    await expect(IamService.deleteOrganization(org.id)).rejects.toMatchObject({
      code: "COMMON_CONFLICT",
      message: "组织下仍有用户,请先迁移或禁用用户",
    });
  });
});
