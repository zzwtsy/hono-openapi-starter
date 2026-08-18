import type { Role } from "@/api/globals";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate } from "@/lib/utils";

export function RoleInfoTab({ role }: { role: Role }) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">名称</dt>
          <dd className="font-medium">{role.name}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">描述</dt>
          <dd className="font-medium">{role.description ?? "-"}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">来源</dt>
          <dd>
            {role.source === "code"
              ? (
                  <Tooltip>
                    <TooltipTrigger render={<Badge variant="secondary">系统内置</Badge>} />
                    <TooltipContent>由应用代码同步，不可修改或删除</TooltipContent>
                  </Tooltip>
                )
              : <Badge>自定义</Badge>}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">创建时间</dt>
          <dd className="font-medium">{formatDate(role.createdAt)}</dd>
        </div>
      </dl>
    </div>
  );
}
