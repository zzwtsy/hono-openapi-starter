import { defineAuditAction } from "@/core/audit/action.js";

/** Projects feature 的审计动作定义。 */
export const projectAuditActions = {
  create: defineAuditAction("projects.create", "创建项目"),
  update: defineAuditAction("projects.update", "修改项目"),
  delete: defineAuditAction("projects.delete", "删除项目"),
} as const;
