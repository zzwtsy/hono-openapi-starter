import type { AuditLog } from "@/api/globals";
import { useWatcher } from "alova/client";
import { useEffect, useRef, useState } from "react";
import Apis from "@/api";

/**
 * by-resource 时间线(cursor 分页,加载更多)。
 *
 * cursor 是触发重取的 reactive state:首次为 undefined,loadMore 时推进 cursor 触发下一页。
 * resourceType/resourceId 变化时重置 cursor 和 items(父组件用 key remount 也会重置)。
 */
export function useResourceAuditLogs(resourceType: string, resourceId: string) {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  // 记录上次请求的 cursor,区分「首次/重置」(替换)与「加载更多」(append)
  const requestedCursorRef = useRef<string | undefined>(undefined);

  const { data, loading, error, send } = useWatcher(
    () => Apis.Audit.listAuditLogsByResource({
      params: { resourceType, resourceId, cursor, pageSize: 20 },
    }),
    [resourceType, resourceId, cursor],
    { immediate: true, cacheFor: 0 },
  );

  // resourceType/resourceId 变化时重置为首页
  useEffect(() => {
    requestedCursorRef.current = undefined;
    setCursor(undefined);
    setItems([]);
  }, [resourceType, resourceId]);

  // 数据返回后:按 requestedCursor 区分替换/append
  useEffect(() => {
    if (data == null) {
      return;
    }
    if (requestedCursorRef.current == null) {
      setItems(data.items);
    } else {
      setItems(prev => [...prev, ...data.items]);
    }
    setHasMore(data.meta.hasMore);
  }, [data]);

  const loadMore = () => {
    if (!hasMore || loading) {
      return;
    }
    const nextCursor = data?.meta.nextCursor;
    if (nextCursor != null) {
      requestedCursorRef.current = nextCursor;
      setCursor(nextCursor);
    }
  };

  const refresh = () => {
    requestedCursorRef.current = undefined;
    setCursor(undefined);
    void send();
  };

  return { items, loading, error, hasMore, loadMore, refresh };
}
