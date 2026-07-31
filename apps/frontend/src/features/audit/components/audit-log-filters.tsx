import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuditActions } from "../hooks/use-audit-actions";

interface AuditLogFiltersProps {
  action: string | undefined;
  status: "success" | "failure" | undefined;
  actorUserId: string | undefined;
  /** from/to 为日期字符串(YYYY-MM-DD),发送前由表格层转 ISO。 */
  from: string | undefined;
  to: string | undefined;
  onActionChange: (v: string | undefined) => void;
  onStatusChange: (v: "success" | "failure" | undefined) => void;
  onActorChange: (v: string | undefined) => void;
  onFromChange: (v: string | undefined) => void;
  onToChange: (v: string | undefined) => void;
  onReset: () => void;
}

export function AuditLogFilters({
  action,
  status,
  actorUserId,
  from,
  to,
  onActionChange,
  onStatusChange,
  onActorChange,
  onFromChange,
  onToChange,
  onReset,
}: AuditLogFiltersProps) {
  // action 选项来自后端 catalog(action 代码 -> 中文 label),不手打精确代码
  const actions = useAuditActions();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={action ?? "all"}
        onValueChange={v => onActionChange(v == null || v === "all" ? undefined : v)}
      >
        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">全部操作</SelectItem>
            {actions.map(a => (
              <SelectItem key={a.action} value={a.action}>{a.label}</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Select
        value={status ?? "all"}
        onValueChange={v => onStatusChange(v === "all" ? undefined : v as "success" | "failure")}
      >
        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">全部结果</SelectItem>
            <SelectItem value="success">成功</SelectItem>
            <SelectItem value="failure">失败</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <Input
        type="date"
        aria-label="起始日期"
        value={from ?? ""}
        onChange={e => onFromChange(e.target.value || undefined)}
        className="w-40"
      />
      <Input
        type="date"
        aria-label="截止日期"
        value={to ?? ""}
        onChange={e => onToChange(e.target.value || undefined)}
        className="w-40"
      />
      <Input
        placeholder="操作人 ID"
        value={actorUserId ?? ""}
        onChange={e => onActorChange(e.target.value || undefined)}
        className="w-40"
      />
      <Button variant="outline" size="sm" onClick={onReset}>重置</Button>
    </div>
  );
}
