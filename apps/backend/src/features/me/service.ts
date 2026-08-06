import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";

import { auth } from "@/core/auth/better-auth.js";
import { AppError } from "@/core/errors/app-error.js";
import { db } from "@/db/client.js";
import { account, session, user } from "@/db/schema/index.js";

/**
 * me feature service:当前用户自助修改自己的资料(name)和密码。
 *
 * 与 iam/service.ts 的 updateUser/resetPassword 区别:
 * - 无 requireUserInSubtree 子树检查(自助操作固定 userId = 当前用户)。
 * - me 端点仅需 requireAuth(看自己/改自己,见 iam.md §6)。
 *
 * 改密码后删全部 session 强制重新登录(与 resetPassword/disableUser 同构,见 iam.md §7)。
 */
export const MeService = {
  /** 审计 before 快照:查用户(UserSummary 形状,不含 password 等敏感列)。 */
  async getUserSnapshot(userId: string) {
    const [row] = await db
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
    return row;
  },

  /**
   * 改自己的显示名。固定 userId = 当前用户;不改 email/orgId/disabled。
   * name 是 user 表已有列,无需 migration。
   */
  async updateMe(userId: string, input: { name: string }) {
    const [updated] = await db
      .update(user)
      .set({ name: input.name })
      .where(eq(user.id, userId))
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        orgId: user.orgId,
      });
    // 事务已提交,理论上 user 必存在;兜底防异常场景(如并发硬删)。
    if (updated == null) {
      throw new AppError("USER_NOT_FOUND");
    }
    return updated;
  },

  /**
   * 自助改密码:verifyPassword 验当前密码 → hashPassword → update account → 删全部 session。
   *
   * - verifyPassword 用 BA 服务端 API(v1.4.11+,catalog ^1.6.23),接收当前 session headers,
   *   返回 boolean;false 抛 USER_INVALID_PASSWORD(401)。
   * - 事务保证 update password + delete session 原子(与 resetPassword 同构,B2 D1)。
   * - 无 credential account → USER_NO_CREDENTIAL_ACCOUNT(404,OAuth 用户无密码)。
   */
  async changeMyPassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    headers: Headers,
  ) {
    const result = await auth.api.verifyPassword({
      body: { password: currentPassword },
      headers,
    });
    if (result.status !== true) {
      throw new AppError("USER_INVALID_PASSWORD");
    }

    const passwordHash = await hashPassword(newPassword);
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
};
