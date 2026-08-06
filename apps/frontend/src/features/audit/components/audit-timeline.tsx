import { CircleAlert, History } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useResourceAuditLogs } from "../hooks/use-resource-audit-logs";
import { AuditTimelineItem } from "./audit-timeline-item";
import { Timeline, TimelineItem } from "./timeline";

interface AuditTimelineProps {
  resourceType: string;
  resourceId: string;
}

/** 骨架屏占位 key(静态内容,不用 index key)。 */
const SKELETON_KEYS = ["skeleton-1", "skeleton-2", "skeleton-3"];

export function AuditTimeline({ resourceType, resourceId }: AuditTimelineProps) {
  const { items, loading, error, hasMore, loadMore, refresh } = useResourceAuditLogs(resourceType, resourceId);

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {SKELETON_KEYS.map(k => (
          <Skeleton key={k} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error != null && items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>无法获取操作历史。</AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={() => { void refresh(); }}>
          重试
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Empty>
        <EmptyMedia variant="icon"><History /></EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>暂无操作记录</EmptyTitle>
          <EmptyDescription>该资源暂无操作历史。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Timeline>
        {items.map((log, i) => (
          <TimelineItem key={log.id} isLast={i === items.length - 1} variant={log.status === "failure" ? "destructive" : "default"}>
            <AuditTimelineItem log={log} />
          </TimelineItem>
        ))}
      </Timeline>
      {hasMore && (
        <div className="flex flex-col items-start gap-1.5">
          <Button variant="outline" size="sm" onClick={loadMore} disabled={loading}>
            {loading ? "加载中..." : "加载更多"}
          </Button>
          {error != null && (
            <span className="text-xs text-destructive">加载失败,点击重试</span>
          )}
        </div>
      )}
    </div>
  );
}
