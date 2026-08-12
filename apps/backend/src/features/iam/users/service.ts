import { hashPassword } from "better-auth/crypto";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";

import { AppError } from "@/core/errors/app-error.js";
import { db } from "@/db/client.js";
import {
  account,
  generateId,
  organizations,
  session,
  user,
  userPermissions,
  userRoles,
} from "@/db/schema/index.js";
import { assertOrgInSubtree, getManagedSubtree } from "../org-tree.js";
import { assertNotSelf, requireUserInSubtree } from "../shared/service-helpers.js";

/** IAM 用户生命周期管理子能力。 */
export const UserService = {
  async listUsers(actorOrgId: string) {
    const subtree = await getManagedSubtree(actorOrgId);
    return db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        orgId: user.orgId,
        disabled: user.disabled,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(inArray(user.orgId, subtree))
      .orderBy(asc(user.createdAt), asc(user.id));
  },

  /**
   * 管理员代创建用户:email+password+name+orgId(目标 org,须在操作者管理子树内)。
   * 目标 org 越权或不存在 -> 404(不暴露树外 org)。同 email -> 409。
   * 复用 bootstrap 原语(hashPassword + insert user/account)。
   */
  async createUser(actorOrgId: string, input: { email: string; password: string; name: string; orgId: string }) {
    // 目标 org 须在操作者管理子树(自身+子孙);不在或不存在 -> 404
    await assertOrgInSubtree(actorOrgId, input.orgId);
    const userId = generateId();
    const passwordHash = await hashPassword(input.password);
    // user + account 原子写入:account 失败不留孤儿 user(可见不可登录,重试 409)。
    // email 查重在事务内用 onConflictDoNothing 兜底,根除并发 TOCTOU:并发同邮箱第二次不再撞 DB 唯一约束返 500,
    // 而是 returning 空 -> 抛 COMMON_CONFLICT(409),与 OpenAPI 契约一致。
    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(user)
        .values({
          id: userId,
          name: input.name,
          email: input.email,
          orgId: input.orgId,
        })
        .onConflictDoNothing({ target: user.email })
        .returning();
      if (inserted == null) {
        throw new AppError("USER_EMAIL_ALREADY_EXISTS");
      }
      await tx.insert(account).values({
        id: generateId(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
      });
    });
    const [created] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        orgId: user.orgId,
        disabled: user.disabled,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.id, userId));
    // 事务已提交,理论上 user 必存在;兜底防异常场景(如并发硬删)返回 null 破坏 UserSummary 契约。
    if (created == null) {
      throw new AppError("COMMON_INTERNAL_ERROR");
    }
    return created;
  },

  /**
   * 改用户资料(name/email);不改 orgId。目标须本组织,否则 404。
   * email 冲突 → 409。
   */
  async updateUser(
    actorOrgId: string,
    userId: string,
    input: { name?: string; email?: string },
  ) {
    await requireUserInSubtree(actorOrgId, userId);
    const patch: { name?: string; email?: string } = {};
    if (input.name !== undefined) {
      patch.name = input.name;
    }
    if (input.email !== undefined) {
      patch.email = input.email;
    }
    if (Object.keys(patch).length === 0) {
      return requireUserInSubtree(actorOrgId, userId);
    }
    // 事务内 select 查重 + update + returning:email 改名查重排除自身,压窄 TOCTOU 窗口,
    // unique 约束兜底(B2 D4,对齐 createRole/projects.update)。returning 拿更新后数据,
    // 不在事务内用全局 db 重查(读不到未提交更改)。
    const [updated] = await db.transaction(async (tx) => {
      if (patch.email !== undefined) {
        const [clash] = await tx
          .select({ id: user.id })
          .from(user)
          .where(and(eq(user.email, patch.email), ne(user.id, userId)));
        if (clash != null) {
          throw new AppError("USER_EMAIL_ALREADY_EXISTS");
        }
      }
      const [row] = await tx
        .update(user)
        .set(patch)
        .where(eq(user.id, userId))
        .returning({
          id: user.id,
          name: user.name,
          email: user.email,
          orgId: user.orgId,
          disabled: user.disabled,
          createdAt: user.createdAt,
        });
      if (row == null) {
        throw new AppError("USER_NOT_FOUND");
      }
      return [row];
    });
    return updated;
  },

  /**
   * 重置密码:hashPassword + update credential account;删该用户全部 session 立即下线。
   * 无 credential account → 404。
   */
  async resetPassword(actorOrgId: string, userId: string, newPassword: string) {
    await requireUserInSubtree(actorOrgId, userId);
    const passwordHash = await hashPassword(newPassword);
    // 事务保证 update password + delete session 原子:delete 失败则 password 回滚,
    // 避免密码已改但旧 session 仍有效(B2 D1,与 disableUser 同构)。
    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(account)
        .set({ password: passwordHash })
        .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
        .returning({ id: account.id });
      if (updated == null) {
        throw new AppError("USER_NO_CREDENTIAL_ACCOUNT");
      }
      await tx.delete(session).where(eq(session.userId, userId));
    });
  },

  /**
   * 禁用用户:set disabled=true + 删全部 session。
   * 禁止禁用自己 → 403。
   */
  async disableUser(actorOrgId: string, actorUserId: string, userId: string) {
    assertNotSelf(actorUserId, userId, "USER_CANNOT_DISABLE_SELF");
    await requireUserInSubtree(actorOrgId, userId);
    // 事务保证 update disabled + delete session 原子:delete 失败则 disabled 回滚,
    // 避免"disabled=true 但旧 session 仍有效"的安全语义破坏(B2 D1)。
    // returning 拿更新后数据,省一次 requireUserInSubtree 查询。
    const updated = await db.transaction(async (tx) => {
      const [row] = await tx.update(user)
        .set({ disabled: true })
        .where(eq(user.id, userId))
        .returning({
          id: user.id,
          name: user.name,
          email: user.email,
          orgId: user.orgId,
          disabled: user.disabled,
          createdAt: user.createdAt,
        });
      if (row == null) {
        throw new AppError("USER_NOT_FOUND");
      }
      // 删全部 session:未开 cookieCache,删行后旧 session 立即失效;
      // databaseHooks.session.create.before 拦新建 session,禁用用户无法再登录。
      await tx.delete(session).where(eq(session.userId, userId));
      return row;
    });
    return updated;
  },

  /** 启用用户:清 disabled。 */
  async enableUser(actorOrgId: string, userId: string) {
    await requireUserInSubtree(actorOrgId, userId);
    await db.update(user).set({ disabled: false }).where(eq(user.id, userId));
    return requireUserInSubtree(actorOrgId, userId);
  },

  /**
   * 调岗:改 user.orgId + 清理调岗后失效的 grant。
   *
   * grant 清理(方案 A,默认):删 staleOrgIds = 旧 home 祖先集 − 新 home 祖先集 上的
   * user_roles/user_permissions。共同祖先上的 grant 保留(继承语义:总部授的权限调岗后仍生效)。
   * clearAllGrants=true(方案 B):清全部 grant,用于安全敏感的跨大区调动。
   *
   * 权限正确性不依赖清理:PDP 沿新 home 向上查祖先集,旧独有路径上的 grant 自动失效。
   * 清理是数据卫生(防管理端噪声、调回旧 org 时 grant 复活、表膨胀)。
   *
   * 乐观锁:UPDATE WHERE orgId = oldOrgId,并发调岗后写者 affected=0 -> 409。
   * user.orgId 无 FK(已知 TOCTOU),乐观锁收窄窗口。
   */
  async transferUserOrganization(
    actorOrgId: string,
    actorUserId: string,
    userId: string,
    newOrgId: string,
    clearAllGrants = false,
  ) {
    assertNotSelf(actorUserId, userId, "USER_CANNOT_TRANSFER_SELF");
    // 事务外快速失败:用户在子树 + 取 oldOrgId
    const target = await requireUserInSubtree(actorOrgId, userId);
    const oldOrgId = target.orgId!;
    // 目标 org 须在操作者管理子树(不能把人调到自己管不了的地方)
    await assertOrgInSubtree(actorOrgId, newOrgId);
    if (newOrgId === oldOrgId) {
      throw new AppError("ORG_SAME_AS_CURRENT");
    }

    return db.transaction(async (tx) => {
      // 乐观锁:update 时校验 orgId 未被并发改;并发调岗后写者 affected=0 -> 409
      const [updated] = await tx
        .update(user)
        .set({ orgId: newOrgId })
        .where(and(eq(user.id, userId), eq(user.orgId, oldOrgId)))
        .returning({
          id: user.id,
          name: user.name,
          email: user.email,
          orgId: user.orgId,
          disabled: user.disabled,
          createdAt: user.createdAt,
        });
      if (updated == null) {
        throw new AppError("USER_TRANSFER_CONFLICT");
      }

      // grant 清理
      if (clearAllGrants) {
        await tx.delete(userRoles).where(eq(userRoles.userId, userId));
        await tx.delete(userPermissions).where(eq(userPermissions.userId, userId));
      } else {
        // staleOrgIds = 旧 home 祖先集 − 新 home 祖先集(两条递归 CTE + 差集)。
        // 这些 org 不在新 home 的祖先集里,挂在上面的 grant 已失效(算法层面自动失效,此处物理删做卫生)。
        // 共同祖先在两集交集里,不会被清。
        const staleRows = await tx.execute(sql`
          WITH RECURSIVE
            old_ancestors AS (
              SELECT ${organizations.id} AS id FROM ${organizations} WHERE ${organizations.id} = ${oldOrgId}
              UNION ALL
              SELECT ${organizations.parentId} AS id FROM ${organizations}
              JOIN old_ancestors oa ON ${organizations.id} = oa.id
            ) CYCLE id SET is_cycle USING path,
            new_ancestors AS (
              SELECT ${organizations.id} AS id FROM ${organizations} WHERE ${organizations.id} = ${newOrgId}
              UNION ALL
              SELECT ${organizations.parentId} AS id FROM ${organizations}
              JOIN new_ancestors na ON ${organizations.id} = na.id
            ) CYCLE id SET is_cycle USING path
          SELECT o.id FROM old_ancestors o
          WHERE o.id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM new_ancestors n WHERE n.id = o.id)
        `);
        const staleOrgIds = staleRows
          .map(r => r.id)
          .filter((id): id is string => typeof id === "string");
        if (staleOrgIds.length > 0) {
          await tx
            .delete(userRoles)
            .where(and(eq(userRoles.userId, userId), inArray(userRoles.orgId, staleOrgIds)));
          await tx
            .delete(userPermissions)
            .where(and(eq(userPermissions.userId, userId), inArray(userPermissions.orgId, staleOrgIds)));
        }
      }

      return updated;
    });
  },
};
