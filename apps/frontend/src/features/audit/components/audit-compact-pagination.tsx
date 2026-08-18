import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuditCompactPaginationProps {
  page: number;
  pageCount: number;
  rowCount: number;
  onPageChange: (page: number) => void;
}

export function AuditCompactPagination({ page, pageCount, rowCount, onPageChange }: AuditCompactPaginationProps) {
  const effectivePageCount = Math.max(1, pageCount);
  const effectivePage = Math.min(Math.max(1, page), effectivePageCount);
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground" aria-live="polite">
        共
        {" "}
        {rowCount}
        {" "}
        条 · 第
        {" "}
        {effectivePage}
        /
        {effectivePageCount}
        {" "}
        页
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="上一页"
          disabled={rowCount === 0 || effectivePage === 1}
          onClick={() => onPageChange(effectivePage - 1)}
        >
          <ChevronLeft />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="下一页"
          disabled={rowCount === 0 || effectivePage === effectivePageCount}
          onClick={() => onPageChange(effectivePage + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
