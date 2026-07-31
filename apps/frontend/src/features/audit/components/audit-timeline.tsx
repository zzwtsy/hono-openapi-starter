import { CircleAlert, History } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditActions } from "../hooks/use-audit-actions";
import { useResourceAuditLogs } from "../hooks/use-resource-audit-logs";
import { AuditTimelineItem } from "./audit-timeline-item";
import { Timeline, TimelineItem } from "./timeline";

interface AuditTimelineProps {
  resourceType: string;
  resourceId: string;
}

export function AuditTimeline({ resourceType, resourceId }: AuditTimelineProps) {
  const actions = useAuditActions();
  const { items, loading, error, hasMore, loadMore, refresh } = useResourceAuditLogs(resourceType, resourceId);

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
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
            <AuditTimelineItem log={log} actions={actions} />
          </TimelineItem>
        ))}
      </Timeline>
      {hasMore && (
        <Button variant="outline" size="sm" onClick={loadMore} disabled={loading}>
          {loading ? "加载中..." : "加载更多"}
        </Button>
      )}
    </div>
  );
}
