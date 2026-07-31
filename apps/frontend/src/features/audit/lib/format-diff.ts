import type { AuditAction, AuditLog } from "@/api/globals";

import { format } from "date-fns";

interface ResourceRef {
  type?: string;
  id?: string;
  name?: string | null;
}

/** 从 AuditLog 组装时间线摘要(变更字段 / 失败原因)。 */
export function formatAuditSummary(log: AuditLog): string {
  const changed = log.changedFields as string[] | null;
  if (Array.isArray(changed) && changed.length > 0) {
    return `变更：${changed.join(", ")}`;
  }
  if (log.status === "failure") {
    return `失败：${log.errorCode ?? "未知错误"}`;
  }
  return "";
}

/** 格式化时间(MM-dd HH:mm)。 */
export function formatAuditTime(iso: string): string {
  return format(new Date(iso), "MM-dd HH:mm");
}

/** 根据 action 代码查中文 label,未命中回退 action 本身。 */
export function getActionLabel(action: string, actions: readonly AuditAction[]): string {
  return actions.find(a => a.action === action)?.label ?? action;
}

/** 从 resourceRefs 提取可读摘要(如"用户 张三"、"用户 张三 / 角色 admin")。 */
export function formatResourceRefs(refs: unknown): string {
  if (!Array.isArray(refs)) {
    return "";
  }
  return (refs as ResourceRef[])
    .map(r => r.name != null ? `${r.type ?? ""} ${r.name}` : `${r.type ?? ""} ${r.id ?? ""}`)
    .join(" / ");
}
