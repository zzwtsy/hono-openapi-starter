import type { AuditAction } from "@/api/globals";
import type { TimeRangePreset } from "@/components/shared/date-range-picker";
import { RotateCcw, Search, X } from "lucide-react";
import { useMemo } from "react";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { Button } from "@/components/ui/button";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxTrigger } from "@/components/ui/combobox";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { presetToRange, TIME_PRESETS } from "../lib/audit-filters";

const AUDIT_TIME_PRESETS: TimeRangePreset[] = TIME_PRESETS.map(preset => ({
  key: preset.key,
  label: preset.label,
  resolveFrom: () => presetToRange(preset.key).from,
}));
const FILTER_LAYOUT_CLASSES = {
  inline: { root: "flex-wrap items-center", action: "w-48", status: "w-32", date: undefined, actor: "w-44" },
  stacked: { root: "flex-col items-stretch", action: "w-full", status: "w-full", date: "w-full", actor: "w-full" },
} as const;

interface AuditLogFiltersProps {
  actions: readonly AuditAction[];
  selectedActions: readonly string[];
  status: "success" | "failure" | undefined;
  /** actorKeyword 输入受控在表格层(本地 state + 防抖写 URL),此处纯展示。 */
  actorKeyword: string;
  /** from/to 为 ISO 字符串(与 URL search 一致),由 DateRangePicker 内部转显示与边界。 */
  from: string | undefined;
  to: string | undefined;
  onActionsChange: (values: string[]) => void;
  onStatusChange: (v: "success" | "failure" | undefined) => void;
  onActorKeywordChange: (v: string) => void;
  onActorKeywordClear: () => void;
  /** 时间范围变化(预设/日历/清除统一入口),输出 ISO。 */
  onRangeChange: (from: string | undefined, to: string | undefined) => void;
  onReset: () => void;
  layout?: "inline" | "stacked";
  showReset?: boolean;
}

function hasResettableFilter(selectedActions: readonly string[], status: string | undefined, actorKeyword: string, from: string | undefined, to: string | undefined): boolean {
  return [selectedActions.length > 0, status != null, actorKeyword.trim() !== "", from != null, to != null].includes(true);
}

function normalizeStatus(value: string | null): "success" | "failure" | undefined {
  return value === "success" || value === "failure" ? value : undefined;
}

/** 筛选条:操作 + 结果 + 操作人 + 时间范围 + 重置(预设与日历收进 DateRangePicker)。 */
export function AuditLogFilters({
  actions,
  selectedActions,
  status,
  actorKeyword,
  from,
  to,
  onActionsChange,
  onStatusChange,
  onActorKeywordChange,
  onActorKeywordClear,
  onRangeChange,
  onReset,
  layout = "inline",
  showReset = true,
}: AuditLogFiltersProps) {
  const actionItems = useMemo<AuditAction[]>(() => {
    const knownActions = new Set(actions.map(item => item.action));
    const unknownActions = selectedActions
      .filter(action => !knownActions.has(action))
      .map(action => ({ action, label: "未知操作" }));
    return [...unknownActions, ...actions];
  }, [actions, selectedActions]);
  const selectedActionItems = useMemo(() => {
    const itemByAction = new Map(actionItems.map(item => [item.action, item]));
    return selectedActions.flatMap((action) => {
      const item = itemByAction.get(action);
      return item == null ? [] : [item];
    });
  }, [actionItems, selectedActions]);
  let actionSummary = "全部操作";
  if (selectedActionItems.length === 1) {
    actionSummary = selectedActionItems[0]?.label ?? actionSummary;
  } else if (selectedActionItems.length > 1) {
    actionSummary = `已选 ${selectedActionItems.length} 项`;
  }
  const canReset = hasResettableFilter(selectedActions, status, actorKeyword, from, to);
  const layoutClasses = FILTER_LAYOUT_CLASSES[layout];

  // Base UI Select 的 items prop 让 Value 按 label 渲染(Base UI 与 Radix 的差异,见 shadcn #9753)
  const statusItems = [
    { value: "all", label: "全部结果" },
    { value: "success", label: "成功" },
    { value: "failure", label: "失败" },
  ];

  return (
    <div className={cn("flex gap-2", layoutClasses.root)}>
      <Combobox<AuditAction, true>
        items={actionItems}
        multiple
        value={selectedActionItems}
        onValueChange={(items: AuditAction[]) => onActionsChange(items.map(item => item.action))}
        itemToStringLabel={(item: AuditAction) => item.label}
        itemToStringValue={(item: AuditAction) => item.action}
        isItemEqualToValue={(item: AuditAction, value: AuditAction) => item.action === value.action}
        filter={(item: AuditAction, query: string) => `${item.label} ${item.action}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())}
        autoHighlight
        name="actions"
        autoComplete="off"
      >
        <ComboboxTrigger
          aria-label="操作筛选"
          render={<Button type="button" variant="outline" />}
          className={cn("justify-between font-normal", layoutClasses.action)}
        >
          <span className="min-w-0 flex-1 truncate text-left">{actionSummary}</span>
        </ComboboxTrigger>
        <ComboboxContent className="w-64">
          <ComboboxInput
            aria-label="搜索操作"
            placeholder="搜索操作…"
            showTrigger={false}
          />
          <ComboboxEmpty>未找到操作</ComboboxEmpty>
          <ComboboxList>
            {(item: AuditAction) => (
              <ComboboxItem key={item.action} value={item}>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <Select
        items={statusItems}
        value={status ?? "all"}
        onValueChange={v => onStatusChange(normalizeStatus(v))}
      >
        <SelectTrigger aria-label="结果筛选" className={layoutClasses.status}><SelectValue /></SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false}>
          <SelectGroup>
            {statusItems.map(item => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <DateRangePicker
        from={from}
        to={to}
        presets={AUDIT_TIME_PRESETS}
        onRangeChange={onRangeChange}
        className={layoutClasses.date}
      />
      <InputGroup className={layoutClasses.actor}>
        <InputGroupInput
          aria-label="操作人姓名"
          name="actorKeyword"
          autoComplete="off"
          placeholder="操作人姓名…"
          value={actorKeyword}
          onChange={event => onActorKeywordChange(event.target.value)}
        />
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
        {actorKeyword !== "" && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="icon-xs" aria-label="清除操作人筛选" onClick={onActorKeywordClear}>
              <X aria-hidden="true" />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
      {showReset && canReset && (
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw data-icon="inline-start" aria-hidden="true" />
          重置
        </Button>
      )}
    </div>
  );
}
