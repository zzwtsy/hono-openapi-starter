import type { Role } from "@/shared/api/globals";
import { Pencil, Trash2 } from "lucide-react";
import { formatDate } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

interface RoleInfoTabProps {
  role: Role;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function RoleInfoTab({ role, canUpdate, canDelete, onEdit, onDelete }: RoleInfoTabProps) {
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
                    <TooltipTrigger render={<Badge variant="secondary">代码</Badge>} />
                    <TooltipContent>代码同步角色，不可修改或删除</TooltipContent>
                  </Tooltip>
                )
              : <Badge>实例</Badge>}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">创建时间</dt>
          <dd className="font-medium">{formatDate(role.createdAt)}</dd>
        </div>
      </dl>

      {role.source === "instance" && (
        <>
          <Separator />
          <div className="flex flex-wrap gap-2">
            {canUpdate && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil data-icon="inline-start" />
                编辑
              </Button>
            )}
            {canDelete && (
              <Button variant="outline" size="sm" onClick={onDelete}>
                <Trash2 data-icon="inline-start" />
                删除
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
