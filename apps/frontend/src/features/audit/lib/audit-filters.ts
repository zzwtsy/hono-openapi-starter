/** 审计页筛选状态(与 URL search 的筛选字段对应;page/pageSize 是分页,不算筛选)。 */
export interface AuditFilterState {
  actions?: readonly string[];
  status?: "success" | "failure";
  actorKeyword?: string;
  from?: string;
  to?: string;
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

/** 是否处于筛选态(任一筛选激活;分页不算筛选)。 */
export function hasActiveFilters(filters: AuditFilterState): boolean {
  return (filters.actions?.length ?? 0) > 0
    || filters.status != null
    || (filters.actorKeyword != null && filters.actorKeyword.trim() !== "")
    || filters.from != null
    || filters.to != null;
}

/** 激活的筛选组数量；多个 action 仍算一个筛选组。 */
export function countActiveFilterGroups(filters: AuditFilterState): number {
  let count = 0;
  if ((filters.actions?.length ?? 0) > 0) {
    count += 1;
  }
  if (filters.status != null) {
    count += 1;
  }
  if (filters.actorKeyword != null && filters.actorKeyword.trim() !== "") {
    count += 1;
  }
  if (filters.from != null || filters.to != null) {
    count += 1;
  }
  return count;
}
