import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { zhCN } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

/** 审计筛选用快捷预设；时间边界在打开 Popover 时解析，避免长驻页面使用过期的 now。 */
export interface TimeRangePreset {
  key: string;
  label: string;
  resolveFrom: () => string;
}

interface ResolvedTimeRangePreset {
  key: string;
  label: string;
  from: string;
}

interface DateRangePickerProps {
  /** 已选 from(ISO,与 URL search 一致);undefined 表示未选。 */
  from?: string;
  /** 已选 to(ISO);undefined 表示无截止(预设「近 24 小时」或日历半选态)。 */
  to?: string;
  /** 快捷预设列表(「全部时间」由组件内置)。 */
  presets: readonly TimeRangePreset[];
  /** 范围变化统一出口；预设立即提交，自定义日历在点击“应用”后提交。 */
  onRangeChange: (from: string | undefined, to: string | undefined) => void;
  /** 仅控制触发按钮布局。 */
  className?: string;
}

const shortDateFormatter = new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" });
const fullDateFormatter = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });

function formatDate(date: Date, withYear = false) {
  return (withYear ? fullDateFormatter : shortDateFormatter).format(date).replaceAll("/", "-");
}

function toDateRange(from: string | undefined, to: string | undefined): DateRange | undefined {
  if (from == null) {
    return undefined;
  }
  return {
    from: new Date(from),
    to: to != null ? new Date(to) : undefined,
  };
}

function toIsoRange(range: DateRange): [string, string | undefined] {
  const from = range.from;
  if (from == null) {
    return ["", undefined];
  }
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0);
  const to = range.to;
  if (to == null) {
    return [start.toISOString(), undefined];
  }
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
  return [start.toISOString(), end.toISOString()];
}

function resolvePresets(presets: readonly TimeRangePreset[]): ResolvedTimeRangePreset[] {
  return presets.map(preset => ({ key: preset.key, label: preset.label, from: preset.resolveFrom() }));
}

function getRangeLabel(from: string | undefined, to: string | undefined, presets: ResolvedTimeRangePreset[]): string {
  const matchedPreset = to == null ? presets.find(preset => preset.from === from) : undefined;
  if (matchedPreset != null) {
    return matchedPreset.label;
  }
  if (from == null) {
    return "全部时间";
  }
  const fromDate = new Date(from);
  if (to == null) {
    return `${formatDate(fromDate)} 起`;
  }
  const toDate = new Date(to);
  if (fullDateFormatter.format(fromDate) === fullDateFormatter.format(toDate)) {
    return formatDate(fromDate);
  }
  if (fromDate.getFullYear() === toDate.getFullYear()) {
    return `${formatDate(fromDate)} ~ ${formatDate(toDate)}`;
  }
  return `${formatDate(fromDate, true)} ~ ${formatDate(toDate, true)}`;
}

function getPresetValue(range: DateRange | undefined, presets: ResolvedTimeRangePreset[]): string {
  if (range?.from == null) {
    return "all";
  }
  const matched = range.to == null
    ? presets.find(preset => preset.from === range.from?.toISOString())
    : undefined;
  return matched?.key ?? "custom";
}

function getCalendarStartMonth(range: DateRange | undefined, today: Date, isWide: boolean): Date {
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const selectedMonth = range?.from == null
    ? currentMonth
    : new Date(range.from.getFullYear(), range.from.getMonth(), 1);

  if (!isWide || selectedMonth < currentMonth) {
    return selectedMonth;
  }
  return new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
}

/**
 * 审计时间范围选择器：触发按钮 + Popover（预设 ToggleGroup + 响应式 range 日历）。
 * 结构依据 shadcn 官方示例 date-picker-with-range:
 * - 触发按钮 outline + justify-start + placeholder muted(官方 range 示例)
 * - PopoverContent 直接承载 Calendar，不再叠加 Select 与内层边框
 * - 桌面双月、窄屏单月；自定义范围通过“应用”一次性提交
 * 适配:base-nova 无 asChild,触发用 render prop(date-picker.tsx 先例);
 * zhCN + weekStartsOn=1（项目约定）；禁未来日期；关闭弹层会丢弃未应用草稿。
 */
export function DateRangePicker({ from, to, presets, onRangeChange, className }: DateRangePickerProps) {
  const isWide = useMediaQuery("(min-width: 640px)");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(() => toDateRange(from, to));
  const [calendarToday, setCalendarToday] = useState(() => new Date());
  const [resolvedPresets, setResolvedPresets] = useState(() => resolvePresets(presets));
  const committedRange = toDateRange(from, to);
  const label = getRangeLabel(from, to, resolvedPresets);

  const presetValue = getPresetValue(draft, resolvedPresets);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraft(toDateRange(from, to));
      setCalendarToday(new Date());
      setResolvedPresets(resolvePresets(presets));
    }
    setOpen(nextOpen);
  };

  const handlePresetChange = (value: string | null) => {
    if (value === "all") {
      onRangeChange(undefined, undefined);
      setOpen(false);
      return;
    }
    const preset = resolvedPresets.find(item => item.key === value);
    if (preset != null) {
      onRangeChange(preset.from, undefined);
      setOpen(false);
    }
    // 「custom」为只读显示项,忽略
  };

  const handleApply = () => {
    if (draft?.from == null) {
      return;
    }
    const [nextFrom, nextTo] = toIsoRange(draft);
    onRangeChange(nextFrom, nextTo);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={triggerProps => (
          <Button
            type="button"
            variant="outline"
            data-empty={from == null && to == null}
            aria-label="选择时间范围"
            className={cn("w-60 justify-start text-left font-normal data-[empty=true]:text-muted-foreground", className)}
            {...triggerProps}
          >
            <CalendarIcon data-icon="inline-start" aria-hidden="true" />
            {label}
          </Button>
        )}
      />
      <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0">
        <div className="border-b p-2">
          <ToggleGroup
            aria-label="快捷时间范围"
            size="sm"
            spacing={1}
            value={presetValue === "custom" ? [] : [presetValue]}
            onValueChange={(values) => {
              const nextValue = values.at(-1);
              if (nextValue != null) {
                handlePresetChange(nextValue);
              }
            }}
            className="flex-wrap"
          >
            <ToggleGroupItem value="all">全部</ToggleGroupItem>
            {resolvedPresets.map(preset => (
              <ToggleGroupItem key={preset.key} value={preset.key}>{preset.label}</ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <Calendar
          mode="range"
          numberOfMonths={isWide ? 2 : 1}
          locale={zhCN}
          weekStartsOn={1}
          autoFocus={isWide}
          defaultMonth={getCalendarStartMonth(draft ?? committedRange, calendarToday, isWide)}
          endMonth={calendarToday}
          selected={draft}
          onSelect={setDraft}
          disabled={{ after: calendarToday }}
        />
        <div className="flex items-center justify-end gap-2 border-t p-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>取消</Button>
          <Button type="button" size="sm" disabled={draft?.from == null} onClick={handleApply}>应用</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
