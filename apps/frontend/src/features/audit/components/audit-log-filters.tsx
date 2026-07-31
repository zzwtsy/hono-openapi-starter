import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AuditLogFiltersProps {
  action: string | undefined;
  status: "success" | "failure" | undefined;
  actorUserId: string | undefined;
  onActionChange: (v: string | undefined) => void;
  onStatusChange: (v: "success" | "failure" | undefined) => void;
  onActorChange: (v: string | undefined) => void;
  onReset: () => void;
}

export function AuditLogFilters({
  action,
  status,
  actorUserId,
  onActionChange,
  onStatusChange,
  onActorChange,
  onReset,
}: AuditLogFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="操作类型"
        value={action ?? ""}
        onChange={e => onActionChange(e.target.value || undefined)}
        className="w-40"
      />
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
        placeholder="操作人 ID"
        value={actorUserId ?? ""}
        onChange={e => onActorChange(e.target.value || undefined)}
        className="w-40"
      />
      <Button variant="outline" size="sm" onClick={onReset}>重置</Button>
    </div>
  );
}
