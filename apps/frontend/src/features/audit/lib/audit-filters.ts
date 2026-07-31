import type { AuditAction } from "@/api/globals";

/** 审计页筛选状态(与 URL search 的筛选字段对应;page/pageSize 是分页,不算筛选)。 */
export interface AuditFilterState {
  action?: string;
  status?: "success" | "failure";
  actorKeyword?: string;
  from?: string;
  to?: string;
}

/** active chips 项(「字段: 值」格式,供可移除 chip 渲染)。 */
export interface ActiveFilterChip {
  key: "action" | "status" | "actorKeyword" | "from" | "to";
  /** chip 展示文本,如 `操作: 修改项目`。 */
  label: string;
}

/** 时间快捷预设(点击把计算好的 from/to 写进 search,固定值不滑动)。 */
export const TIME_PRESETS = [
  { key: "24h", label: "近 24 小时", hours: 24 },
  { key: "7d", label: "近 7 天", hours: 24 * 7 },
  { key: "30d", label: "近 30 天", hours: 24 * 30 },
] as const;

export type TimePresetKey = (typeof TIME_PRESETS)[number]["key"];

/** 预设 -> ISO 时间范围(now - hours 起,无截止)。 */
export function presetToRange(presetKey: TimePresetKey, now: Date = new Date()): { from: string } {
  const preset = TIME_PRESETS.find(p => p.key === presetKey);
  if (preset == null) {
    return { from: "" };
  }
  return { from: new Date(now.getTime() - preset.hours * 60 * 60 * 1000).toISOString() };
}

/** 从筛选状态派生 chips 列表(空筛选返回空数组)。 */
export function deriveActiveFilters(filters: AuditFilterState, actions: readonly AuditAction[]): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  if (filters.action != null) {
    const label = actions.find(a => a.action === filters.action)?.label ?? filters.action;
    chips.push({ key: "action", label: `操作：${label}` });
  }
  if (filters.status != null) {
    chips.push({ key: "status", label: `结果：${filters.status === "success" ? "成功" : "失败"}` });
  }
  if (filters.actorKeyword != null && filters.actorKeyword.trim() !== "") {
    chips.push({ key: "actorKeyword", label: `操作人：${filters.actorKeyword.trim()}` });
  }
  if (filters.from != null) {
    chips.push({ key: "from", label: `起始：${filters.from.slice(0, 10)}` });
  }
  if (filters.to != null) {
    chips.push({ key: "to", label: `截止：${filters.to.slice(0, 10)}` });
  }
  return chips;
}

/** 是否处于筛选态(任一筛选激活;分页不算筛选)。 */
export function hasActiveFilters(filters: AuditFilterState): boolean {
  return deriveActiveFilters(filters, []).length > 0;
}
