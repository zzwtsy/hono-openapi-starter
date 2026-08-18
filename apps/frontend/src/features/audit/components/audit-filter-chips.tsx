import type { AuditFilterState } from "../lib/audit-filters";
import type { AuditAction } from "@/api/globals";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type FilterKey = "actions" | "status" | "actorKeyword" | "dateRange";

interface AuditFilterChipsProps {
  actions: readonly AuditAction[];
  filters: AuditFilterState;
  onClear: (key: FilterKey) => void;
}

const chipDateFormatter = new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" });

function formatDateRange(from: string | undefined, to: string | undefined): string {
  if (from == null) {
    return "时间范围";
  }
  const fromLabel = chipDateFormatter.format(new Date(from));
  if (to == null) {
    return `${fromLabel} 起`;
  }
  return `${fromLabel} - ${chipDateFormatter.format(new Date(to))}`;
}

export function AuditFilterChips({ actions, filters, onClear }: AuditFilterChipsProps) {
  const actionLabels = filters.actions?.map(action => actions.find(item => item.action === action)?.label ?? "未知操作") ?? [];
  const chips: Array<{ key: FilterKey; label: string }> = [];
  if (actionLabels.length > 0) {
    chips.push({ key: "actions", label: actionLabels.length === 1 ? actionLabels[0] ?? "操作" : `操作 ${actionLabels.length} 项` });
  }
  if (filters.status != null) {
    chips.push({ key: "status", label: filters.status === "failure" ? "结果：失败" : "结果：成功" });
  }
  if (filters.actorKeyword != null && filters.actorKeyword.trim() !== "") {
    chips.push({ key: "actorKeyword", label: `操作人：${filters.actorKeyword.trim()}` });
  }
  if (filters.from != null || filters.to != null) {
    chips.push({ key: "dateRange", label: formatDateRange(filters.from, filters.to) });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2" aria-label="已应用筛选">
      {chips.map(chip => (
        <Badge
          key={chip.key}
          variant="outline"
          render={<button type="button" aria-label={`清除筛选：${chip.label}`} onClick={() => onClear(chip.key)} />}
        >
          {chip.label}
          <X data-icon="inline-end" aria-hidden="true" />
        </Badge>
      ))}
    </div>
  );
}
