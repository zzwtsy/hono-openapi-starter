import { useMemo } from "react";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuditActions } from "../hooks/use-audit-actions";
import { presetToRange, TIME_PRESETS } from "../lib/audit-filters";

interface AuditLogFiltersProps {
  action: string | undefined;
  status: "success" | "failure" | undefined;
  /** actorKeyword 输入受控在表格层(本地 state + 防抖写 URL),此处纯展示。 */
  actorKeyword: string;
  /** from/to 为 ISO 字符串(与 URL search 一致),由 DateRangePicker 内部转显示与边界。 */
  from: string | undefined;
  to: string | undefined;
  onActionChange: (v: string | undefined) => void;
  onStatusChange: (v: "success" | "failure" | undefined) => void;
  onActorKeywordChange: (v: string) => void;
  /** 时间范围变化(预设/日历/清除统一入口),输出 ISO。 */
  onRangeChange: (from: string | undefined, to: string | undefined) => void;
  onReset: () => void;
}

/** 筛选条:操作 + 结果 + 操作人 + 时间范围 + 重置(预设与日历收进 DateRangePicker)。 */
export function AuditLogFilters({
  action,
  status,
  actorKeyword,
  from,
  to,
  onActionChange,
  onStatusChange,
  onActorKeywordChange,
  onRangeChange,
  onReset,
}: AuditLogFiltersProps) {
  // action 选项来自后端 catalog(action 代码 -> 中文 label),不手打精确代码
  const actions = useAuditActions();

  // 预设的 from 只计算一次:重渲染时 now 漂移会让 URL 里的 from 与预设值失配,选中态丢失
  const presets = useMemo(
    () => TIME_PRESETS.map(p => ({ key: p.key, label: p.label, from: presetToRange(p.key).from })),
    [],
  );

  // Base UI Select 的 items prop 让 Value 按 label 渲染(Base UI 与 Radix 的差异,见 shadcn #9753)
  const actionItems = [
    { value: "all", label: "全部操作" },
    ...actions.map(a => ({ value: a.action, label: a.label })),
  ];
  const statusItems = [
    { value: "all", label: "全部结果" },
    { value: "success", label: "成功" },
    { value: "failure", label: "失败" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        items={actionItems}
        value={action ?? "all"}
        onValueChange={v => onActionChange(v == null || v === "all" ? undefined : v)}
      >
        <SelectTrigger aria-label="操作筛选" className="w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {actionItems.map(item => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Select
        items={statusItems}
        value={status ?? "all"}
        onValueChange={v => onStatusChange(v == null || v === "all" ? undefined : v as "success" | "failure")}
      >
        <SelectTrigger aria-label="结果筛选" className="w-32"><SelectValue /></SelectTrigger>
        <SelectContent>
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
        presets={presets}
        onRangeChange={onRangeChange}
      />
      <Input
        aria-label="操作人姓名"
        placeholder="操作人姓名..."
        value={actorKeyword}
        onChange={e => onActorKeywordChange(e.target.value)}
        className="w-40"
      />
      <Button variant="outline" size="sm" onClick={onReset}>重置</Button>
    </div>
  );
}
