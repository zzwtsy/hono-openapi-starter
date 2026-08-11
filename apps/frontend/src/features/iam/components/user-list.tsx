import type { UserSummary } from "@/api/globals";
import { Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { AsyncListState } from "@/components/shared/async-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";

interface UserListPanelProps {
  selectedUserId?: string;
  users?: UserSummary[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  onSelect: (user: UserSummary) => void;
}

export function UserListPanel({ selectedUserId, users, loading, error, onRetry, onSelect }: UserListPanelProps) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q === "") {
      return users;
    }
    return users?.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, search]);

  return (
    <AsyncListState loading={loading} error={error} data={users} onRetry={onRetry} errorDescription="无法获取用户列表。">
      <Card size="sm" className="h-full min-h-0">
        <CardHeader>
          <CardTitle>用户</CardTitle>
          <CardDescription className="tabular-nums">
            共
            {users?.length ?? 0}
            {" "}
            个用户
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
          {users != null && users.length > 0 && (
            <InputGroup>
              <InputGroupAddon><Search /></InputGroupAddon>
              <InputGroupInput
                aria-label="搜索用户"
                placeholder="搜索用户…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </InputGroup>
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
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {filtered?.length === 0
                    ? (
                        <Empty className="min-h-32 p-4">
                          <EmptyHeader>
                            <EmptyTitle>无匹配用户</EmptyTitle>
                            <EmptyDescription>换个关键词试试。</EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      )
                    : (
                        <ItemGroup>
                          {filtered?.map((u) => {
                            const disabled = u.disabled === true;
                            return (
                              <Item
                                key={u.id}
                                render={<button type="button" />}
                                size="sm"
                                variant={selectedUserId === u.id ? "muted" : "default"}
                                aria-pressed={selectedUserId === u.id}
                                onClick={() => { onSelect(u); }}
                              >
                                <ItemContent>
                                  <ItemTitle>{u.name}</ItemTitle>
                                  <ItemDescription>{u.email}</ItemDescription>
                                </ItemContent>
                                <ItemActions>
                                  {disabled
                                    ? <Badge variant="destructive">已禁用</Badge>
                                    : <Badge variant="secondary">正常</Badge>}
                                </ItemActions>
                              </Item>
                            );
                          })}
                        </ItemGroup>
                      )}
                </div>
              )}
        </CardContent>
      </Card>
    </AsyncListState>
  );
}
