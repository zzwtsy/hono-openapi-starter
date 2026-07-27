import type { UserSummary } from "@/api/globals";
import { Ban, CircleCheck, KeyRound, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";

interface UserInfoTabProps {
  user: UserSummary;
  canUpdate: boolean;
  canReset: boolean;
  canDisable: boolean;
  canEnable: boolean;
  disabled: boolean;
  isSelf: boolean;
  onEdit: () => void;
  onReset: () => void;
  onDisable: () => void;
  onEnable: () => void;
}

export function UserInfoTab({ user, canUpdate, canReset, canDisable, canEnable, disabled, isSelf, onEdit, onReset, onDisable, onEnable }: UserInfoTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">用户名</dt>
          <dd className="font-medium">{user.name}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">邮箱</dt>
          <dd className="font-medium">{user.email}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">状态</dt>
          <dd>
            {disabled
              ? <Badge variant="destructive">已禁用</Badge>
              : <Badge variant="secondary">正常</Badge>}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">创建时间</dt>
          <dd className="font-medium">{formatDate(user.createdAt)}</dd>
        </div>
      </dl>

      <Separator />

      <div className="flex flex-wrap gap-2">
        {canUpdate && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil data-icon="inline-start" />
            编辑
          </Button>
        )}
        {canReset && (
          <Button variant="outline" size="sm" onClick={onReset}>
            <KeyRound data-icon="inline-start" />
            重置密码
          </Button>
        )}
        {canDisable && !disabled && !isSelf && (
          <Button variant="outline" size="sm" onClick={onDisable}>
            <Ban data-icon="inline-start" />
            禁用
          </Button>
        )}
        {canEnable && disabled && (
          <Button variant="outline" size="sm" onClick={onEnable}>
            <CircleCheck data-icon="inline-start" />
            启用
          </Button>
        )}
      </div>
    </div>
  );
}
