import { defineAuditAction } from "../audit/action.js";

/** Better Auth 认证事件的审计动作定义。 */
export const authAuditActions = {
  signIn: defineAuditAction("auth.sign-in", "登录"),
  signOut: defineAuditAction("auth.sign-out", "登出"),
} as const;
