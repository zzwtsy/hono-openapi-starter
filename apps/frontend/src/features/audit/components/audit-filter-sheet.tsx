import type { AuditFilterState } from "../lib/audit-filters";
import type { AuditAction } from "@/api/globals";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { countActiveFilterGroups } from "../lib/audit-filters";
import { AuditLogFilters } from "./audit-log-filters";

interface AuditFilterSheetProps {
  open: boolean;
  actions: readonly AuditAction[];
  draft: AuditFilterState;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: AuditFilterState) => void;
  onApply: () => void;
}

export function AuditFilterSheet({ open, actions, draft, onOpenChange, onDraftChange, onApply }: AuditFilterSheetProps) {
  const count = countActiveFilterGroups(draft);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>筛选操作日志</SheetTitle>
          <SheetDescription>选择条件后一次应用，关闭不会改变当前结果。</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          <AuditLogFilters
            layout="stacked"
            showReset={false}
            actions={actions}
            selectedActions={draft.actions ?? []}
            status={draft.status}
            actorKeyword={draft.actorKeyword ?? ""}
            from={draft.from}
            to={draft.to}
            onActionsChange={values => onDraftChange({ ...draft, actions: values.length > 0 ? values : undefined })}
            onStatusChange={status => onDraftChange({ ...draft, status })}
            onActorKeywordChange={actorKeyword => onDraftChange({ ...draft, actorKeyword })}
            onActorKeywordClear={() => onDraftChange({ ...draft, actorKeyword: undefined })}
            onRangeChange={(from, to) => onDraftChange({ ...draft, from, to })}
            onReset={() => onDraftChange({})}
          />
        </div>
        <SheetFooter className="border-t">
          <Button
            type="button"
            variant="outline"
            disabled={count === 0}
            onClick={() => onDraftChange({})}
          >
            清空条件
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="button" className="flex-1" onClick={onApply}>
              应用筛选
              {count > 0 ? `（${count}）` : ""}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
