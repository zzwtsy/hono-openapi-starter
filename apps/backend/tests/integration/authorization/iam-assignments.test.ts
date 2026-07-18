import { beforeEach, describe, expect, it } from "vitest";

import { syncAuthorizationCatalog } from "@/core/authorization/index.js";
import { setPermissionChecker } from "@/core/authorization/permission-checker.js";
import { db } from "@/db/client.js";
import { user } from "@/db/schema/auth-schema.js";
import { organizations, userPermissions, userRoles } from "@/db/schema/authorization-schema.js";
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
  // 装配 PermissionChecker holder:listUserEffectivePermissions 正常路径经
  // PermissionService.listEffectivePermissions -> requireChecker(),未装配会抛"未装配"。
  setPermissionChecker(checker);
});

async function setup() {
  await db.insert(organizations).values([
    { id: "org-root", name: "Root" },
    { id: "org-south", name: "South", parentId: "org-root" },
    { id: "org-other", name: "Other" },
  ]);
  await db.insert(user).values([
    { id: "u-1", name: "U1", email: "u1@x.com", orgId: "org-root" },
    { id: "u-2", name: "U2", email: "u2@x.com", orgId: "org-other" },
    // 操作者(actor-1,org-root 管理员):deleteUserRole/deleteUserPermission 的 actorUserId 入参
    { id: "actor-1", name: "Actor", email: "actor@x.com", orgId: "org-root" },
  ]);
}

