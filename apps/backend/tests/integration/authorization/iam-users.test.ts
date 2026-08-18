import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { allPermissions } from "@/catalogs/permissions.js";
import { auth } from "@/core/auth/index.js";
import { syncAuthorizationCatalog } from "@/core/authorization/index.js";
import { setPermissionChecker } from "@/core/authorization/permission-checker.js";
import { AppError } from "@/core/errors/app-error.js";
import { db } from "@/db/client.js";
import { account, organizations, session, user, userPermissions, userRoles } from "@/db/schema/index.js";
import { IamPermissionChecker } from "@/features/iam/permission-checker.js";
import { IamService as CurrentIamService } from "@/features/iam/service.js";
import { resetDb } from "../../helpers/db.js";

/**
 * iam 用户管理集成测试:真实 PG 验证代创建/改资料/重置密码/禁用·启用语义。
 * 登录侧用 auth.api.signInEmail 触发 databaseHooks.session.create.before。
 */

const actor = (orgId: string, id = orgId === "org-other" ? "actor-other" : "actor-1") => ({ id, orgId });
const IamService = {
  ...CurrentIamService,
  createUser: async (orgId: string, input: Parameters<typeof CurrentIamService.createUser>[1]) => CurrentIamService.createUser(actor(orgId), input),
  updateUser: async (orgId: string, userId: string, input: Parameters<typeof CurrentIamService.updateUser>[2]) => CurrentIamService.updateUser(actor(orgId), userId, input),
  resetPassword: async (orgId: string, userId: string, password: string) => CurrentIamService.resetPassword(actor(orgId), userId, password),
  disableUser: async (orgId: string, actorUserId: string, userId: string) => CurrentIamService.disableUser(actor(orgId, actorUserId), userId),
  enableUser: async (orgId: string, userId: string) => CurrentIamService.enableUser(actor(orgId), userId),
  transferUserOrganization: async (orgId: string, actorUserId: string, userId: string, newOrgId: string, clearAllGrants?: boolean) => CurrentIamService.transferUserOrganization(actor(orgId, actorUserId), userId, newOrgId, clearAllGrants),
  listUserEffectivePermissions: async (orgId: string, userId: string, targetOrgId: string) => CurrentIamService.listUserEffectivePermissions(actor(orgId), userId, targetOrgId),
};

