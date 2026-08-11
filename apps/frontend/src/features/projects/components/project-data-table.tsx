import type { PaginationState } from "@tanstack/react-table";
import type { Project } from "@/api/globals";
import type { DataTableColumnSetting } from "@/components/shared/data-table/data-table-column-settings";
import type { DataTableColumnMeta } from "@/lib/data-table/table";
import { flexRender } from "@tanstack/react-table";
import { FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AsyncListState } from "@/components/shared/async-list";
import { DataTableColumnSettings } from "@/components/shared/data-table/data-table-column-settings";
import { DataTableFooter, DataTableFrame, DataTableHeader, DataTableToolbar, DataTableViewport } from "@/components/shared/data-table/data-table-frame";
import { DataTablePagination } from "@/components/shared/data-table/data-table-pagination";
import { useColumnPreferences } from "@/components/shared/data-table/use-column-preferences";
import { ResourceActions } from "@/components/shared/resource-actions";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { resolveUpdater } from "@/lib/data-table/column-preferences";
import { createAppColumnHelper, useAppTable } from "@/lib/data-table/table";
import { formatDate } from "@/lib/utils";

const EMPTY_PROJECTS: Project[] = [];
const PROJECT_PAGE_SIZES = [10, 25, 50] as const;
const projectColumnHelper = createAppColumnHelper<Project>();
const PROJECT_COLUMN_META: Record<string, DataTableColumnMeta> = {
  name: { label: "名称", cellClassName: "font-medium" },
  description: { label: "描述", cellClassName: "text-muted-foreground" },
  orgId: { label: "组织", cellClassName: "text-muted-foreground" },
  createdAt: { label: "创建时间", cellClassName: "text-muted-foreground" },
  actions: { label: "操作", configurable: false, headerClassName: "text-right", cellClassName: "text-right" },
};

interface ProjectDataTableProps {
  data: Project[] | undefined;
  loading: boolean;
  error: unknown;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onRetry: () => void;
  onCreate: () => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

function createProjectColumns(canUpdate: boolean, canDelete: boolean, onEdit: (project: Project) => void, onDelete: (project: Project) => void) {
  const baseColumns = projectColumnHelper.columns([
    projectColumnHelper.accessor("name", {
      id: "name",
      header: PROJECT_COLUMN_META.name.label,
      meta: PROJECT_COLUMN_META.name,
    }),
    projectColumnHelper.accessor("description", {
      id: "description",
      header: PROJECT_COLUMN_META.description.label,
      meta: PROJECT_COLUMN_META.description,
      cell: info => info.getValue() ?? "-",
    }),
    projectColumnHelper.accessor("orgId", {
      id: "orgId",
      header: PROJECT_COLUMN_META.orgId.label,
      meta: PROJECT_COLUMN_META.orgId,
    }),
    projectColumnHelper.accessor("createdAt", {
      id: "createdAt",
      header: PROJECT_COLUMN_META.createdAt.label,
      meta: PROJECT_COLUMN_META.createdAt,
      cell: info => formatDate(info.getValue()),
    }),
  ]);

  if (!canUpdate && !canDelete) {
    return baseColumns;
  }

  return projectColumnHelper.columns([
    ...baseColumns,
    projectColumnHelper.display({
      id: "actions",
      header: PROJECT_COLUMN_META.actions.label,
      meta: PROJECT_COLUMN_META.actions,
      cell: info => (
        <ResourceActions
          items={[
            { id: "edit", allowed: canUpdate, label: "编辑", icon: Pencil, onClick: () => { onEdit(info.row.original); } },
            { id: "delete", allowed: canDelete, label: "删除", icon: Trash2, variant: "destructive", onClick: () => { onDelete(info.row.original); } },
          ]}
        />
      ),
    }),
  ]);
}

function toColumnSettings(columns: ReturnType<typeof createProjectColumns>, hidden: readonly string[]): DataTableColumnSetting[] {
  return columns.flatMap((column) => {
    const id = String(column.id);
    const meta = column.meta ?? PROJECT_COLUMN_META[id];
    return meta?.configurable === false ? [] : [{ id, label: meta?.label ?? id, visible: !hidden.includes(id), canHide: true }];
  });
}

export function ProjectDataTable({ data, loading, error, canCreate, canUpdate, canDelete, onRetry, onCreate, onEdit, onDelete }: ProjectDataTableProps) {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const columns = useMemo(() => createProjectColumns(canUpdate, canDelete, onEdit, onDelete), [canDelete, canUpdate, onDelete, onEdit]);
  const columnIds = useMemo(() => columns.map(column => String(column.id)), [columns]);
  const fixedEndIds = useMemo(() => columns.some(column => column.id === "actions") ? ["actions"] : [], [columns]);
  const columnPreferences = useColumnPreferences({
    tableId: "projects",
    columnIds,
    defaultOrder: columnIds,
    hideableIds: columnIds.filter(id => id !== "actions"),
    fixedEndIds,
  });
  const table = useAppTable({
    columns,
    data: data ?? EMPTY_PROJECTS,
    state: { columnOrder: columnPreferences.preferences.order, columnVisibility: columnPreferences.visibility, pagination },
    onColumnOrderChange: updater => columnPreferences.update(current => ({ ...current, order: resolveUpdater(updater, current.order) })),
    onColumnVisibilityChange: updater => columnPreferences.update(current => ({
      ...current,
      hidden: Object.entries(resolveUpdater(updater, columnPreferences.visibility)).filter(([, visible]) => !visible).map(([id]) => id),
    })),
    onPaginationChange: setPagination,
  });
  const columnSettings = useMemo(() => toColumnSettings(columns, columnPreferences.preferences.hidden), [columns, columnPreferences.preferences.hidden]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AsyncListState
        loading={loading}
        error={error}
        data={data}
        onRetry={onRetry}
        errorDescription="无法获取项目列表。"
        loadingFallback={<div className="flex min-h-0 flex-1 items-center justify-center"><Skeleton className="h-64 w-full" /></div>}
      >
        <DataTableFrame>
          <DataTableToolbar>
            <DataTableColumnSettings
              columns={columnSettings}
              order={columnPreferences.preferences.order}
              onToggle={columnPreferences.setVisibility}
              onMove={columnPreferences.setOrder}
              onReset={columnPreferences.reset}
            />
            {canCreate && (
              <Button type="button" onClick={onCreate}>
                <Plus data-icon="inline-start" />
                新建项目
              </Button>
            )}
          </DataTableToolbar>
          <DataTableViewport>
            {data?.length === 0
              ? (
                  <div className="flex min-h-full items-center justify-center p-6">
                    <Empty>
                      <EmptyMedia variant="icon"><FolderKanban /></EmptyMedia>
                      <EmptyHeader>
                        <EmptyTitle>暂无项目</EmptyTitle>
                        <EmptyDescription>当前组织下还没有项目。</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </div>
                )
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
                        <TableRow key={row.id}>
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
        </DataTableFrame>
      </AsyncListState>
      <DataTableFooter>
        <DataTablePagination
          page={pagination.pageIndex + 1}
          pageSize={pagination.pageSize}
          pageCount={table.getPageCount()}
          rowCount={data?.length ?? 0}
          pageSizeOptions={PROJECT_PAGE_SIZES}
          onPageChange={page => table.setPageIndex(page - 1)}
          onPageSizeChange={pageSize => table.setPagination({ pageIndex: 0, pageSize })}
        />
      </DataTableFooter>
    </div>
  );
}
