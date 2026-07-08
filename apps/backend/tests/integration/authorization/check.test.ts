import { beforeEach, describe, expect, it } from "vitest";

import { checkPermission } from "../../../src/core/authorization/check.js";
import { db } from "../../../src/db/client.js";
import {
  organizations,
  permissions,
  rolePermissions,
  roles,
  user,
  userPermissions,
  userRoles,
} from "../../../src/db/schema/index.js";
import { resetDb } from "../../helpers/db.js";

/**
 * checkPermission 集成测试:真实 PG(testcontainers)验证递归 CTE 的组织树继承、
 * deny 传播、过期过滤、多角色并集。见 [权限层规范](../../../../docs/conventions/authorization.md)。
 *
 * 用全局 `db`:integration worker 里 `DATABASE_URL` 已被 globalSetup 指向容器。
 */

const ORG = { hq: "org-hq", south: "org-south", fujian: "org-fujian" } as const;
const ROLE = { admin: "role-admin", editor: "role-editor" } as const;
const PERM = { usersRead: "users.read", usersWrite: "users.write", usersDelete: "users.delete" } as const;
const USER_ID = "user-test";

/** seed 基础数据:组织树(总部→华南→福建)、权限、角色、Better Auth user。 */
async function seedBase() {
  await db.insert(organizations).values([
    { id: ORG.hq, name: "总部" },
    { id: ORG.south, name: "华南", parentId: ORG.hq },
    { id: ORG.fujian, name: "福建", parentId: ORG.south },
  ]);
  await db.insert(permissions).values([
    { name: PERM.usersRead },
    { name: PERM.usersWrite },
    { name: PERM.usersDelete },
  ]);
  await db.insert(roles).values([
    { id: ROLE.admin, name: "admin" },
    { id: ROLE.editor, name: "editor" },
  ]);
  await db.insert(rolePermissions).values([
    { roleId: ROLE.admin, permission: PERM.usersRead },
    { roleId: ROLE.admin, permission: PERM.usersWrite },
    { roleId: ROLE.admin, permission: PERM.usersDelete },
    { roleId: ROLE.editor, permission: PERM.usersRead },
    { roleId: ROLE.editor, permission: PERM.usersWrite },
  ]);
  // 授权表外键引用 user.id,需先有 user 记录(Better Auth 表)。
  await db.insert(user).values({
    id: USER_ID,
    name: "Test User",
    email: "test@example.com",
  });
}

beforeEach(async () => {
  await resetDb();
  await seedBase();
});

describe("checkPermission", () => {
  it("祖先授权对子组织生效(华南授 admin,福建检查 users.read 通过)", async () => {
    await db.insert(userRoles).values({
      userId: USER_ID,
      roleId: ROLE.admin,
      orgId: ORG.south,
    });

    const allowed = await checkPermission(USER_ID, PERM.usersRead, ORG.fujian);

    expect(allowed).toBe(true);
  });

  it("deny 在父组织 → 子组织也拒(华南 deny users.delete,福建检查拒)", async () => {
    // 福建继承华南 admin(含 users.delete)
    await db.insert(userRoles).values({
      userId: USER_ID,
      roleId: ROLE.admin,
      orgId: ORG.south,
    });
    // 华南直接 deny users.delete,向下传播到福建
    await db.insert(userPermissions).values({
      userId: USER_ID,
      permission: PERM.usersDelete,
      orgId: ORG.south,
      effect: "deny",
    });

    const allowed = await checkPermission(USER_ID, PERM.usersDelete, ORG.fujian);

    expect(allowed).toBe(false);
  });

  it("deny 在子组织 → 父组织不受影响(福建 deny,华南检查仍通过)", async () => {
    await db.insert(userRoles).values({
      userId: USER_ID,
      roleId: ROLE.admin,
      orgId: ORG.south,
    });
    await db.insert(userPermissions).values({
      userId: USER_ID,
      permission: PERM.usersDelete,
      orgId: ORG.fujian,
      effect: "deny",
    });

    const allowed = await checkPermission(USER_ID, PERM.usersDelete, ORG.south);

    expect(allowed).toBe(true);
  });

  it("过期的 allow 被过滤(expires_at 早于 now())", async () => {
    await db.insert(userPermissions).values({
      userId: USER_ID,
      permission: PERM.usersRead,
      orgId: ORG.south,
      effect: "allow",
      expiresAt: new Date(Date.now() - 60_000),
    });

    const allowed = await checkPermission(USER_ID, PERM.usersRead, ORG.south);

    expect(allowed).toBe(false);
  });

  it("同组织多角色权限取并集(华南授 admin + editor)", async () => {
    await db.insert(userRoles).values([
      { userId: USER_ID, roleId: ROLE.editor, orgId: ORG.south },
      { userId: USER_ID, roleId: ROLE.admin, orgId: ORG.south },
    ]);

    const readOk = await checkPermission(USER_ID, PERM.usersRead, ORG.south);
    const deleteOk = await checkPermission(USER_ID, PERM.usersDelete, ORG.south);

    expect(readOk).toBe(true);
    expect(deleteOk).toBe(true);
  });

  it("无任何授权返回 false", async () => {
    const allowed = await checkPermission(USER_ID, PERM.usersRead, ORG.south);

    expect(allowed).toBe(false);
  });
});
