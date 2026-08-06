import type { ActiveFilterChip } from "../lib/audit-filters";
import { History, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

/** 筛选字段键(chip 移除用)。 */
export type FilterKey = "action" | "status" | "actorKeyword" | "from" | "to";

/** active chips 行:筛选可见性(字段: 值)+ 结果计数;aria-live 播报变化。 */
export function FilterChipsRow({ chips, total, onRemove, onClearAll }: {
  chips: ActiveFilterChip[];
  total: number | undefined;
  onRemove: (key: FilterKey) => void;
  onClearAll: () => void;
}) {
  if (chips.length === 0 && total == null) {
    return null;
  }
  return (
    <div aria-live="polite" className="flex flex-wrap items-center gap-1.5 text-sm">
      {chips.map(chip => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 rounded-full border bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
        >
          {chip.label}
          <button
            type="button"
            aria-label={`移除${chip.label}筛选`}
            className="grid size-4 place-items-center rounded-full hover:bg-muted-foreground/20 focus-visible:outline-2 focus-visible:outline-ring"
            onClick={() => { onRemove(chip.key); }}
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      {chips.length >= 2 && (
        <Button type="button" variant="ghost" size="xs" onClick={onClearAll}>清除全部</Button>
      )}
      {total != null && (
        <span className="ml-auto text-xs text-muted-foreground">
          共
          {" "}
          {total}
          {" "}
          条
        </span>
      )}
    </div>
  );
}

/** 空态二分:筛选激活 -> 无结果引导;否则首次无数据。 */
export function AuditEmptyState({ filtered }: { filtered: boolean }) {
  if (filtered) {
    return (
      <Empty>
        <EmptyMedia variant="icon"><History /></EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>没有符合条件的记录</EmptyTitle>
          <EmptyDescription>调整或清除筛选以查看更多记录。</EmptyDescription>
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
