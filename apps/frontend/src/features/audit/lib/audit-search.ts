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
