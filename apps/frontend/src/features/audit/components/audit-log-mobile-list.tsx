import type { AuditAction, AuditLog } from "@/api/globals";
import { Badge } from "@/components/ui/badge";
import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemTitle } from "@/components/ui/item";
import { formatActorName, formatAuditTime, formatResourceRefs, getActionLabel } from "../lib/format-diff";

interface AuditLogMobileListProps {
  actions: readonly AuditAction[];
  logs: readonly AuditLog[];
  selectedId: string | undefined;
  onSelect: (log: AuditLog) => void;
}

/** 窄屏事件摘要：核心信息纵向排列，不依赖横向表格滚动。 */
export function AuditLogMobileList({ actions, logs, selectedId, onSelect }: AuditLogMobileListProps) {
  return (
    <ItemGroup className="gap-2" aria-label="操作日志列表">
      {logs.map((log) => {
        const actionLabel = getActionLabel(log.action, actions);
        const resource = formatResourceRefs(log.resourceRefs) || "系统";
        return (
          <Item
            key={log.id}
            render={<button type="button" />}
            variant={selectedId === log.id ? "muted" : "outline"}
            className="items-start text-left"
            aria-label={`查看操作日志：${actionLabel}，${resource}`}
            onClick={() => onSelect(log)}
          >
            <ItemContent>
              <ItemTitle className="line-clamp-2 w-full">{actionLabel}</ItemTitle>
              <ItemDescription className="line-clamp-2">
                {formatActorName(log)}
                {" · "}
                {resource}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Badge variant={log.status === "failure" ? "destructive" : "secondary"}>
                {log.status === "failure" ? "失败" : "成功"}
              </Badge>
            </ItemActions>
            <ItemFooter className="text-xs text-muted-foreground tabular-nums">
              {formatAuditTime(log.occurredAt)}
            </ItemFooter>
          </Item>
        );
      })}
    </ItemGroup>
  );
}
