import type { AuditAction, AuditLog, ResourceRef } from "@/api/globals";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatAuditSentence, formatAuditTime, getActionLabel } from "../lib/format-diff";
import { AuditDiffList } from "./audit-diff-list";

export interface AuditResourceNavigation {
  onNavigate: () => void;
}

interface AuditLogDetailSheetProps {
  log: AuditLog | null;
  actions: readonly AuditAction[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resolveResourceNavigation?: (resource: ResourceRef) => AuditResourceNavigation | undefined;
}

function ResourceLinks({ resources, resolveNavigation }: {
  resources: readonly ResourceRef[];
  resolveNavigation?: (resource: ResourceRef) => AuditResourceNavigation | undefined;
}) {
  if (resources.length === 0) {
    return <span>系统</span>;
  }
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-1">
      {resources.map((resource) => {
        const label = resource.name ?? resource.id;
        const navigation = resolveNavigation?.(resource);
        return navigation == null
          ? <span key={`${resource.type}-${resource.id}`}>{label}</span>
          : (
              <Button
                key={`${resource.type}-${resource.id}`}
                type="button"
                variant="link"
                className="h-auto p-0"
                onClick={navigation.onNavigate}
              >
                {label}
              </Button>
            );
      })}
    </div>
  );
}

export function AuditLogDetailSheet({ log, actions, open, onOpenChange, resolveResourceNavigation }: AuditLogDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-md flex-col gap-4 overflow-y-auto p-6 sm:max-w-lg">
        {log != null && (
          <>
            <SheetHeader className="p-0 pr-8">
              <SheetTitle className="flex flex-wrap items-center gap-2">
                <span>{getActionLabel(log.action, actions)}</span>
                <Badge variant={log.status === "failure" ? "destructive" : "secondary"}>
                  {log.status === "failure" ? "失败" : "成功"}
                </Badge>
              </SheetTitle>
              <SheetDescription>{formatAuditTime(log.occurredAt)}</SheetDescription>
            </SheetHeader>
            <p className="text-sm leading-relaxed">{formatAuditSentence(log, actions)}</p>
            <div className="flex flex-col gap-2 text-sm">
              <span className="font-medium">关联对象</span>
              <ResourceLinks resources={log.resourceRefs} resolveNavigation={resolveResourceNavigation} />
            </div>
            <Separator />
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">业务变更</span>
              <AuditDiffList
                before={log.beforeState}
                after={log.afterState}
                changedFields={log.changedFields}
                showRawToggle={false}
              />
            </div>
            <Separator />
            <Collapsible className="flex flex-col gap-3">
              <CollapsibleTrigger render={<Button type="button" variant="ghost" className="justify-between" />}>
                技术详情
                <ChevronDown data-icon="inline-end" />
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-3">
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Action code</dt>
                  <dd className="break-all font-mono text-xs">{log.action}</dd>
                  <dt className="text-muted-foreground">IP</dt>
                  <dd className="break-all">{log.ipAddress ?? "—"}</dd>
                  <dt className="text-muted-foreground">Request ID</dt>
                  <dd className="break-all font-mono text-xs">{log.requestId ?? "—"}</dd>
                  <dt className="text-muted-foreground">User agent</dt>
                  <dd className="break-all text-xs">{log.userAgent ?? "—"}</dd>
                  <dt className="text-muted-foreground">入库时间</dt>
                  <dd>{formatAuditTime(log.recordedAt)}</dd>
                </dl>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">原始事件</span>
                  <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(log, null, 2)}
                  </pre>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
