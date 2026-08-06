import type { AuditSearch } from "../lib/audit-search";
import type { FilterKey } from "./audit-filter-chips";
import type { AuditLog } from "@/api/globals";
import { useCallback, useEffect, useRef, useState } from "react";
import { AsyncListState } from "@/components/shared/async-list";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuditActions } from "../hooks/use-audit-actions";
import { useAuditLogs } from "../hooks/use-audit-logs";
import { deriveActiveFilters, hasActiveFilters } from "../lib/audit-filters";
import { formatActorName, formatAuditTime, formatResourceRefs, getActionLabel } from "../lib/format-diff";
import { AuditEmptyState, FilterChipsRow } from "./audit-filter-chips";
import { AuditLogDetailSheet } from "./audit-log-detail-sheet";
import { AuditLogFilters } from "./audit-log-filters";

/** 页码窗口半径(当前页前后各 2 页)。 */
const PAGE_WINDOW = 2;

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
    action: search.action,
    status: search.status,
    actorKeyword: search.actorKeyword,
    from: search.from,
    to: search.to,
  };
  const activeChips = deriveActiveFilters(filters, actions);
  const filtered = hasActiveFilters(filters);

  // actorKeyword 文本输入:本地 state 即时响应 + 250ms 防抖写 URL
  // (受控输入直接绑 search 会每击键触发 router 重算导致卡顿,见 stage3 调研)
  const [keyword, setKeyword] = useState(search.actorKeyword ?? "");
  const navigateTimerRef = useRef<number | undefined>(undefined);
  const clearKeywordDebounce = useCallback(() => {
    if (navigateTimerRef.current !== undefined) {
      window.clearTimeout(navigateTimerRef.current);
      navigateTimerRef.current = undefined;
    }
  }, []);

  // URL 外部变化(返回键/分享链接):回同步输入并取消 pending 防抖,防 stale 覆盖。
  // set-state-in-effect 是受控输入与 URL 双向同步模式的必要部分,豁免规则。
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

  // 日期筛选值已由 filters 层转 ISO,直接透传
  const { data, loading, error, send } = useAuditLogs({
    page,
    pageSize,
    action: filters.action,
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
    onSearchChange({ action: undefined, status: undefined, actorKeyword: undefined, from: undefined, to: undefined });
  };

  const removeChip = (key: FilterKey) => {
    if (key === "actorKeyword") {
      clearKeywordDebounce();
      setKeyword("");
    }
    onSearchChange({ [key]: undefined });
  };

  return (
    <div className="flex flex-col gap-3">
      <AuditLogFilters
        action={filters.action}
        status={filters.status}
        actorKeyword={keyword}
        from={filters.from}
        to={filters.to}
        onActionChange={v => onSearchChange({ action: v })}
        onStatusChange={v => onSearchChange({ status: v })}
        onActorKeywordChange={onKeywordChange}
        onRangeChange={(from, to) => onSearchChange({ from, to })}
        onReset={handleReset}
      />

      <FilterChipsRow chips={activeChips} total={data?.meta.total} onRemove={removeChip} onClearAll={handleReset} />

      <AsyncListState loading={loading} error={error} data={data?.items} onRetry={() => { void send(); }} errorDescription="无法获取审计日志。" loadingFallback={<Skeleton className="h-64 w-full" />}>
        {data != null && data.items.length === 0
          ? <AuditEmptyState filtered={filtered} />
          : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-36">时间(本地)</TableHead>
                    <TableHead className="w-28">操作</TableHead>
                    <TableHead className="w-32">操作人</TableHead>
                    <TableHead>资源</TableHead>
                    <TableHead className="w-20">结果</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.items.map(log => (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer"
                      role="button"
                      tabIndex={0}
                      aria-current={selected?.id === log.id ? "true" : undefined}
                      data-selected={selected?.id === log.id || undefined}
                      onClick={() => { handleRowClick(log); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleRowClick(log);
                        }
                      }}
                    >
                      <TableCell className="text-xs text-muted-foreground tabular-nums">{formatAuditTime(log.occurredAt)}</TableCell>
                      <TableCell className="text-sm">{getActionLabel(log.action, actions)}</TableCell>
                      <TableCell className="text-xs">{formatActorName(log)}</TableCell>
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
        <PaginationBar
          page={page}
          pageSize={pageSize}
          totalPages={data.meta.totalPages}
          onPageChange={p => onSearchChange({ page: p })}
          onPageSizeChange={s => onSearchChange({ pageSize: s })}
        />
      )}

      <AuditLogDetailSheet log={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}

/** 分页器 + 每页条数(shadcn 结构:nav 地标 + aria-current 激活页 + Ellipsis)。 */
function PaginationBar({ page, pageSize, totalPages, onPageChange, onPageSizeChange }: {
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  // 页码窗口:1 … (page-window..page+window) … totalPages
  const windowStart = Math.max(2, page - PAGE_WINDOW);
  const windowEnd = Math.min(totalPages - 1, page + PAGE_WINDOW);
  const showStartEllipsis = windowStart > 2;
  const showEndEllipsis = windowEnd < totalPages - 1;
  const windowPages = windowStart <= windowEnd
    ? Array.from({ length: windowEnd - windowStart + 1 }, (_, i) => windowStart + i)
    : [];

  const PAGE_SIZES = [25, 50, 100] as const;
  const pageSizeItems = PAGE_SIZES.map(n => ({ value: String(n), label: `${n} 条/页` }));

  const go = (target: number) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onPageChange(target);
  };

  return (
    <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              text="上一页"
              aria-label="上一页"
              href={`?page=${Math.max(1, page - 1)}`}
              onClick={go(Math.max(1, page - 1))}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="?page=1" isActive={page === 1} onClick={go(1)}>
              1
            </PaginationLink>
          </PaginationItem>
          {showStartEllipsis && <PaginationItem><PaginationEllipsis /></PaginationItem>}
          {windowPages.map(n => (
            <PaginationItem key={n}>
              <PaginationLink href={`?page=${n}`} isActive={page === n} onClick={go(n)}>
                {n}
              </PaginationLink>
            </PaginationItem>
          ))}
          {showEndEllipsis && <PaginationItem><PaginationEllipsis /></PaginationItem>}
          {totalPages > 1 && (
            <PaginationItem>
              <PaginationLink href={`?page=${totalPages}`} isActive={page === totalPages} onClick={go(totalPages)}>
                {totalPages}
              </PaginationLink>
            </PaginationItem>
          )}
          <PaginationItem>
            <PaginationNext
              text="下一页"
              aria-label="下一页"
              href={`?page=${Math.min(totalPages, page + 1)}`}
              onClick={go(Math.min(totalPages, page + 1))}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
      <Select
        items={pageSizeItems}
        value={String(pageSize)}
        onValueChange={v => onPageSizeChange(Number(v))}
      >
        <SelectTrigger aria-label="每页条数" className="w-24"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {pageSizeItems.map(item => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
