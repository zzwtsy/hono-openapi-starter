import { defineAuditAction } from "@/core/audit/action.js";

/** Me feature 的审计动作定义。 */
export const meAuditActions = {
  update: defineAuditAction("me.update", "自助修改显示名"),
  changePassword: defineAuditAction("me.change_password", "自助修改密码"),
} as const;
