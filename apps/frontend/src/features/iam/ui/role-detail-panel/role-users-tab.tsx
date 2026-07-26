import type { Role } from "@/shared/api/globals";
import { actionDelegationMiddleware, useRequest } from "alova/client";
import { format } from "date-fns";
import { CalendarClock, Users } from "lucide-react";
import Apis from "@/shared/api";
import { useCan } from "@/shared/lib/use-permissions";
import { AsyncListState } from "@/shared/ui/async-list";
import { Badge } from "@/shared/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { Skeleton } from "@/shared/ui/skeleton";
import { IAM_ACTIONS } from "../../model/iam-actions";

interface RoleUsersTabProps {
  role: Role;
  onNavigateUser: (userId: string) => void;
  getOrgPath: (orgId: string) => string;
}

export function RoleUsersTab({ role, onNavigateUser, getOrgPath }: RoleUsersTabProps) {
  const canRead = useCan("assignments.read");
  const {
    data: users,
    loading,
    error,
    send,
  } = useRequest(
    () => Apis.IAM.listRoleUsers({ pathParams: { roleId: role.id } }),
    { immediate: canRead, middleware: actionDelegationMiddleware(IAM_ACTIONS.roleUsers) },
  );

  if (!canRead) {
    return (
      <Empty>
        <EmptyMedia variant="icon"><Users /></EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>无权限</EmptyTitle>
          <EmptyDescription>你需要 assignments.read 权限查看已授用户。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-medium">已授用户(管理子树内)</h4>
      <p className="text-xs text-muted-foreground">改此角色权限会影响以下所有用户。点击用户跳转其详情。</p>
      <AsyncListState
        loading={loading}
        error={error}
        data={users}
        onRetry={() => { void send(); }}
        loadingFallback={<Skeleton className="h-16 w-full" />}
        errorDescription="无法获取已授用户。"
      >
        {users === undefined || users.length === 0
          ? (
              <Empty>
                <EmptyMedia variant="icon"><Users /></EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>暂无已授用户</EmptyTitle>
                  <EmptyDescription>管理子树内没有用户被授予此角色。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )
          : (
              <div className="flex flex-col gap-2">
                {users.map(u => (
                  <div key={`${u.userId}-${u.orgId}`} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <button
                        type="button"
                        className="text-left text-sm font-medium hover:underline"
                        onClick={() => { onNavigateUser(u.userId); }}
                      >
                        {u.userName}
                      </button>
                      <span className="truncate text-xs text-muted-foreground">{u.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{getOrgPath(u.orgId)}</Badge>
                      {u.expiresAt != null && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <CalendarClock className="size-3" />
                          {format(new Date(u.expiresAt), "yyyy-MM-dd")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
      </AsyncListState>
    </div>
  );
}
