import type { AuditLog } from "@/api/globals";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatActorName, formatAuditTime, formatResourceRefs } from "../lib/format-diff";
import { AuditDiffList } from "./audit-diff-list";

interface AuditLogDetailSheetProps {
  log: AuditLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditLogDetailSheet({ log, open, onOpenChange }: AuditLogDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-md flex-col gap-4 overflow-y-auto p-6 sm:max-w-lg">
        {log != null && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Badge variant={log.status === "failure" ? "destructive" : "secondary"}>
                  {log.status === "failure" ? "失败" : "成功"}
                </Badge>
                <span>{log.action}</span>
              </SheetTitle>
              <SheetDescription>{formatAuditTime(log.occurredAt)}</SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">操作人：</span>
                <span>{formatActorName(log)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">资源：</span>
                <span>{formatResourceRefs(log.resourceRefs)}</span>
              </div>
              {log.errorCode != null && (
                <div>
                  <span className="text-muted-foreground">错误码：</span>
                  <span className="text-destructive">{log.errorCode}</span>
                </div>
              )}
              {Array.isArray(log.changedFields) && log.changedFields.length > 0 && (
                <div>
                  <span className="text-muted-foreground">变更字段：</span>
                  <span>{log.changedFields.join(", ")}</span>
                </div>
              )}
              {log.ipAddress != null && (
                <div>
                  <span className="text-muted-foreground">IP：</span>
                  <span>{log.ipAddress}</span>
                </div>
              )}
              {log.requestId != null && (
                <div>
                  <span className="text-muted-foreground">请求 ID：</span>
                  <span className="font-mono text-xs">{log.requestId}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">变更详情</span>
              <AuditDiffList
                before={log.beforeState}
                after={log.afterState}
                changedFields={log.changedFields}
              />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
