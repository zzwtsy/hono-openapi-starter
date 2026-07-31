import { useWatcher } from "alova/client";
import Apis from "@/api";

/**
 * 审计日志全局列表(offset 分页 + 筛选)。
 *
 * 用 useWatcher 监听 page/filters,变化时自动重取。cacheFor=0 保证实时性。
 */
export function useAuditLogs(params: {
  page: number;
  pageSize: number;
  action?: string;
  actorUserId?: string;
  status?: "success" | "failure";
  from?: string;
  to?: string;
}) {
  const { data, loading, error, send } = useWatcher(
    () => Apis.Audit.listAuditLogs({ params }),
    [params.page, params.action, params.actorUserId, params.status, params.from, params.to],
    { immediate: true, cacheFor: 0 },
  );

  return { data, loading, error, send };
}
