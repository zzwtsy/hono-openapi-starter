import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { syncAuthorizationCatalog } from "@/core/authorization/index.js";
import { AppError } from "@/core/errors/app-error.js";
import { db } from "@/db/client.js";
import { projects } from "@/db/schema/index.js";
import { IamService } from "@/features/iam/service.js";
import { ProjectService } from "@/features/projects/service.js";
import { allPermissions } from "@/permissions-catalog.js";
import { resetDb } from "../../helpers/db.js";

/**
 * projects 写操作集成测试:真实 PG(testcontainers)验证 create/update/remove 全语义
 * + 同组织重名软校验 + 跨组织归属隔离 + updatedAt 自动刷新 + list orgId scope。
 *
 * 组织用 IamService.createOrganization 建(已验证 API),projects 直接走 ProjectService。
 */

beforeEach(async () => {
  await resetDb();
  await syncAuthorizationCatalog(allPermissions);
});

/** 断言 promise 以指定 code 的 AppError reject(instanceof + 属性访问,不依赖可枚举性)。 */
async function expectAppError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toBeInstanceOf(AppError);
  await expect(promise).rejects.toHaveProperty("code", code);
}

describe("projects write operations", () => {
  it("创建项目并按 orgId 落库", async () => {
    const org = await IamService.createOrganization({ name: "org-a" });
    const project = await ProjectService.create(org.id, { name: "官网改版", description: "desc" });

    expect(project.id).toBeDefined();
    expect(project.name).toBe("官网改版");
    expect(project.orgId).toBe(org.id);
    expect(project.description).toBe("desc");

    const [row] = await db.select().from(projects).where(eq(projects.id, project.id));
    expect(row?.orgId).toBe(org.id);
  });

  it("同组织内重名抛 PROJECT_NAME_CONFLICT", async () => {
    const org = await IamService.createOrganization({ name: "org-a" });
    await ProjectService.create(org.id, { name: "同名" });

    await expectAppError(ProjectService.create(org.id, { name: "同名" }), "PROJECT_NAME_CONFLICT");
  });

  it("不同组织允许同名", async () => {
    const orgA = await IamService.createOrganization({ name: "org-a" });
    const orgB = await IamService.createOrganization({ name: "org-b" });

    const p1 = await ProjectService.create(orgA.id, { name: "同名" });
    const p2 = await ProjectService.create(orgB.id, { name: "同名" });
    expect(p1.id).not.toBe(p2.id);
  });

  it("修改项目名称与描述(description 传 null 清空)", async () => {
    const org = await IamService.createOrganization({ name: "org-a" });
    const project = await ProjectService.create(org.id, { name: "p1", description: "desc" });

    const updated = await ProjectService.update(project.id, org.id, { name: "p1-renamed", description: null });
    expect(updated.name).toBe("p1-renamed");
    expect(updated.description).toBeNull();
  });

  it("空 body update 原样返回不抛错", async () => {
    const org = await IamService.createOrganization({ name: "org-a" });
    const project = await ProjectService.create(org.id, { name: "p1" });

    const updated = await ProjectService.update(project.id, org.id, {});
    expect(updated.name).toBe("p1");
  });

  it("修改时同组织改名重名抛 PROJECT_NAME_CONFLICT", async () => {
    const org = await IamService.createOrganization({ name: "org-a" });
    await ProjectService.create(org.id, { name: "p1" });
    const target = await ProjectService.create(org.id, { name: "p2" });

    await expectAppError(ProjectService.update(target.id, org.id, { name: "p1" }), "PROJECT_NAME_CONFLICT");
  });

  it("跨组织修改别人的项目抛 PROJECT_NOT_FOUND(归属隔离)", async () => {
    const orgA = await IamService.createOrganization({ name: "org-a" });
    const orgB = await IamService.createOrganization({ name: "org-b" });
    const project = await ProjectService.create(orgA.id, { name: "p1" });

    await expectAppError(ProjectService.update(project.id, orgB.id, { name: "x" }), "PROJECT_NOT_FOUND");
  });

  it("updatedAt 在 update 后自动刷新", async () => {
    const org = await IamService.createOrganization({ name: "org-a" });
    const project = await ProjectService.create(org.id, { name: "p1" });
    const before = project.updatedAt;

    // $onUpdate 用 new Date() 设值,等待确保时间戳前进,避免同毫秒比较假通过
    await new Promise(resolve => setTimeout(resolve, 10));
    const updated = await ProjectService.update(project.id, org.id, { name: "p1-new" });

    expect(updated.updatedAt.getTime()).toBeGreaterThan(before.getTime());
  });

  it("删除项目后查询不到", async () => {
    const org = await IamService.createOrganization({ name: "org-a" });
    const project = await ProjectService.create(org.id, { name: "p1" });

    await ProjectService.remove(project.id, org.id);

    const [row] = await db.select().from(projects).where(eq(projects.id, project.id));
    expect(row).toBeUndefined();
  });

  it("跨组织删除别人的项目抛 PROJECT_NOT_FOUND 且未删除", async () => {
    const orgA = await IamService.createOrganization({ name: "org-a" });
    const orgB = await IamService.createOrganization({ name: "org-b" });
    const project = await ProjectService.create(orgA.id, { name: "p1" });

    await expectAppError(ProjectService.remove(project.id, orgB.id), "PROJECT_NOT_FOUND");

    const [row] = await db.select().from(projects).where(eq(projects.id, project.id));
    expect(row).toBeDefined();
  });

  it("list 按 orgId scope 只返回本组织项目", async () => {
    const orgA = await IamService.createOrganization({ name: "org-a" });
    const orgB = await IamService.createOrganization({ name: "org-b" });
    await ProjectService.create(orgA.id, { name: "a1" });
    await ProjectService.create(orgA.id, { name: "a2" });
    await ProjectService.create(orgB.id, { name: "b1" });

    const listA = await ProjectService.list(orgA.id);
    expect(listA).toHaveLength(2);
    expect(listA.every(p => p.orgId === orgA.id)).toBe(true);
  });
});
