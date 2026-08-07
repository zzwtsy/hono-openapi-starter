import type { Role } from "@/api/globals";
import { KeyRound, Search } from "lucide-react";
import { AsyncListState } from "@/components/shared/async-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { formatPermission } from "../../../lib/permission-format";
import { useRolePermissions } from "./use-role-permissions";

interface RolePermissionsTabProps {
  role: Role;
}

// 加载态骨架(组合:搜索栏 + 3 个分组占位),模块级常量避免每次 render 重建。
const PERMISSIONS_LOADING_FALLBACK = (
  <div className="flex flex-col gap-4">
    <Skeleton className="h-9 w-full" />
    {Array.from({ length: 3 }).map((_, i) => (
      // eslint-disable-next-line react/no-array-index-key
      <Skeleton key={`group-${i}`} className="h-20 w-full" />
    ))}
  </div>
);

export function RolePermissionsTab({ role }: RolePermissionsTabProps) {
  const {
    canConfig,
    allPerms,
    loading,
    error,
    initial,
    working,
    search,
    setSearch,
    viewMode,
    setViewMode,
    groups,
    toAdd,
    toRemove,
    hasChanges,
    toggle,
    toggleAllInGroup,
    retry,
    submit,
    submitting,
  } = useRolePermissions(role);

  if (!canConfig) {
    return (
      <Empty>
        <EmptyMedia variant="icon"><KeyRound /></EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>无权限</EmptyTitle>
          <EmptyDescription>你没有分配角色权限的权限。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索权限..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <ToggleGroup
          value={[viewMode]}
          onValueChange={(val) => {
            const next = val[val.length - 1];
            if (next === "all" || next === "selected" || next === "diff") {
              setViewMode(next);
            }
          }}
        >
          <ToggleGroupItem value="all">全部</ToggleGroupItem>
          <ToggleGroupItem value="selected">仅已选</ToggleGroupItem>
          <ToggleGroupItem value="diff">仅差异</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <AsyncListState
        loading={loading}
        error={error}
        data={allPerms}
        onRetry={retry}
        loadingFallback={PERMISSIONS_LOADING_FALLBACK}
        errorDescription="无法获取权限目录或角色权限。"
      >
        {groups.size === 0
          ? (
              <Empty>
                <EmptyMedia variant="icon">
                  <KeyRound />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>{search.trim() === "" ? "无权限" : "无匹配权限"}</EmptyTitle>
                  <EmptyDescription>{search.trim() === "" ? "权限目录为空。" : "换个关键词或筛选条件试试。"}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )
          : (
              <>
                <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto">
                  {[...groups.entries()].map(([resource, perms]) => {
                    const allSelected = perms.every(p => working.has(p.code));
                    const anySelected = perms.some(p => working.has(p.code));
                    const resourceLabel = perms[0]?.resourceLabel ?? resource;
                    return (
                      <FieldSet key={resource}>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={allSelected}
                            indeterminate={anySelected && !allSelected}
                            aria-label={`全选 ${resourceLabel}`}
                            onCheckedChange={() => { toggleAllInGroup(perms, !allSelected); }}
                          />
                          <FieldLegend variant="label" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {`${resourceLabel}（${resource}）`}
                          </FieldLegend>
                        </div>
                        <div className="flex flex-col gap-2">
                          {perms.map((perm) => {
                            const isAdd = working.has(perm.code) && !initial.has(perm.code);
                            const isRemove = !working.has(perm.code) && initial.has(perm.code);
                            return (
                              <Field key={perm.code} orientation="horizontal">
                                <Checkbox
                                  id={`perm-${perm.code}`}
                                  checked={working.has(perm.code)}
                                  onCheckedChange={() => { toggle(perm.code); }}
                                />
                                <FieldLabel htmlFor={`perm-${perm.code}`} className="font-normal">
                                  <span className={cn(isRemove && "text-muted-foreground line-through", isAdd && "text-primary font-medium")}>{formatPermission(perm)}</span>
                                  {isAdd && <Badge className="text-xs">新增</Badge>}
                                  {isRemove && <Badge variant="destructive" className="text-xs">撤销</Badge>}
                                </FieldLabel>
                              </Field>
                            );
                          })}
                        </div>
                      </FieldSet>
                    );
                  })}
                </div>
                {hasChanges && (
                  <div className="flex shrink-0 items-center justify-between gap-2 border-t pt-3">
                    <p className="text-sm text-muted-foreground">
                      新增
                      {" "}
                      <span className="font-medium text-primary">{toAdd.length}</span>
                      {" "}
                      · 撤销
                      {" "}
                      <span className="font-medium text-destructive">{toRemove.length}</span>
                    </p>
                    <Button type="button" size="sm" disabled={submitting} onClick={() => { void submit(); }}>
                      {submitting && <Spinner data-icon="inline-start" />}
                      保存
                    </Button>
                  </div>
                )}
              </>
            )}
      </AsyncListState>
    </div>
  );
}
