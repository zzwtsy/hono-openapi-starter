import type { UserSummary } from "@/shared/api/globals";
import { actionDelegationMiddleware, useRequest } from "alova/client";
import { Plus, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import Apis from "@/shared/api";
import { cn } from "@/shared/lib/utils";
import { AsyncListState } from "@/shared/ui/async-list";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Can } from "@/shared/ui/can";
import { Card, CardContent } from "@/shared/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { Input } from "@/shared/ui/input";
import { IAM_ACTIONS } from "../model/iam-actions";

interface UserListPanelProps {
  selectedUserId?: string;
  onSelect: (user: UserSummary) => void;
  onCreateUser: () => void;
}

export function UserListPanel({ selectedUserId, onSelect, onCreateUser }: UserListPanelProps) {
  const { data: users, loading, error, send } = useRequest(
    () => Apis.IAM.listUsers(),
    { middleware: actionDelegationMiddleware(IAM_ACTIONS.usersList) },
  );
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q === "") {
      return users;
    }
    return users?.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, search]);

  return (
    <AsyncListState loading={loading} error={error} data={users} onRetry={() => { void send(); }} errorDescription="无法获取用户列表。">
      <Card className="flex h-full flex-col">
        <CardContent className="flex h-full min-h-0 flex-col gap-2 p-3">
          <Can permission="users.create">
            <Button size="sm" onClick={onCreateUser}>
              <Plus data-icon="inline-start" />
              新建用户
            </Button>
          </Can>
          {users != null && users.length > 0 && (
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索用户..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 pl-8"
              />
            </div>
          )}
          {users?.length === 0
            ? (
                <Empty>
                  <EmptyMedia variant="icon">
                    <Users />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>暂无用户</EmptyTitle>
                    <EmptyDescription>当前组织下还没有用户。</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )
            : (
                <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
                  {filtered?.length === 0
                    ? <p className="text-sm text-muted-foreground">无匹配用户。</p>
                    : filtered?.map((u) => {
                        const disabled = u.disabled === true;
                        return (
                          <button
                            key={u.id}
                            type="button"
                            className={cn(
                              "flex items-center justify-between gap-2 rounded-lg border p-2 text-left text-sm transition-colors hover:bg-accent",
                              selectedUserId === u.id && "border-primary bg-accent",
                            )}
                            onClick={() => { onSelect(u); }}
                          >
                            <div className="flex min-w-0 flex-col gap-0.5">
                              <span className="truncate font-medium">{u.name}</span>
                              <span className="truncate text-xs text-muted-foreground">{u.email}</span>
                            </div>
                            {disabled
                              ? <Badge variant="destructive">已禁用</Badge>
                              : <Badge variant="secondary">正常</Badge>}
                          </button>
                        );
                      })}
                </div>
              )}
        </CardContent>
      </Card>
    </AsyncListState>
  );
}
