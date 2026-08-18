import type { AuditAction, AuditLog, ResourceRef } from "@/api/globals";

/**
 * 审计时间使用绝对时间和秒级精度，避免审计与合规场景中的相对时间歧义。
 * 浏览器本地时区渲染;时区消歧由调用方列头标注(如「时间(本地)」)。
 * 模块级 formatter 避免每次 render 重建。
 */
const auditTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "medium",
});

/** 资源类型 -> 中文标签(与 IAM resourceLabel 对齐思路);未知类型回退原文。 */
const resourceTypeLabels: Record<string, string> = {
  user: "用户",
  role: "角色",
  org: "组织",
  project: "项目",
  setting: "配置",
};

/** 从审计条目组装时间线摘要(变更字段 / 失败原因)。失败优先:失败时 before 有值也不展示"变更"。 */
export function formatAuditSummary(log: Pick<AuditLog, "status" | "errorCode" | "changedFields">): string {
  if (log.status === "failure") {
    return `失败：${log.errorCode ?? "未知错误"}`;
  }
  const changed = log.changedFields;
  if (changed != null && changed.length > 0) {
    return `变更：${changed.join(", ")}`;
  }
  return "";
}

/** 格式化时间(绝对时间 + 秒,如 `2026年7月1日 14:30:45`);无效日期回退原文。 */
export function formatAuditTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : auditTimeFormatter.format(date);
}

/** 根据 action 代码查中文 label,未命中回退 action 本身。 */
export function getActionLabel(action: string, actions: readonly AuditAction[]): string {
  return actions.find(a => a.action === action)?.label ?? action;
}

/** 从 resourceRefs 提取可读摘要(如"用户 张三"、"用户 张三 / 角色 admin")。 */
export function formatResourceRefs(refs: ResourceRef[] | null | undefined): string {
  if (refs == null || refs.length === 0) {
    return "";
  }
  return refs
    .map((r) => {
      const typeLabel = resourceTypeLabels[r.type] ?? r.type;
      return r.name != null ? `${typeLabel} ${r.name}` : `${typeLabel} ${r.id}`;
    })
    .join(" / ");
}

/** actor 显示:写时名称快照优先,快照缺失回退 ID,再退占位(登录失败等无 actor 事件)。 */
export function formatActorName(log: Pick<AuditLog, "actorName" | "actorUserId">): string {
  return log.actorName ?? log.actorUserId ?? "-";
}
