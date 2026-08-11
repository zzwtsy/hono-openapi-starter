import type { AuditTimelineLog } from "@/api/globals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatActorName, formatAuditSummary, formatAuditTime } from "../lib/format-diff";
import { AuditDiffList } from "./audit-diff-list";

interface AuditTimelineItemProps {
  log: AuditTimelineLog;
}

export function AuditTimelineItem({ log }: AuditTimelineItemProps) {
  const label = log.actionLabel;
  const summary = formatAuditSummary(log);
  const time = formatAuditTime(log.occurredAt);
  const isFailure = log.status === "failure";

  return (
    <Collapsible>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{time}</span>
          <Badge variant={isFailure ? "destructive" : "secondary"}>{label}</Badge>
          {isFailure && <span className="text-xs text-destructive">失败</span>}
        </div>
        <span className="text-xs text-muted-foreground">{formatActorName(log)}</span>
        {summary !== "" && <span className="text-xs text-muted-foreground">{summary}</span>}
        <CollapsibleTrigger render={<Button variant="link" size="xs" className="self-start px-0 text-muted-foreground" />}>
          展开详情
        </CollapsibleTrigger>
        <CollapsibleContent>
          <AuditDiffList
            before={log.beforeState}
            after={log.afterState}
            changedFields={log.changedFields}
          />
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
