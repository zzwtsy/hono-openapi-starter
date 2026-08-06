import type { AuditTimelineLog } from "@/api/globals";
import { useWatcher } from "alova/client";
import { useRef, useState } from "react";
import Apis from "@/api";

/**
 * by-resource 时间线(cursor 分页,加载更多)。
 *
 * - 资源变化/挂载:useWatcher 自动重取首页(immediate + deps)
 * - 加载更多/刷新:手动 `send(cursor)`(cursor 作为请求参数,不放进 reactive state)
 *   —— 失败时 cursor 不变,再点一次重试同一页(旧实现 cursor 推进后失败无法重试)
 * - 竞态:alova 默认 abortLast=true,data 只反映最近请求;onSuccess 里再用 requestRef
 *   校验资源一致(双保险),并按请求的 cursor 区分 替换(首页/刷新) vs append(加载更多)
 * - 资源切换时旧列表不展示:page 状态带 resourceKey,渲染时按当前 key 派生(无 reset effect)
 */
export function useResourceAuditLogs(resourceType: string, resourceId: string) {
  const resourceKey = `${resourceType}:${resourceId}`;
  const [page, setPage] = useState<{ resourceKey: string; items: AuditTimelineLog[]; hasMore: boolean } | null>(null);
  // 最近一次请求的上下文:onSuccess 据此决定替换/append,并丢弃过期响应
  const requestRef = useRef<{ resourceKey: string; cursor?: string } | null>(null);

  const watcher = useWatcher(
    (cursor?: string) => {
      requestRef.current = { resourceKey, cursor };
      return Apis.Audit.listAuditLogsByResource({
        params: { resourceType, resourceId, cursor, pageSize: 20 },
      });
    },
    [resourceType, resourceId],
    { immediate: true, cacheFor: 0 },
  );

  // 成功回调(binder 有类型):按请求的 cursor 区分 替换/append,并丢弃过期响应
  watcher.onSuccess((event) => {
    const req = requestRef.current;
    if (req == null || req.resourceKey !== resourceKey) {
      return;
    }
    setPage(prev => ({
      resourceKey,
      // cursor 有值 => 加载更多(同一资源,append);无值 => 首页/刷新(替换)
      items: req.cursor != null ? [...(prev?.items ?? []), ...event.data.items] : event.data.items,
      hasMore: event.data.meta.hasMore,
    }));
  });

  const { data, loading, error, send } = watcher;

  // 按当前资源派生:资源切换后、新首页到达前,旧列表不展示
  const visible = page != null && page.resourceKey === resourceKey ? page : null;
  const items = visible?.items ?? [];
  const hasMore = visible?.hasMore ?? false;

  const loadMore = () => {
    if (!hasMore || loading) {
      return;
    }
    const nextCursor = data?.meta.nextCursor;
    if (nextCursor != null) {
      void send(nextCursor);
    }
  };

  const refresh = () => {
    void send();
  };

  return { items, loading, error, hasMore, loadMore, refresh };
}
