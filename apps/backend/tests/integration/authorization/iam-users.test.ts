import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { auth } from "@/core/auth/index.js";
import { syncAuthorizationCatalog } from "@/core/authorization/index.js";
import { AppError } from "@/core/errors/app-error.js";
import { db } from "@/db/client.js";
import { account, organizations, session, user } from "@/db/schema/index.js";
import { IamService } from "@/features/iam/service.js";
import { allPermissions } from "@/permissions-catalog.js";
import { resetDb } from "../../helpers/db.js";

/**
 * iam 用户管理集成测试:真实 PG 验证代创建/改资料/重置密码/禁用·启用语义。
 * 登录侧用 auth.api.signInEmail 触发 databaseHooks.session.create.before。
 */

beforeEach(async () => {
  await resetDb();
  await syncAuthorizationCatalog(allPermissions);
  await db.insert(organizations).values({ id: "org-root", name: "Root" });
  await db.insert(organizations).values({ id: "org-other", name: "Other" });
  await db.insert(organizations).values({ id: "org-child", name: "Child", parentId: "org-root" });
  // 操作者(管理员身份)在 org-root;不经 createUser,避免测自身路径。
  await db.insert(user).values({
    id: "actor-1",
    name: "Actor",
    email: "actor@example.com",
    orgId: "org-root",
  });
});

describe("iam user management", () => {
  it("createUser 成功后 user 与 credential account 原子存在(事务)", async () => {
    const created = await IamService.createUser("org-root", {
      email: "tx@example.com",
      password: "password-123",
      name: "Tx",
      orgId: "org-root",
    });
    const [acc] = await db.select({ id: account.id }).from(account).where(eq(account.userId, created.id));
    expect(acc).toBeDefined();
  });

  it("createUser 目标 org 在子树内成功(子组织),listUsers 子树含之", async () => {
    const created = await IamService.createUser("org-root", {
      email: "child@example.com",
      password: "password-123",
      name: "Child",
      orgId: "org-child",
    });
    expect(created.orgId).toBe("org-child");

    const list = await IamService.listUsers("org-root");
    expect(list.some(u => u.id === created.id)).toBe(true);
    expect(list.some(u => u.id === "actor-1")).toBe(true);
  });

  it("createUser 目标 org 在子树外 -> 404(不暴露)", async () => {
    await expect(
      IamService.createUser("org-root", {
        email: "outside@example.com",
        password: "password-123",
        name: "Outside",
        orgId: "org-other",
      }),
    ).rejects.toMatchObject({ code: "COMMON_NOT_FOUND" });
  });

  it("createUser 目标 org 不存在 -> 404", async () => {
    await expect(
      IamService.createUser("org-root", {
        email: "ghost@example.com",
        password: "password-123",
        name: "Ghost",
        orgId: "org-nope",
      }),
    ).rejects.toMatchObject({ code: "COMMON_NOT_FOUND" });
  });

  it("updateUser 对子树内子组织用户成功;子树外操作者 404", async () => {
    const created = await IamService.createUser("org-root", {
      email: "sub@example.com",
      password: "password-123",
      name: "Sub",
      orgId: "org-child",
    });
    const updated = await IamService.updateUser("org-root", created.id, { name: "Sub2" });
    expect(updated.name).toBe("Sub2");

    await expect(
      IamService.updateUser("org-other", created.id, { name: "X" }),
    ).rejects.toMatchObject({ code: "COMMON_NOT_FOUND" });
  });

  it("createUser 成功并出现在 listUsers(含 disabled)", async () => {
    const created = await IamService.createUser("org-root", {
      email: "new@example.com",
      password: "password-123",
      name: "New",
      orgId: "org-root",
    });

    expect(created.email).toBe("new@example.com");
    expect(created.orgId).toBe("org-root");
    expect(created.disabled == null || created.disabled === false).toBe(true);

    const list = await IamService.listUsers("org-root");
    expect(list.some(u => u.id === created.id)).toBe(true);
    expect(list.find(u => u.id === created.id)?.disabled == null || list.find(u => u.id === created.id)?.disabled === false).toBe(true);
  });

  it("createUser 同 email 返回 409", async () => {
    await IamService.createUser("org-root", {
      email: "dup@example.com",
      password: "password-123",
      name: "A",
      orgId: "org-root",
    });

    await expect(
      IamService.createUser("org-root", {
        email: "dup@example.com",
        password: "password-456",
        name: "B",
        orgId: "org-root",
      }),
    ).rejects.toMatchObject({ code: "COMMON_CONFLICT" });
  });

  it("updateUser 改 name;跨组织 404", async () => {
    const created = await IamService.createUser("org-root", {
      email: "edit@example.com",
      password: "password-123",
      name: "Before",
      orgId: "org-root",
    });

    const updated = await IamService.updateUser("org-root", created.id, { name: "After" });
    expect(updated.name).toBe("After");

    await expect(
      IamService.updateUser("org-other", created.id, { name: "X" }),
    ).rejects.toMatchObject({ code: "COMMON_NOT_FOUND" });
  });

  it("resetPassword 后旧密码 sign-in 失败、新密码成功;session 被清", async () => {
    const created = await IamService.createUser("org-root", {
      email: "pwd@example.com",
      password: "old-password-123",
      name: "Pwd",
      orgId: "org-root",
    });

    // 先用旧密码登录造 session
    await auth.api.signInEmail({
      body: { email: "pwd@example.com", password: "old-password-123" },
    });
    const sessionsBefore = await db.select().from(session).where(eq(session.userId, created.id));
    expect(sessionsBefore.length).toBeGreaterThan(0);

    await IamService.resetPassword("org-root", created.id, "new-password-123");

    const sessionsAfter = await db.select().from(session).where(eq(session.userId, created.id));
    expect(sessionsAfter).toHaveLength(0);

    await expect(
      auth.api.signInEmail({
        body: { email: "pwd@example.com", password: "old-password-123" },
      }),
    ).rejects.toBeTruthy();

    const signed = await auth.api.signInEmail({
      body: { email: "pwd@example.com", password: "new-password-123" },
    });
    expect(signed.user.email).toBe("pwd@example.com");
  });

  it("disableUser 后 databaseHooks 阻止登录;enable 后可再登录", async () => {
    const created = await IamService.createUser("org-root", {
      email: "ban@example.com",
      password: "password-123",
      name: "Ban",
      orgId: "org-root",
    });

    // 先登录造 session,再禁用应清 session
    await auth.api.signInEmail({
      body: { email: "ban@example.com", password: "password-123" },
    });

    const disabled = await IamService.disableUser("org-root", "actor-1", created.id);
    expect(disabled.disabled).toBe(true);
    const sessions = await db.select().from(session).where(eq(session.userId, created.id));
    expect(sessions).toHaveLength(0);

    await expect(
      auth.api.signInEmail({
        body: { email: "ban@example.com", password: "password-123" },
      }),
    ).rejects.toMatchObject({ statusCode: 403 });

    const enabled = await IamService.enableUser("org-root", created.id);
    expect(enabled.disabled).toBe(false);

    const signed = await auth.api.signInEmail({
      body: { email: "ban@example.com", password: "password-123" },
    });
    expect(signed.user.email).toBe("ban@example.com");
  });

  it("disableUser 禁止禁用自己 → 403", async () => {
    await expect(
      IamService.disableUser("org-root", "actor-1", "actor-1"),
    ).rejects.toBeInstanceOf(AppError);

    await expect(
      IamService.disableUser("org-root", "actor-1", "actor-1"),
    ).rejects.toMatchObject({ code: "COMMON_FORBIDDEN" });
  });
});