beforeEach(async () => {
  await resetDb();
  await syncAuthorizationCatalog(allPermissions);
  await db.insert(organizations).values({ id: "org-system", name: "System Root" });
  await db.insert(organizations).values({ id: "org-root", name: "Root", parentId: "org-system" });
  await db.insert(organizations).values({ id: "org-other", name: "Other", parentId: "org-system" });
  await db.insert(organizations).values({ id: "org-child", name: "Child", parentId: "org-root" });
  // 操作者(管理员身份)在 org-root;不经 createUser,避免测自身路径。
  await db.insert(user).values({
    id: "actor-1",
    name: "Actor",
    email: "actor@example.com",
    orgId: "org-root",
  });
  await db.insert(user).values({ id: "actor-other", name: "Other Actor", email: "other-actor@example.com", orgId: "org-other" });
  await db.insert(userRoles).values([
    { userId: "actor-1", roleId: "role-admin", orgId: "org-root" },
    { userId: "actor-other", roleId: "role-admin", orgId: "org-other" },
  ]);
  setPermissionChecker(new IamPermissionChecker());
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

  it("createUser 同邮箱 -> 409(事务内 onConflict 兜底),且不留孤儿 user", async () => {
    await IamService.createUser("org-root", {
      email: "dup@example.com",
      password: "password-123",
      name: "First",
      orgId: "org-root",
    });
    // 第二次同邮箱:事务内 onConflictDoNothing(target=email) -> returning 空 -> 抛 USER_EMAIL_ALREADY_EXISTS(409),
    // 非 DB 唯一约束裸错误(500)。验证并发 TOCTOU 修复后的错误码契约。
    await expect(
      IamService.createUser("org-root", {
        email: "dup@example.com",
        password: "password-123",
        name: "Second",
        orgId: "org-root",
      }),
    ).rejects.toMatchObject({ code: "USER_EMAIL_ALREADY_EXISTS" });
    // 冲突时 user 不应插入(无孤儿),user 表仍只有 First。
    const rows = await db.select({ name: user.name }).from(user).where(eq(user.email, "dup@example.com"));
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("First");
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

  it("home 有权限但目标组织显式 deny 时按目标 PEP 返回 403", async () => {
    const created = await IamService.createUser("org-root", {
      email: "target-deny@example.com",
      password: "password-123",
      name: "Target Deny",
      orgId: "org-child",
    });
    await db.insert(userPermissions).values({
      userId: "actor-1",
      permissionCode: "users.disable",
      orgId: "org-child",
      effect: "deny",
    });

    await expect(IamService.disableUser("org-root", "actor-1", created.id))
      .rejects
      .toMatchObject({ code: "COMMON_FORBIDDEN" });
  });

  it("createUser 目标 org 在子树外 -> 404(不暴露)", async () => {
    await expect(
      IamService.createUser("org-root", {
        email: "outside@example.com",
        password: "password-123",
        name: "Outside",
        orgId: "org-other",
      }),
    ).rejects.toMatchObject({ code: "ORG_NOT_FOUND" });
  });

  it("createUser 目标 org 不存在 -> 404", async () => {
    await expect(
      IamService.createUser("org-root", {
        email: "ghost@example.com",
        password: "password-123",
        name: "Ghost",
        orgId: "org-nope",
      }),
    ).rejects.toMatchObject({ code: "ORG_NOT_FOUND" });
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
    ).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
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
    ).rejects.toMatchObject({ code: "USER_EMAIL_ALREADY_EXISTS" });
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
    ).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });

  it("resetPassword 后旧密码 sign-in 失败、新密码成功;session 被清", async () => {
    const created = await IamService.createUser("org-root", {
      email: "pwd@example.com",
      password: "old-password-123",
      name: "Pwd",
      orgId: "org-root",
    });

    // 先用旧密码登录造 session,从 DB 拿 token 证明旧 session 失效
    await auth.api.signInEmail({
      body: { email: "pwd@example.com", password: "old-password-123" },
    });
    const [sessionRow] = await db.select().from(session).where(eq(session.userId, created.id));
    const oldToken = sessionRow.token;
    const sessionsBefore = await db.select().from(session).where(eq(session.userId, created.id));
    expect(sessionsBefore.length).toBeGreaterThan(0);

    await IamService.resetPassword("org-root", created.id, "new-password-123");

    const sessionsAfter = await db.select().from(session).where(eq(session.userId, created.id));
    expect(sessionsAfter).toHaveLength(0);

    // 密码重置成功后，已有 session token 必须立即失效。
    const staleSession = await auth.api.getSession({
      headers: { authorization: `Bearer ${oldToken}` },
    });
    expect(staleSession).toBeNull();

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

    // 先登录造 session,从 DB 拿 token 用于证明旧 session 失效
    await auth.api.signInEmail({
      body: { email: "ban@example.com", password: "password-123" },
    });
    const [sessionRow] = await db.select().from(session).where(eq(session.userId, created.id));
    const oldToken = sessionRow.token;

    const disabled = await IamService.disableUser("org-root", "actor-1", created.id);
    expect(disabled.disabled).toBe(true);
    const sessions = await db.select().from(session).where(eq(session.userId, created.id));
    expect(sessions).toHaveLength(0);

    // 旧 session token 立即失效:getSession 查不到行返回 null(未开 cookieCache,删行即失效)。
    // 禁用用户后，已有 session token 必须立即失效。
    const staleSession = await auth.api.getSession({
      headers: { authorization: `Bearer ${oldToken}` },
    });
    expect(staleSession).toBeNull();

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
    ).rejects.toMatchObject({ code: "USER_CANNOT_DISABLE_SELF" });
  });
});

