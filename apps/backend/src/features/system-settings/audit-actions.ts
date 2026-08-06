import { defineAuditAction } from "@/core/audit/action.js";

/** System settings feature 的审计动作定义。 */
export const systemSettingsAuditActions = {
  update: defineAuditAction("settings.update", "修改系统配置"),
} as const;
