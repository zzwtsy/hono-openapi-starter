import { z } from "zod";

/** 审计页 URL search 状态(筛选 + 分页;唯一事实来源,刷新/分享/返回键保留)。 */
export interface AuditSearch {
  page?: number;
  pageSize?: number;
  action?: string;
  status?: "success" | "failure";
  actorKeyword?: string;
  from?: string;
  to?: string;
}

const isoDateTimeSchema = z.iso.datetime();

/** 只接受后端 `z.iso.datetime()` 同语义的时间参数,无效 URL 值归一为 undefined。 */
export function parseAuditSearchDate(value: unknown): string | undefined {
  return typeof value === "string" && isoDateTimeSchema.safeParse(value).success ? value : undefined;
}