describe("iam user transfer (调岗 + grant 清理)", () => {
  // 组织树:org-root(总部) -> org-south(华南) -> org-fujian(福建)
  //                           -> org-north(华北)
  // 福建->华北 调岗:共同祖先=org-root,福建独有={福建,华南},华北祖先={华北,org-root}
  // staleOrgIds = {福建,华南} - {华北,org-root} = {福建,华南}
  const checker = new IamPermissionChecker();
  beforeEach(async () => {
    // 装配 PermissionChecker:listUserEffectivePermissions 正常路径经 requireChecker(),未装配会抛"未装配"。
    setPermissionChecker(checker);
    await db.insert(organizations).values([
      { id: "org-south", name: "华南", parentId: "org-root" },
      { id: "org-fujian", name: "福建", parentId: "org-south" },
      { id: "org-north", name: "华北", parentId: "org-root" },
    ]);
  });

  /** 取 userId 的全部 user_roles.orgId 集合。 */
  async function getUserRoleOrgIds(userId: string): Promise<string[]> {
    const rows = await db.select({ orgId: userRoles.orgId }).from(userRoles).where(eq(userRoles.userId, userId));
    return rows.map(r => r.orgId).sort();
  }

  it("调岗成功:home 改为新 org;旧独有路径 grant 被清;共同祖先 grant 保留", async () => {
    const created = await IamService.createUser("org-root", {
      email: "transfer@example.com",
      password: "password-123",
      name: "Transfer",
      orgId: "org-fujian",
    });
    // 在三个节点授 admin 角色:福建(独有)、华南(独有)、org-root(共同祖先)
    await db.insert(userRoles).values([
      { userId: created.id, roleId: "role-admin", orgId: "org-fujian" },
      { userId: created.id, roleId: "role-admin", orgId: "org-south" },
      { userId: created.id, roleId: "role-admin", orgId: "org-root" },
    ]);

    const updated = await IamService.transferUserOrganization("org-root", "actor-1", created.id, "org-north");
    expect(updated.orgId).toBe("org-north");

    // 福建和华南被清(独有路径),org-root 保留(共同祖先)
    const remaining = await getUserRoleOrgIds(created.id);
    expect(remaining).toEqual(["org-root"]);
  });

  it("调岗后 listUserEffectivePermissions 基于新 home(旧独有 grant 不出现,共同祖先 grant 仍生效)", async () => {
    const created = await IamService.createUser("org-root", {
      email: "perm@example.com",
      password: "password-123",
      name: "Perm",
      orgId: "org-fujian",
    });
    // org-root 授 admin(含 users.read),调岗后 org-root 仍是新 home(org-north)的共同祖先
    await db.insert(userRoles).values({ userId: created.id, roleId: "role-admin", orgId: "org-root" });

    await IamService.transferUserOrganization("org-root", "actor-1", created.id, "org-north");

    // 新 home = org-north,祖先集={org-north, org-root},org-root 上的 admin 仍生效
    const result = await IamService.listUserEffectivePermissions("org-root", created.id, "org-north");
    const permNames = result.effective.map(p => p.permissionCode);
    expect(permNames).toContain("users.read");
  });

  it("目标 org 不在管理子树 -> 404", async () => {
    const created = await IamService.createUser("org-root", {
      email: "outside@example.com",
      password: "password-123",
      name: "Outside",
      orgId: "org-fujian",
    });
    // org-other 不在 org-root 子树(独立根)
    await expect(
      IamService.transferUserOrganization("org-root", "actor-1", created.id, "org-other"),
    ).rejects.toMatchObject({ code: "ORG_NOT_FOUND" });
  });

  it("用户不在操作者管理子树 -> 404", async () => {
    // 使用 org-other 子树的管理员作为操作者。
    const created = await IamService.createUser("org-root", {
      email: "victim@example.com",
      password: "password-123",
      name: "Victim",
      orgId: "org-fujian",
    });
    await expect(
      IamService.transferUserOrganization("org-other", "actor-other", created.id, "org-other"),
    ).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });

  it("newOrgId === oldOrgId -> 409", async () => {
    const created = await IamService.createUser("org-root", {
      email: "same@example.com",
      password: "password-123",
      name: "Same",
      orgId: "org-fujian",
    });
    await expect(
      IamService.transferUserOrganization("org-root", "actor-1", created.id, "org-fujian"),
    ).rejects.toMatchObject({ code: "ORG_SAME_AS_CURRENT" });
  });

  it("禁止调岗自己 -> 403", async () => {
    await expect(
      IamService.transferUserOrganization("org-root", "actor-1", "actor-1", "org-north"),
    ).rejects.toMatchObject({ code: "USER_CANNOT_TRANSFER_SELF" });
  });

  it("clearAllGrants=true -> 全部 grant 清空(含共同祖先)", async () => {
    const created = await IamService.createUser("org-root", {
      email: "clearall@example.com",
      password: "password-123",
      name: "ClearAll",
      orgId: "org-fujian",
    });
    await db.insert(userRoles).values([
      { userId: created.id, roleId: "role-admin", orgId: "org-fujian" },
      { userId: created.id, roleId: "role-admin", orgId: "org-root" },
    ]);
    await db.insert(userPermissions).values({
      userId: created.id,
      permissionCode: "users.read",
      orgId: "org-south",
      effect: "allow",
    });

    await IamService.transferUserOrganization("org-root", "actor-1", created.id, "org-north", true);

    const roles = await db.select().from(userRoles).where(eq(userRoles.userId, created.id));
    const perms = await db.select().from(userPermissions).where(eq(userPermissions.userId, created.id));
    expect(roles).toHaveLength(0);
    expect(perms).toHaveLength(0);
  });

  it("staleOrgIds 为空(调到子孙)不删任何 grant", async () => {
    const created = await IamService.createUser("org-root", {
      email: "descend@example.com",
      password: "password-123",
      name: "Descend",
      orgId: "org-south",
    });
    // org-south 上授 admin,调到 org-fujian(org-south 的子组织)
    // 旧祖先集={org-south, org-root},新祖先集={org-fujian, org-south, org-root}
    // staleOrgIds = {} (空),不删任何 grant
    await db.insert(userRoles).values({ userId: created.id, roleId: "role-admin", orgId: "org-south" });

    await IamService.transferUserOrganization("org-root", "actor-1", created.id, "org-fujian");

    const remaining = await getUserRoleOrgIds(created.id);
    expect(remaining).toEqual(["org-south"]);
  });

  it("调岗后用户 orgId 改变,仍在操作者子树内可见", async () => {
    const created = await IamService.createUser("org-root", {
      email: "move@example.com",
      password: "password-123",
      name: "Move",
      orgId: "org-fujian",
    });
    // org-fujian 和 org-north 都在 org-root 子树内,调岗后仍在子树内可见
    await IamService.transferUserOrganization("org-root", "actor-1", created.id, "org-north");

    const after = await IamService.listUsers("org-root");
    const moved = after.find(u => u.id === created.id);
    expect(moved).toBeDefined();
    expect(moved?.orgId).toBe("org-north");
  });
});
