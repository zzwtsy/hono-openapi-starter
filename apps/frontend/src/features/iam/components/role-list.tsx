import type { Role } from "@/api/globals";
import { actionDelegationMiddleware, useRequest } from "alova/client";
import { Plus, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import Apis from "@/api";
import { AsyncListState } from "@/components/shared/async-list";
import { Can } from "@/components/shared/can";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { IAM_ACTIONS } from "../lib/iam-actions";

interface RoleListPanelProps {
  selectedRoleId?: string;
  onSelect: (role: Role) => void;
  onCreateRole: () => void;
}

export function RoleListPanel({ selectedRoleId, onSelect, onCreateRole }: RoleListPanelProps) {
  const { data, loading, error, send } = useRequest(
    () => Apis.IAM.listRoles(),
    { middleware: actionDelegationMiddleware(IAM_ACTIONS.rolesList) },
  );
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q === "") {
      return data;
    }
    return data?.filter(r => r.name.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q));
  }, [data, search]);

  return (
    <AsyncListState loading={loading} error={error} data={data} onRetry={() => { void send(); }} errorDescription="无法获取角色列表。">
      <Card className="flex h-full flex-col">
        <CardContent className="flex h-full min-h-0 flex-col gap-2 p-3">
          <Can permission="roles.create">
            <Button size="sm" onClick={onCreateRole}>
              <Plus data-icon="inline-start" />
              新建角色
            </Button>
          </Can>
          {data != null && data.length > 0 && (
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索角色..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 pl-8"
              />
            </div>
          )}
          {data?.length === 0
            ? (
                <Empty>
                  <EmptyMedia variant="icon">
                    <ShieldCheck />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>暂无角色</EmptyTitle>
                    <EmptyDescription>当前组织下还没有角色。</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )
            : (
                <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
                  {filtered?.length === 0
                    ? <p className="text-sm text-muted-foreground">无匹配角色。</p>
                    : filtered?.map(role => (
                        <button
                          key={role.id}
                          type="button"
                          className={cn(
                            "flex items-center justify-between gap-2 rounded-lg border p-2 text-left text-sm transition-colors hover:bg-accent",
                            selectedRoleId === role.id && "border-primary bg-accent",
                          )}
                          onClick={() => { onSelect(role); }}
                        >
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate font-medium">{role.name}</span>
                            {role.description !== null && (
                              <span className="truncate text-xs text-muted-foreground">{role.description}</span>
                            )}
                          </div>
                          {role.source === "code"
                            ? <Badge variant="secondary">代码</Badge>
                            : <Badge>实例</Badge>}
                        </button>
                      ))}
                </div>
              )}
        </CardContent>
      </Card>
    </AsyncListState>
  );
}
