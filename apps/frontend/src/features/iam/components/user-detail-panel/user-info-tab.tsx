import type { UserSummary } from "@/api/globals";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export function UserInfoTab({ user }: { user: UserSummary }) {
  const disabled = user.disabled === true;
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
    </div>
  );
}
