import { ChevronFirst, ChevronLast } from "lucide-react";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PAGE_WINDOW = 2;

type PageItem = number | "start-ellipsis" | "end-ellipsis";

interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  pageCount: number;
  rowCount: number;
  pageSizeOptions: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

function getPageItems(page: number, pageCount: number): PageItem[] {
  const windowStart = Math.max(2, page - PAGE_WINDOW);
  const windowEnd = Math.min(pageCount - 1, page + PAGE_WINDOW);
  const items: PageItem[] = [1];

  if (windowStart > 2) {
    items.push("start-ellipsis");
  }
  for (let pageNumber = windowStart; pageNumber <= windowEnd; pageNumber += 1) {
    items.push(pageNumber);
  }
  if (windowEnd < pageCount - 1) {
    items.push("end-ellipsis");
  }
  if (pageCount > 1) {
    items.push(pageCount);
  }

  return items;
}

interface PageNumberLinkProps {
  disabled: boolean;
  currentPage: number;
  page: number;
  onPageChange: (page: number) => void;
}

function PageNumberLink({ disabled, currentPage, page, onPageChange }: PageNumberLinkProps) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (!disabled && page !== currentPage) {
      onPageChange(page);
    }
  };

  return (
    <PaginationItem>
      <PaginationLink href={`?page=${page}`} isActive={!disabled && page === currentPage} aria-disabled={disabled} onClick={handleClick}>
        {page}
      </PaginationLink>
    </PaginationItem>
  );
}

interface PaginationNavigationProps {
  disabled: boolean;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

function PaginationNavigation({ disabled, page, pageCount, onPageChange }: PaginationNavigationProps) {
  const firstDisabled = disabled || page === 1;
  const lastDisabled = disabled || page === pageCount;
  const previousPage = Math.max(1, page - 1);
  const nextPage = Math.min(pageCount, page + 1);
  const go = (target: number) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (!disabled && target !== page) {
      onPageChange(target);
    }
  };

  return (
    <Pagination className="mx-0 w-auto">
      <PaginationContent>
        <PaginationItem>
          <PaginationLink href="?page=1" aria-label="第一页" aria-disabled={firstDisabled} tabIndex={firstDisabled ? -1 : undefined} size="icon" onClick={go(1)}>
            <ChevronFirst data-icon="inline-start" />
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationPrevious text="上一页" aria-label="上一页" href={`?page=${previousPage}`} aria-disabled={firstDisabled} tabIndex={firstDisabled ? -1 : undefined} onClick={go(previousPage)} />
        </PaginationItem>
        {getPageItems(page, pageCount).map(item => typeof item === "number"
          ? <PageNumberLink key={item} disabled={disabled} currentPage={page} page={item} onPageChange={onPageChange} />
          : <PaginationItem key={item}><PaginationEllipsis /></PaginationItem>)}
        <PaginationItem>
          <PaginationNext text="下一页" aria-label="下一页" href={`?page=${nextPage}`} aria-disabled={lastDisabled} tabIndex={lastDisabled ? -1 : undefined} onClick={go(nextPage)} />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href={`?page=${pageCount}`} aria-label="最后一页" aria-disabled={lastDisabled} tabIndex={lastDisabled ? -1 : undefined} size="icon" onClick={go(pageCount)}>
            <ChevronLast data-icon="inline-end" />
          </PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export function DataTablePagination({ page, pageSize, pageCount, rowCount, pageSizeOptions, onPageChange, onPageSizeChange }: DataTablePaginationProps) {
  const effectivePageCount = Math.max(1, pageCount);
  const effectivePage = Math.min(Math.max(1, page), effectivePageCount);
  const sizes = pageSizeOptions.map(size => ({ value: String(size), label: `${size} 条/页` }));
  const selectedPageSize = sizes.some(item => item.value === String(pageSize)) ? String(pageSize) : sizes[0]?.value;

  return (
    <div className="flex w-full flex-col items-center justify-between gap-2 sm:flex-row">
      <span className="shrink-0 text-xs text-muted-foreground" aria-live="polite">
        共
        {" "}
        {rowCount}
        {" "}
        条
      </span>
      <PaginationNavigation disabled={rowCount === 0} page={effectivePage} pageCount={effectivePageCount} onPageChange={onPageChange} />
      <Select
        items={sizes}
        value={selectedPageSize}
        onValueChange={value => onPageSizeChange(Number(value))}
      >
        <SelectTrigger aria-label="每页条数" className="w-24" disabled={pageSizeOptions.length === 0}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {sizes.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
