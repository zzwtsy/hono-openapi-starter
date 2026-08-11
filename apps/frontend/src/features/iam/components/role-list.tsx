import type { Role } from "@/api/globals";
import { Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { AsyncListState } from "@/components/shared/async-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";

interface RoleListPanelProps {
  selectedRoleId?: string;
  roles?: Role[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  onSelect: (role: Role) => void;
}

export function RoleListPanel({ selectedRoleId, roles, loading, error, onRetry, onSelect }: RoleListPanelProps) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q === "") {
      return roles;
    }
    return roles?.filter(r => r.name.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q));
  }, [roles, search]);

  return (
    <AsyncListState loading={loading} error={error} data={roles} onRetry={onRetry} errorDescription="无法获取角色列表。">
      <Card size="sm" className="h-full min-h-0">
        <CardHeader>
          <CardTitle>角色</CardTitle>
          <CardDescription className="tabular-nums">
            共
            {roles?.length ?? 0}
            {" "}
            个角色
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
          {roles != null && roles.length > 0 && (
            <InputGroup>
              <InputGroupAddon><Search /></InputGroupAddon>
              <InputGroupInput
                aria-label="搜索角色"
                placeholder="搜索角色…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </InputGroup>
          )}
          {roles?.length === 0
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
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {filtered?.length === 0
                    ? (
                        <Empty className="min-h-32 p-4">
                          <EmptyHeader>
                            <EmptyTitle>无匹配角色</EmptyTitle>
                            <EmptyDescription>换个关键词试试。</EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      )
                    : (
                        <ItemGroup>
                          {filtered?.map(role => (
                            <Item
                              key={role.id}
                              render={<button type="button" />}
                              size="sm"
                              variant={selectedRoleId === role.id ? "muted" : "default"}
                              aria-pressed={selectedRoleId === role.id}
                              onClick={() => { onSelect(role); }}
                            >
                              <ItemContent>
                                <ItemTitle>{role.name}</ItemTitle>
                                {role.description !== null && <ItemDescription>{role.description}</ItemDescription>}
                              </ItemContent>
                              <ItemActions>
                                {role.source === "code"
                                  ? <Badge variant="secondary">代码</Badge>
                                  : <Badge variant="outline">实例</Badge>}
                              </ItemActions>
                            </Item>
                          ))}
                        </ItemGroup>
                      )}
                </div>
              )}
        </CardContent>
      </Card>
    </AsyncListState>
  );
}
