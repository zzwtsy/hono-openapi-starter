import type { AuditLog } from "@/api/globals";
import { History } from "lucide-react";
import { useState } from "react";
import { AsyncListState } from "@/components/shared/async-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuditActions } from "../hooks/use-audit-actions";
import { useAuditLogs } from "../hooks/use-audit-logs";
import { formatAuditTime, formatResourceRefs, getActionLabel } from "../lib/format-diff";
import { AuditLogDetailSheet } from "./audit-log-detail-sheet";

import { AuditLogFilters } from "./audit-log-filters";

export function AuditLogTable() {
  const actions = useAuditActions();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{
    action?: string;
    status?: "success" | "failure";
    actorUserId?: string;
  }>({});
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, loading, error, send } = useAuditLogs({ page, pageSize: 25, ...filters });

  const handleRowClick = (log: AuditLog) => {
    setSelected(log);
    setSheetOpen(true);
  };

  const handleReset = () => {
    setFilters({});
    setPage(1);
    void send();
  };

  return (
    <div className="flex flex-col gap-3">
      <AuditLogFilters
        action={filters.action}
        status={filters.status}
        actorUserId={filters.actorUserId}
        onActionChange={(v) => {
          setFilters(f => ({ ...f, action: v }));
          setPage(1);
        }}
        onStatusChange={(v) => {
          setFilters(f => ({ ...f, status: v }));
          setPage(1);
        }}
        onActorChange={(v) => {
          setFilters(f => ({ ...f, actorUserId: v }));
          setPage(1);
        }}
        onReset={handleReset}
      />

      <AsyncListState loading={loading} error={error} data={data?.items} onRetry={() => { void send(); }} errorDescription="无法获取审计日志。" loadingFallback={<Skeleton className="h-64 w-full" />}>
        {data != null && data.items.length === 0
          ? (
              <Empty>
                <EmptyMedia variant="icon"><History /></EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>暂无日志</EmptyTitle>
                  <EmptyDescription>没有符合条件的审计记录。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )
          : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">时间</TableHead>
                    <TableHead className="w-28">操作</TableHead>
                    <TableHead className="w-32">操作人</TableHead>
                    <TableHead>资源</TableHead>
                    <TableHead className="w-20">结果</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.items.map(log => (
                    <TableRow key={log.id} className="cursor-pointer" onClick={() => { handleRowClick(log); }}>
                      <TableCell className="text-xs text-muted-foreground">{formatAuditTime(log.occurredAt)}</TableCell>
                      <TableCell className="text-sm">{getActionLabel(log.action, actions)}</TableCell>
                      <TableCell className="text-xs">{log.actorUserId ?? "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatResourceRefs(log.resourceRefs)}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === "failure" ? "destructive" : "secondary"}>
                          {log.status === "failure" ? "失败" : "成功"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
      </AsyncListState>

      {data != null && data.meta.total > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            第
            {" "}
            {page}
            /
            {data.meta.totalPages}
            {" "}
            页，共
            {" "}
            {data.meta.total}
            {" "}
            条
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage(p => p - 1); }}>
              上一页
            </Button>
            <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => { setPage(p => p + 1); }}>
              下一页
            </Button>
          </div>
        </div>
      )}

      <AuditLogDetailSheet log={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
