import { History } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

/** 空态二分：筛选激活时引导调整条件，否则展示首次无数据状态。 */
export function AuditEmptyState({ filtered }: { filtered: boolean }) {
  if (filtered) {
    return (
      <Empty>
        <EmptyMedia variant="icon"><History /></EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>没有符合条件的记录</EmptyTitle>
          <EmptyDescription>调整或重置筛选以查看更多记录。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <Empty>
      <EmptyMedia variant="icon"><History /></EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>暂无日志</EmptyTitle>
        <EmptyDescription>系统还没有操作记录。</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
