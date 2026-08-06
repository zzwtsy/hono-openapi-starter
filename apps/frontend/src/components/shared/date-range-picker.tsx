import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { zhCN } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** 审计筛选用快捷预设(由调用方注入,shared 层不依赖 features)。from 为 ISO,须固定值(不随渲染漂移)。 */
export interface TimeRangePreset {
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
  presets: TimeRangePreset[];
  /** 范围变化统一出口(预设/日历/清除),输出 ISO。 */
  onRangeChange: (from: string | undefined, to: string | undefined) => void;
}

// 禁未来日期:模块级常量,避免 render 内 new Date() 破坏纯度(date-picker.tsx 同款先例)。
const disabledFuture = { after: new Date() };

/**
 * 审计时间范围选择器:触发按钮 + Popover(预设 Select + 双月 range 日历)。
 * 结构依据 shadcn 官方示例 date-picker-with-range / date-picker-with-presets:
 * - 触发按钮 outline + justify-start + placeholder muted(官方 range 示例)
 * - 预设用 Popover 内嵌 Select 而非按钮组(官方 presets 示例)
 * - Calendar mode="range" + numberOfMonths=2 + autoFocus(官方示例 initialFocus,v10.0.1 为 autoFocus)
 * 适配:base-nova 无 asChild,触发用 render prop(date-picker.tsx 先例);
 * zhCN + weekStartsOn=1(项目约定);禁未来日期;值直接绑 URL search(无本地 state)。
 */
export function DateRangePicker({ from, to, presets, onRangeChange }: DateRangePickerProps) {
  const range: DateRange = {
    from: from != null ? new Date(from) : undefined,
    to: to != null ? new Date(to) : undefined,
  };

  // 触发按钮文案:无值 → 全部时间;仅 from → MM-dd 起;同日 → MM-dd;同年 → MM-dd ~ MM-dd;跨年带年防歧义
  let label = "全部时间";
  if (from != null && to == null) {
    label = `${format(new Date(from), "MM-dd")} 起`;
  } else if (from != null && to != null) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (format(fromDate, "yyyy-MM-dd") === format(toDate, "yyyy-MM-dd")) {
      label = format(fromDate, "MM-dd");
    } else if (fromDate.getFullYear() === toDate.getFullYear()) {
      label = `${format(fromDate, "MM-dd")} ~ ${format(toDate, "MM-dd")}`;
    } else {
      label = `${format(fromDate, "yyyy-MM-dd")} ~ ${format(toDate, "yyyy-MM-dd")}`;
    }
  }

  // 预设 Select:选中态 = from 精确匹配某预设;无值 → 全部时间;有值不匹配 → 只读「自定义」显示项
  const presetItems = [
    { value: "all", label: "全部时间" },
    ...presets.map(p => ({ value: p.key, label: p.label })),
    { value: "custom", label: "自定义", disabled: true },
  ];
  const matchedPreset = to == null ? presets.find(p => p.from === from) : undefined;
  let presetValue: string;
  if (from == null && to == null) {
    presetValue = "all";
  } else if (matchedPreset != null) {
    presetValue = matchedPreset.key;
  } else {
    presetValue = "custom";
  }

  const handlePresetChange = (value: string | null) => {
    if (value === "all") {
      onRangeChange(undefined, undefined);
      return;
    }
    const preset = presets.find(p => p.key === value);
    if (preset != null) {
      onRangeChange(preset.from, undefined);
    }
    // 「custom」为只读显示项,忽略
  };

  const handleSelect = (next: DateRange | undefined) => {
    if (next == null || next.from == null) {
      onRangeChange(undefined, undefined);
      return;
    }
    // 日历给的是本地日期,重建当天边界:from 00:00 / to 23:59:59.999(与后端 inclusive 语义一致)
    const start = new Date(next.from.getFullYear(), next.from.getMonth(), next.from.getDate(), 0, 0, 0, 0);
    if (next.to == null) {
      onRangeChange(start.toISOString(), undefined);
      return;
    }
    const end = new Date(next.to.getFullYear(), next.to.getMonth(), next.to.getDate(), 23, 59, 59, 999);
    onRangeChange(start.toISOString(), end.toISOString());
  };

  return (
    <Popover>
      <PopoverTrigger
        render={triggerProps => (
          <Button
            type="button"
            variant="outline"
            aria-label="选择时间范围"
            className={cn(
              "w-60 justify-start gap-2 text-left font-normal",
              from == null && to == null && "text-muted-foreground",
            )}
            {...triggerProps}
          >
            <CalendarIcon className="size-4 shrink-0" />
            {label}
          </Button>
        )}
      />
      <PopoverContent align="start" className="flex w-auto flex-col gap-2 p-2">
        <Select items={presetItems} value={presetValue} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {presetItems.map(item => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <div className="rounded-md border">
          {/* key 让默认月份在值变化(如点预设)时重新定位到 from 所在月,避免受控 month 的 setState 复杂度 */}
          <Calendar
            key={from ?? "empty"}
            mode="range"
            numberOfMonths={2}
            locale={zhCN}
            weekStartsOn={1}
            autoFocus
            defaultMonth={range.from}
            selected={range}
            onSelect={handleSelect}
            disabled={disabledFuture}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
