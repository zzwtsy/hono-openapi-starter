import type { AuditFilterState } from "../lib/audit-filters";
import type { AuditSearch } from "../lib/audit-search";
import type { AuditResourceNavigation } from "./audit-log-detail-sheet";
import type { AuditLog, ResourceRef } from "@/api/globals";
import { ListFilter } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuditActions } from "../hooks/use-audit-actions";
import { useAuditLogs } from "../hooks/use-audit-logs";
import { countActiveFilterGroups, hasActiveFilters } from "../lib/audit-filters";
import { AuditFilterChips } from "./audit-filter-chips";
import { AuditFilterSheet } from "./audit-filter-sheet";
import { AuditLogDataTable } from "./audit-log-data-table";
import { AuditLogDetailSheet } from "./audit-log-detail-sheet";
import { AuditLogFilters } from "./audit-log-filters";

interface AuditLogTableProps {
  /** URL search 状态(route 层注入,边界:features 不依赖 routes)。 */
  search: AuditSearch;
  /** 更新筛选/分页(route 层实现 navigate replace + 非分页变更重置 page)。 */
  onSearchChange: (patch: Partial<AuditSearch>) => void;
  resolveResourceNavigation?: (resource: ResourceRef) => AuditResourceNavigation | undefined;
}

function toAppliedFilterPatch(draft: AuditFilterState): Partial<AuditSearch> {
  const actorKeyword = draft.actorKeyword?.trim();
  return {
    actions: draft.actions == null ? undefined : [...draft.actions],
    status: draft.status,
    actorKeyword: actorKeyword == null || actorKeyword === "" ? undefined : actorKeyword,
    from: draft.from,
    to: draft.to,
  };
}

export function AuditLogTable({ search, onSearchChange, resolveResourceNavigation }: AuditLogTableProps) {
  const actions = useAuditActions();
  const isMobile = useIsMobile();
  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? 25;
  const filters: AuditFilterState = {
    actions: search.actions,
    status: search.status,
    actorKeyword: search.actorKeyword,
    from: search.from,
    to: search.to,
  };
  const filtered = hasActiveFilters(filters);
  const activeFilterCount = countActiveFilterGroups(filters);

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
    actions: filters.actions == null ? undefined : [...filters.actions],
    status: filters.status,
    actorKeyword: filters.actorKeyword,
    from: filters.from,
    to: filters.to,
  });

  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleRowClick = useCallback((log: AuditLog) => {
    setSelected(log);
    setSheetOpen(true);
  }, []);
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
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState<AuditFilterState>({});
  const openFilterSheet = () => {
    setFilterDraft(filters);
    setFilterSheetOpen(true);
  };
  const applyFilterDraft = () => {
    clearKeywordDebounce();
    setKeyword(filterDraft.actorKeyword ?? "");
    onSearchChange(toAppliedFilterPatch(filterDraft));
    setFilterSheetOpen(false);
  };
  const clearFilter = (key: "actions" | "status" | "actorKeyword" | "dateRange") => {
    if (key === "actions") {
      onSearchChange({ actions: undefined });
    } else if (key === "status") {
      onSearchChange({ status: undefined });
    } else if (key === "actorKeyword") {
      handleKeywordClear();
    } else {
      onSearchChange({ from: undefined, to: undefined });
    }
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
        isMobile={isMobile}
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
        mobileToolbar={(
          <Button type="button" variant="outline" size="sm" onClick={openFilterSheet}>
            <ListFilter data-icon="inline-start" />
            筛选
            {activeFilterCount > 0 ? `（${activeFilterCount}）` : ""}
          </Button>
        )}
        mobileFilters={<AuditFilterChips actions={actions} filters={filters} onClear={clearFilter} />}
        onRefresh={() => { void send(); }}
        onRetry={() => { void send(); }}
        onRowSelect={handleRowClick}
        onPageChange={nextPage => onSearchChange({ page: nextPage })}
        onPageSizeChange={nextPageSize => onSearchChange({ page: 1, pageSize: nextPageSize })}
      />

      <AuditLogDetailSheet
        log={selected}
        actions={actions}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        resolveResourceNavigation={resolveResourceNavigation}
      />
      <AuditFilterSheet
        open={filterSheetOpen}
        actions={actions}
        draft={filterDraft}
        onOpenChange={setFilterSheetOpen}
        onDraftChange={setFilterDraft}
        onApply={applyFilterDraft}
      />
    </div>
  );
}