describe("iam user assignments", () => {
  it("授角色后 checkPermission 通过", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-root" });

    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(true);
  });

  it("直接 allow 后 checkPermission 通过", async () => {
    await setup();
    await IamService.assignUserPermission("org-root", "u-1", "iam.read", { orgId: "org-root", effect: "allow" });

    expect(await checker.check("u-1", "iam.read", "org-root")).toBe(true);
  });

  it("deny 覆盖角色权限", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-root" });
    await IamService.assignUserPermission("org-root", "u-1", "projects.read", { orgId: "org-root", effect: "deny" });

    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(false);
  });

  it("祖先继承:在 root 授角色,south 检查通过", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-root" });

    expect(await checker.check("u-1", "projects.read", "org-south")).toBe(true);
  });

  it("过期授权失效", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-root", expiresAt: "2020-01-01T00:00:00Z" });

    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(false);
  });

  it("撤角色后 checkPermission 失败", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-root" });
    await IamService.deleteUserRole("org-root", "actor-1", "u-1", role.id, "org-root");

    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(false);
  });

  it("授角色到不存在的角色抛 NOT_FOUND", async () => {
    await setup();
    await expect(IamService.assignUserRole("org-root", "u-1", "role-nope", { orgId: "org-root" })).rejects.toMatchObject({ code: "COMMON_NOT_FOUND" });
  });

  it("授角色到不存在的组织抛 NOT_FOUND", async () => {
    await setup();
    await expect(IamService.assignUserRole("org-root", "u-1", "role-admin", { orgId: "org-nope" })).rejects.toMatchObject({ code: "COMMON_NOT_FOUND" });
  });

  it("撤不存在的授权抛 NOT_FOUND", async () => {
    await setup();
    await expect(IamService.deleteUserRole("org-root", "actor-1", "u-1", "role-admin", "org-root")).rejects.toMatchObject({ code: "COMMON_NOT_FOUND" });
  });

  it("授角色到子树外 grant.orgId -> 404(不暴露)", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await expect(
      IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-other" }),
    ).rejects.toMatchObject({ code: "COMMON_NOT_FOUND" });
  });

  it("授角色给子树外 user -> 404(不暴露)", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await expect(
      IamService.assignUserRole("org-root", "u-2", role.id, { orgId: "org-root" }),
    ).rejects.toMatchObject({ code: "COMMON_NOT_FOUND" });
  });

  it("重复授角色更新 expiresAt(续期)", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-root", expiresAt: "2020-01-01T00:00:00Z" });
    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(false);
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-root", expiresAt: "2099-01-01T00:00:00Z" });
    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(true);
  });

  it("重复授角色省略 expiresAt 保留原过期时间(不清空)", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    // 先授 2020(已过期)
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-root", expiresAt: "2020-01-01T00:00:00Z" });
    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(false);
    // 重授省略 expiresAt:原 2020 过期保留,仍失效(未被清空为永久)
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-root" });
    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(false);
    // 提供新 expiresAt 续期到 2099 -> 生效
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-root", expiresAt: "2099-01-01T00:00:00Z" });
    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(true);
  });

  it("重复授直接权限省略 expiresAt 保留原过期,effect 仍更新", async () => {
    await setup();
    // 先授 allow + 2020(已过期)
    await IamService.assignUserPermission("org-root", "u-1", "projects.read", { orgId: "org-root", effect: "allow", expiresAt: "2020-01-01T00:00:00Z" });
    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(false);
    // 重授 deny 省略 expiresAt:effect 变 deny,expiresAt 保留 2020(过期)
    await IamService.assignUserPermission("org-root", "u-1", "projects.read", { orgId: "org-root", effect: "deny" });
    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(false);
    // 续期到 2099(effect 仍 deny,保留):deny 拒绝
    await IamService.assignUserPermission("org-root", "u-1", "projects.read", { orgId: "org-root", effect: "deny", expiresAt: "2099-01-01T00:00:00Z" });
    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(false);
    // 切回 allow + 2099:通过
    await IamService.assignUserPermission("org-root", "u-1", "projects.read", { orgId: "org-root", effect: "allow", expiresAt: "2099-01-01T00:00:00Z" });
    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(true);
  });

  it("重复授直接权限更新 effect(allow->deny)", async () => {
    await setup();
    await IamService.assignUserPermission("org-root", "u-1", "projects.read", { orgId: "org-root", effect: "allow" });
    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(true);
    await IamService.assignUserPermission("org-root", "u-1", "projects.read", { orgId: "org-root", effect: "deny" });
    expect(await checker.check("u-1", "projects.read", "org-root")).toBe(false);
  });

  it("撤子树外 grant -> 404", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-root" });
    await expect(
      IamService.deleteUserRole("org-root", "actor-1", "u-1", role.id, "org-other"),
    ).rejects.toMatchObject({ code: "COMMON_NOT_FOUND" });
  });

  it("子树外 user 与非存在 user 的 404 message 一致(不暴露存在性)", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    // 子树外 user(u-2 home=org-other)
    const foreign = IamService.assignUserRole("org-root", "u-2", role.id, { orgId: "org-root" });
    await expect(foreign).rejects.toMatchObject({ code: "COMMON_NOT_FOUND", message: "用户不存在" });
    // 非存在 user
    const ghost = IamService.assignUserRole("org-root", "u-nope", role.id, { orgId: "org-root" });
    await expect(ghost).rejects.toMatchObject({ code: "COMMON_NOT_FOUND", message: "用户不存在" });
  });

  it("撤子树内 grant.orgId 但子树外 user -> 404(与 assign 对称)", async () => {
    await setup();
    // u-2 home=org-other(子树外);先由上级在 org-root(子树内)授 grant
    // 模拟:直接插一条 u-2 在 org-root 的 user_roles(绕过 assign 的 user 校验)
    const role = await IamService.createRole({ name: "viewer" });
    await db.insert(userRoles).values({ userId: "u-2", roleId: role.id, orgId: "org-root" });
    // actor(org-root 子树)撤该 grant:grant.orgId=org-root 在子树,但 user u-2 子树外 -> 现 404
    await expect(
      IamService.deleteUserRole("org-root", "actor-1", "u-2", role.id, "org-root"),
    ).rejects.toMatchObject({ code: "COMMON_NOT_FOUND", message: "用户不存在" });
  });

  it("撤直接权限:子树内 grant.orgId 但子树外 user -> 404", async () => {
    await setup();
    await db.insert(userPermissions).values({ userId: "u-2", permission: "projects.read", orgId: "org-root", effect: "allow" });
    await expect(
      IamService.deleteUserPermission("org-root", "actor-1", "u-2", "projects.read", "org-root"),
    ).rejects.toMatchObject({ code: "COMMON_NOT_FOUND", message: "用户不存在" });
  });

  it("查子树外 user 的有效权限 -> 404(不暴露)", async () => {
    await setup();
    await expect(
      IamService.listUserEffectivePermissions("org-root", "u-2", "org-root"),
    ).rejects.toMatchObject({ code: "COMMON_NOT_FOUND" });
  });

  it("查子树内 user 但 orgId 在子树外 -> 404", async () => {
    await setup();
    await expect(
      IamService.listUserRoles("org-root", "u-1", "org-other"),
    ).rejects.toMatchObject({ code: "COMMON_NOT_FOUND" });
  });

  it("查子树内 user + 子树内 orgId -> 返回(正常)", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-root" });
    const roles = await IamService.listUserRoles("org-root", "u-1", "org-root");
    expect(roles.some(r => r.roleId === role.id)).toBe(true);
  });

  // listUserEffectivePermissions 之前只测 subtree-out user(requireUserInSubtree 路径),
  // 补 subtree-in user + subtree-out orgId 用例,覆盖 assertOrgInSubtree 路径。
  it("listUserEffectivePermissions:子树内 user + 子树外 orgId -> 404", async () => {
    await setup();
    await expect(
      IamService.listUserEffectivePermissions("org-root", "u-1", "org-other"),
    ).rejects.toMatchObject({ code: "COMMON_NOT_FOUND" });
  });

  // 以下三个用例故意用 actorOrgId(org-root) != query orgId(org-south),
  // 使 (actorOrgId, userId, orgId) 参数调换可被检出:调换后 requireUserInSubtree(org-south, u-1)
  // 因 u-1 home=org-root 不在 org-south 子树 -> 404,与期望返回不符,测试失败。
  it("listUserRoles:子树内不同 orgId(org-south) -> 返回该 org 授权(actorOrgId != query orgId)", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-south" });
    const roles = await IamService.listUserRoles("org-root", "u-1", "org-south");
    expect(roles.some(r => r.roleId === role.id && r.orgId === "org-south")).toBe(true);
  });

  it("listUserDirectPermissions:子树外 orgId -> 404;子树内不同 orgId(org-south) -> 返回直接授权", async () => {
    await setup();
    await expect(
      IamService.listUserDirectPermissions("org-root", "u-1", "org-other"),
    ).rejects.toMatchObject({ code: "COMMON_NOT_FOUND" });

    await IamService.assignUserPermission("org-root", "u-1", "projects.read", { orgId: "org-south", effect: "allow" });
    const perms = await IamService.listUserDirectPermissions("org-root", "u-1", "org-south");
    expect(perms.some(p => p.permission === "projects.read" && p.orgId === "org-south" && p.effect === "allow")).toBe(true);
  });

  it("listUserEffectivePermissions:子树内不同 orgId(org-south) -> 返回有效权限(走 PermissionService holder)", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    await IamService.assignUserRole("org-root", "u-1", role.id, { orgId: "org-south" });
    const perms = await IamService.listUserEffectivePermissions("org-root", "u-1", "org-south");
    expect(perms).toContain("projects.read");
  });

  // 防自我锁死:撤销自己的授权 -> 403(对齐 disableUser)。actor-1 撤 actor-1 自己。
  it("撤自己的角色 -> 403(防自我锁死)", async () => {
    await setup();
    const role = await IamService.createRole({ name: "viewer" });
    await IamService.assignRolePermissions(role.id, ["projects.read"]);
    await IamService.assignUserRole("org-root", "actor-1", role.id, { orgId: "org-root" });
    await expect(
      IamService.deleteUserRole("org-root", "actor-1", "actor-1", role.id, "org-root"),
    ).rejects.toMatchObject({ code: "COMMON_FORBIDDEN", message: "不能撤销自己的授权" });
  });

  it("撤自己的直接权限 -> 403(防自我锁死)", async () => {
    await setup();
    await IamService.assignUserPermission("org-root", "actor-1", "projects.read", { orgId: "org-root", effect: "allow" });
    await expect(
      IamService.deleteUserPermission("org-root", "actor-1", "actor-1", "projects.read", "org-root"),
    ).rejects.toMatchObject({ code: "COMMON_FORBIDDEN", message: "不能撤销自己的授权" });
  });
});
