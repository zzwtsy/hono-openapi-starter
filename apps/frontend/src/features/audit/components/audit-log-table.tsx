import type { AuditSearch } from "../lib/audit-search";
import type { AuditLog } from "@/api/globals";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuditActions } from "../hooks/use-audit-actions";
import { useAuditLogs } from "../hooks/use-audit-logs";
import { hasActiveFilters } from "../lib/audit-filters";
import { AuditLogDataTable } from "./audit-log-data-table";
import { AuditLogDetailSheet } from "./audit-log-detail-sheet";
import { AuditLogFilters } from "./audit-log-filters";

interface AuditLogTableProps {
  /** URL search 状态(route 层注入,边界:features 不依赖 routes)。 */
  search: AuditSearch;
  /** 更新筛选/分页(route 层实现 navigate replace + 非分页变更重置 page)。 */
  onSearchChange: (patch: Partial<AuditSearch>) => void;
}

export function AuditLogTable({ search, onSearchChange }: AuditLogTableProps) {
  const actions = useAuditActions();
  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? 25;
  const filters = {
    actions: search.actions,
    status: search.status,
    actorKeyword: search.actorKeyword,
    from: search.from,
    to: search.to,
  };
  const filtered = hasActiveFilters(filters);

  // actorKeyword 文本输入:本地 state 即时响应 + 250ms 防抖写 URL。
  const [keyword, setKeyword] = useState(search.actorKeyword ?? "");
  const navigateTimerRef = useRef<number | undefined>(undefined);
  const clearKeywordDebounce = useCallback(() => {
    if (navigateTimerRef.current !== undefined) {
      window.clearTimeout(navigateTimerRef.current);
      navigateTimerRef.current = undefined;
    }
  }, []);

  /* eslint-disable react/set-state-in-effect */
  useEffect(() => {
    clearKeywordDebounce();
    setKeyword(search.actorKeyword ?? "");
  }, [clearKeywordDebounce, search.actorKeyword]);
  /* eslint-enable react/set-state-in-effect */
  useEffect(() => clearKeywordDebounce, [clearKeywordDebounce]);

  const onKeywordChange = (value: string) => {
    setKeyword(value);
    clearKeywordDebounce();
    const trimmed = value.trim();
    navigateTimerRef.current = window.setTimeout(() => {
      onSearchChange({ actorKeyword: trimmed !== "" ? trimmed : undefined });
    }, 250);
  };

  const { data, loading, error, send } = useAuditLogs({
    page,
    pageSize,
    actions: filters.actions,
    status: filters.status,
    actorKeyword: filters.actorKeyword,
    from: filters.from,
    to: filters.to,
  });

  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleRowClick = (log: AuditLog) => {
    setSelected(log);
    setSheetOpen(true);
  };
  const handleReset = () => {
    clearKeywordDebounce();
    setKeyword("");
    onSearchChange({ actions: undefined, status: undefined, actorKeyword: undefined, from: undefined, to: undefined });
  };
  const handleKeywordClear = () => {
    clearKeywordDebounce();
    setKeyword("");
    onSearchChange({ actorKeyword: undefined });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <AuditLogDataTable
        actions={actions}
        data={data}
        loading={loading}
        error={error}
        page={page}
        pageSize={pageSize}
        filtered={filtered}
        selectedId={selected?.id}
        toolbar={(
          <AuditLogFilters
            actions={actions}
            selectedActions={filters.actions ?? []}
            status={filters.status}
            actorKeyword={keyword}
            from={filters.from}
            to={filters.to}
            onActionsChange={values => onSearchChange({ actions: values.length > 0 ? values : undefined })}
            onStatusChange={value => onSearchChange({ status: value })}
            onActorKeywordChange={onKeywordChange}
            onActorKeywordClear={handleKeywordClear}
            onRangeChange={(from, to) => onSearchChange({ from, to })}
            onReset={handleReset}
          />
        )}
        onRefresh={() => { void send(); }}
        onRetry={() => { void send(); }}
        onRowSelect={handleRowClick}
        onPageChange={nextPage => onSearchChange({ page: nextPage })}
        onPageSizeChange={nextPageSize => onSearchChange({ page: 1, pageSize: nextPageSize })}
      />

      <AuditLogDetailSheet log={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
