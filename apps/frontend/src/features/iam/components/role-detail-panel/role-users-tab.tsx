import type { Role } from "@/api/globals";
import { actionDelegationMiddleware, useRequest } from "alova/client";
import { format } from "date-fns";
import { CalendarClock, Users } from "lucide-react";
import Apis from "@/api";
import { AsyncListState } from "@/components/shared/async-list";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/use-permissions";
import { IAM_ACTIONS } from "../../lib/iam-actions";

interface RoleUsersTabProps {
  role: Role;
  onNavigateUser: (userId: string, orgId: string) => void;
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
              <Empty className="min-h-28 p-4">
                <EmptyMedia variant="icon"><Users /></EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>暂无已授用户</EmptyTitle>
                  <EmptyDescription>管理子树内没有用户被授予此角色。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )
          : (
              <ItemGroup>
                {users.map(u => (
                  <Item
                    key={`${u.userId}-${u.orgId}`}
                    render={<button type="button" />}
                    size="sm"
                    variant="outline"
                    onClick={() => { onNavigateUser(u.userId, u.orgId); }}
                  >
                    <ItemContent>
                      <ItemTitle>{u.userName}</ItemTitle>
                      <ItemDescription>{u.email}</ItemDescription>
                    </ItemContent>
                    <ItemActions className="flex-wrap justify-end">
                      <Badge variant="outline" className="text-xs">{getOrgPath(u.orgId)}</Badge>
                      {u.expiresAt != null && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <CalendarClock className="size-3" />
                          {format(new Date(u.expiresAt), "yyyy-MM-dd")}
                        </span>
                      )}
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
            )}
      </AsyncListState>
    </div>
  );
}
