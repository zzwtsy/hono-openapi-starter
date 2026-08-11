import { z } from "zod";

/** 审计页 URL search 状态(筛选 + 分页;唯一事实来源,刷新/分享/返回键保留)。 */
export interface AuditSearch {
  page?: number;
  pageSize?: number;
  actions?: string[];
  status?: "success" | "failure";
  actorKeyword?: string;
  from?: string;
  to?: string;
}

const isoDateTimeSchema = z.iso.datetime();

/** URL 可同时出现单值或重复参数；统一为去重后的动作代码数组。 */
export function parseAuditSearchActions(value: unknown): string[] | undefined {
  let values: unknown[] = [];
  if (Array.isArray(value)) {
    values = value;
  } else if (typeof value === "string") {
    values = [value];
  }
  const actions = [...new Set(
    values
      .filter((item): item is string => typeof item === "string")
      .flatMap(item => item.split(","))
      .map(item => item.trim())
      .filter(Boolean),
  )].slice(0, 50);

  return actions.length > 0 ? actions : undefined;
}

/** 只接受后端 `z.iso.datetime()` 同语义的时间参数,无效 URL 值归一为 undefined。 */
export function parseAuditSearchDate(value: unknown): string | undefined {
  return typeof value === "string" && isoDateTimeSchema.safeParse(value).success ? value : undefined;
}

/** 结束时间不能脱离开始时间独立存在；预设允许只有 from。 */
export function parseAuditSearchDateRange(fromValue: unknown, toValue: unknown): Pick<AuditSearch, "from" | "to"> {
  const from = parseAuditSearchDate(fromValue);
  if (from == null) {
    return { from: undefined, to: undefined };
  }
  return { from, to: parseAuditSearchDate(toValue) };
}
