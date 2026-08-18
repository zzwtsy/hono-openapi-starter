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

const auditFieldLabels: Record<string, string> = {
  id: "ID",
  name: "名称",
  email: "邮箱",
  description: "描述",
  orgId: "组织",
  roleId: "角色",
  disabled: "账号状态",
  effect: "授权效果",
  source: "来源",
  createdAt: "创建时间",
  updatedAt: "更新时间",
  expiresAt: "过期时间",
  permissionCodes: "权限",
  roleIds: "角色",
};
const auditStringValueLabels: Record<string, Record<string, string>> = {
  effect: { allow: "允许", deny: "拒绝" },
  source: { code: "系统内置", instance: "自定义" },
};
const auditTimestampFields = new Set(["createdAt", "updatedAt", "expiresAt"]);

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

/** 详情页首屏使用的自然语言事件摘要。 */
export function formatAuditSentence(log: AuditLog, actions: readonly AuditAction[]): string {
  const actor = formatActorName(log);
  const action = getActionLabel(log.action, actions);
  const resource = formatResourceRefs(log.resourceRefs) || "系统";
  const result = log.status === "failure" ? `失败${log.errorCode == null ? "" : `（${log.errorCode}）`}` : "成功";
  return `${actor} 对 ${resource} 执行“${action}”，结果为${result}。`;
}

export function formatAuditFieldLabel(field: string): string {
  return auditFieldLabels[field] ?? field;
}

/** 将审计快照中的常见业务值转换为界面文案。 */
export function formatAuditFieldValue(field: string, value: unknown, names?: Record<string, string>): string {
  if (value == null) {
    return "—";
  }
  if (typeof value === "string") {
    const valueLabel = auditStringValueLabels[field]?.[value];
    if (valueLabel != null) {
      return valueLabel;
    }
    if (auditTimestampFields.has(field)) {
      return formatAuditTime(value);
    }
    return names?.[field] ?? value;
  }
  if (typeof value === "boolean") {
    if (field === "disabled") {
      return value ? "已禁用" : "正常";
    }
    return value ? "是" : "否";
  }
  return typeof value === "number" ? String(value) : (JSON.stringify(value) ?? String(value));
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
