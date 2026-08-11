import type { PaginationState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import type { AuditAction, AuditLog, AuditLogList } from "@/api/globals";
import type { DataTableColumnSetting } from "@/components/shared/data-table/data-table-column-settings";
import type { DataTableColumnMeta } from "@/lib/data-table/table";
import { flexRender } from "@tanstack/react-table";
import { RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { AsyncListState } from "@/components/shared/async-list";
import { DataTableColumnSettings } from "@/components/shared/data-table/data-table-column-settings";
import { DataTableFooter, DataTableFrame, DataTableHeader, DataTableToolbar, DataTableViewport } from "@/components/shared/data-table/data-table-frame";
import { DataTablePagination } from "@/components/shared/data-table/data-table-pagination";
import { useColumnPreferences } from "@/components/shared/data-table/use-column-preferences";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { resolveUpdater } from "@/lib/data-table/column-preferences";
import { createAppColumnHelper, useAppTable } from "@/lib/data-table/table";
import { formatActorName, formatAuditTime, formatResourceRefs, getActionLabel } from "../lib/format-diff";
import { AuditEmptyState } from "./audit-empty-state";

const EMPTY_AUDIT_LOGS: AuditLog[] = [];
const AUDIT_PAGE_SIZES = [25, 50, 100] as const;
const AUDIT_COLUMN_IDS = ["occurredAt", "action", "actor", "resource", "status"] as const;
const AUDIT_COLUMN_META: Record<(typeof AUDIT_COLUMN_IDS)[number], DataTableColumnMeta> = {
  occurredAt: { label: "时间(本地)", headerClassName: "w-36", cellClassName: "text-xs text-muted-foreground tabular-nums" },
  action: { label: "操作", headerClassName: "w-28", cellClassName: "text-sm" },
  actor: { label: "操作人", headerClassName: "w-32", cellClassName: "text-xs" },
  resource: { label: "资源", cellClassName: "text-xs text-muted-foreground" },
  status: { label: "结果", headerClassName: "w-20" },
};
const auditColumnHelper = createAppColumnHelper<AuditLog>();

interface AuditLogDataTableProps {
  actions: readonly AuditAction[];
  data: AuditLogList | undefined;
  loading: boolean;
  error: unknown;
  page: number;
  pageSize: number;
  filtered: boolean;
  selectedId: string | undefined;
  toolbar: ReactNode;
  onRefresh: () => void;
  onRetry: () => void;
  onRowSelect: (log: AuditLog) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

function createAuditColumns(actions: readonly AuditAction[]) {
  return auditColumnHelper.columns([
    auditColumnHelper.accessor("occurredAt", {
      id: "occurredAt",
      header: AUDIT_COLUMN_META.occurredAt.label,
      meta: AUDIT_COLUMN_META.occurredAt,
      cell: info => formatAuditTime(info.getValue()),
    }),
    auditColumnHelper.accessor("action", {
      id: "action",
      header: AUDIT_COLUMN_META.action.label,
      meta: AUDIT_COLUMN_META.action,
      cell: info => getActionLabel(info.getValue(), actions),
    }),
    auditColumnHelper.display({
      id: "actor",
      header: AUDIT_COLUMN_META.actor.label,
      meta: AUDIT_COLUMN_META.actor,
      cell: info => formatActorName(info.row.original),
    }),
    auditColumnHelper.display({
      id: "resource",
      header: AUDIT_COLUMN_META.resource.label,
      meta: AUDIT_COLUMN_META.resource,
      cell: info => formatResourceRefs(info.row.original.resourceRefs),
    }),
    auditColumnHelper.accessor("status", {
      id: "status",
      header: AUDIT_COLUMN_META.status.label,
      meta: AUDIT_COLUMN_META.status,
      cell: info => (
        <Badge variant={info.getValue() === "failure" ? "destructive" : "secondary"}>
          {info.getValue() === "failure" ? "失败" : "成功"}
        </Badge>
      ),
    }),
  ]);
}

function toColumnSettings(hidden: readonly string[]): DataTableColumnSetting[] {
  return AUDIT_COLUMN_IDS.map((id) => {
    const meta = AUDIT_COLUMN_META[id];
    return { id, label: meta.label, visible: !hidden.includes(id), canHide: true };
  });
}

export function AuditLogDataTable({ actions, data, loading, error, page, pageSize, filtered, selectedId, toolbar, onRefresh, onRetry, onRowSelect, onPageChange, onPageSizeChange }: AuditLogDataTableProps) {
  const columns = useMemo(() => createAuditColumns(actions), [actions]);
  const rows = data?.items ?? EMPTY_AUDIT_LOGS;
  const pagination = useMemo<PaginationState>(() => ({ pageIndex: Math.max(0, page - 1), pageSize }), [page, pageSize]);
  const columnPreferences = useColumnPreferences({
    tableId: "audit-log",
    columnIds: AUDIT_COLUMN_IDS,
    defaultOrder: AUDIT_COLUMN_IDS,
    hideableIds: AUDIT_COLUMN_IDS,
  });
  const table = useAppTable({
    columns,
    data: rows,
    manualPagination: true,
    pageCount: data?.meta.totalPages ?? 0,
    rowCount: data?.meta.total ?? 0,
    state: { columnOrder: columnPreferences.preferences.order, columnVisibility: columnPreferences.visibility, pagination },
    onColumnOrderChange: updater => columnPreferences.update(current => ({ ...current, order: resolveUpdater(updater, current.order) })),
    onColumnVisibilityChange: updater => columnPreferences.update(current => ({
      ...current,
      hidden: Object.entries(resolveUpdater(updater, columnPreferences.visibility)).filter(([, visible]) => !visible).map(([id]) => id),
    })),
  });
  const columnSettings = useMemo(() => toColumnSettings(columnPreferences.preferences.hidden), [columnPreferences.preferences.hidden]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DataTableFrame>
        <DataTableToolbar className="justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{toolbar}</div>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={loading} aria-busy={loading} onClick={onRefresh}>
              {loading
                ? <Spinner data-icon="inline-start" aria-hidden="true" />
                : <RefreshCw data-icon="inline-start" aria-hidden="true" />}
              刷新
            </Button>
            <DataTableColumnSettings
              columns={columnSettings}
              order={columnPreferences.preferences.order}
              onToggle={columnPreferences.setVisibility}
              onMove={columnPreferences.setOrder}
              onReset={columnPreferences.reset}
            />
          </div>
        </DataTableToolbar>
        <AsyncListState
          loading={loading}
          error={error}
          data={data?.items}
          onRetry={onRetry}
          errorDescription="无法获取审计日志。"
          loadingFallback={<div className="flex min-h-0 flex-1 items-center justify-center"><Skeleton className="h-64 w-full" /></div>}
        >
          <DataTableViewport>
            {data != null && data.items.length === 0
              ? <div className="flex min-h-full items-center justify-center p-6"><AuditEmptyState filtered={filtered} /></div>
              : (
                  <Table className="min-w-max">
                    <DataTableHeader>
                      {table.getHeaderGroups().map(headerGroup => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => {
                            const meta = header.column.columnDef.meta;
                            return <TableHead key={header.id} colSpan={header.colSpan} className={meta?.headerClassName}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>;
                          })}
                        </TableRow>
                      ))}
                    </DataTableHeader>
                    <TableBody>
                      {table.getRowModel().rows.map(row => (
                        <TableRow
                          key={row.id}
                          className="cursor-pointer"
                          role="button"
                          tabIndex={0}
                          aria-current={selectedId === row.original.id ? "true" : undefined}
                          data-selected={selectedId === row.original.id || undefined}
                          onClick={() => { onRowSelect(row.original); }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onRowSelect(row.original);
                            }
                          }}
                        >
                          {row.getVisibleCells().map((cell) => {
                            const meta = cell.column.columnDef.meta;
                            return <TableCell key={cell.id} className={meta?.cellClassName}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>;
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
          </DataTableViewport>
        </AsyncListState>
      </DataTableFrame>
      <DataTableFooter>
        <DataTablePagination
          page={page}
          pageSize={pageSize}
          pageCount={data?.meta.totalPages ?? 0}
          rowCount={data?.meta.total ?? 0}
          pageSizeOptions={AUDIT_PAGE_SIZES}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </DataTableFooter>
    </div>
  );
}
