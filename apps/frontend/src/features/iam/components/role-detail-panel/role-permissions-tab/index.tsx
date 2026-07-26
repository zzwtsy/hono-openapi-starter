import type { Permission, Role } from "@/api/globals";
import { actionDelegationMiddleware, useRequest } from "alova/client";
import { CircleAlert, KeyRound, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import Apis from "@/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCanAll } from "@/hooks/use-permissions";
import { IAM_ACTIONS, refreshIam } from "../../../iam-actions";
import { formatPermission } from "../../../permission-format";
import { groupByResource } from "../../shared/group-by-resource";

interface RolePermissionsTabProps {
  role: Role;
}

export function RolePermissionsTab({ role }: RolePermissionsTabProps) {
  const canConfig = useCanAll([
    "roles.assign-permissions",
    "roles.revoke-permissions",
    "permissions.read",
    "roles.read",
  ]);
  const { data: allPerms, loading: permsLoading, error: permsError, send: sendPerms } = useRequest(() => Apis.IAM.listPermissions(), { immediate: canConfig });
  const {
    data: granted,
    loading: grantedLoading,
    error: grantedError,
    send: sendGranted,
  } = useRequest(
    () => Apis.IAM.listRolePermissions({ pathParams: { roleId: role.id } }),
    { immediate: canConfig, middleware: actionDelegationMiddleware(IAM_ACTIONS.rolePerms) },
  );
  const loading = permsLoading || grantedLoading;
  const error = permsError ?? grantedError;
  const initial = useMemo(() => new Set(granted ?? []), [granted]);

  const [working, setWorking] = useState<Set<string>>(() => new Set(initial));
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"all" | "selected" | "diff">("all");
  const [submitting, setSubmitting] = useState(false);
  // granted 刷新(submit 成功 / refresh)后重置 working 编辑态:
  // role 切换由容器 key={role.id} remount 处理;此处只处理同 role 下 granted 变化。
  // 这是 React 官方 adjusting-state-when-data-changes 模式(优于 useEffect)。
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setWorking(new Set(initial));
  }

  const toAdd = useMemo(() => [...working].filter(p => !initial.has(p)), [working, initial]);
  const toRemove = useMemo(() => [...initial].filter(p => !working.has(p)), [working, initial]);
  const hasChanges = toAdd.length > 0 || toRemove.length > 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = allPerms ?? [];
    if (q !== "") {
      list = list.filter(
        p => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q),
      );
    }
    if (viewMode === "selected") {
      list = list.filter(p => working.has(p.name));
    } else if (viewMode === "diff") {
      list = list.filter(p => working.has(p.name) !== initial.has(p.name));
    }
    return list;
  }, [allPerms, search, viewMode, working, initial]);
  const groups = useMemo(() => groupByResource(filtered, p => p.name), [filtered]);

  const toggle = (name: string) => {
    setWorking((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const toggleAllInGroup = (perms: Permission[], select: boolean) => {
    setWorking((prev) => {
      const next = new Set(prev);
      for (const p of perms) {
        if (select) {
          next.add(p.name);
        } else {
          next.delete(p.name);
        }
      }
      return next;
    });
  };

  const retry = () => {
    void sendPerms();
    void sendGranted();
  };

  const submit = async () => {
    if (!hasChanges || submitting) {
      return;
    }
    setSubmitting(true);
    try {
      if (toAdd.length > 0) {
        await Apis.IAM.assignRolePermissions({
          pathParams: { roleId: role.id },
          data: { permissions: toAdd },
        });
      }
      for (const p of toRemove) {
        await Apis.IAM.deleteRolePermission({ pathParams: { roleId: role.id, permission: p } });
      }
      toast.success(`已更新:授予 ${toAdd.length},撤销 ${toRemove.length}`);
      refreshIam(IAM_ACTIONS.rolePerms, IAM_ACTIONS.userPermissions);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

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
    <div className="flex flex-col gap-3">
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

      {error !== null && allPerms === undefined
        ? (
            <div className="flex flex-col items-start gap-3">
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>加载失败</AlertTitle>
                <AlertDescription>无法获取权限目录或角色权限。</AlertDescription>
              </Alert>
              <Button variant="outline" size="sm" onClick={retry}>
                重试
              </Button>
            </div>
          )
        : loading
          ? (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-9 w-full" />
                {Array.from({ length: 3 }).map((_, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <Skeleton key={`group-${i}`} className="h-20 w-full" />
                ))}
              </div>
            )
          : groups.size === 0
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
                  <div className="flex flex-col gap-4 overflow-y-auto">
                    {[...groups.entries()].map(([resource, perms]) => {
                      const allSelected = perms.every(p => working.has(p.name));
                      const anySelected = perms.some(p => working.has(p.name));
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
                              const isAdd = working.has(perm.name) && !initial.has(perm.name);
                              const isRemove = !working.has(perm.name) && initial.has(perm.name);
                              return (
                                <Field key={perm.name} orientation="horizontal">
                                  <Checkbox
                                    id={`perm-${perm.name}`}
                                    checked={working.has(perm.name)}
                                    onCheckedChange={() => { toggle(perm.name); }}
                                  />
                                  <FieldLabel htmlFor={`perm-${perm.name}`} className="font-normal">
                                    <span className={isRemove ? "text-muted-foreground line-through" : isAdd ? "text-primary font-medium" : ""}>{formatPermission(perm)}</span>
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
                    <div className="flex items-center justify-between gap-2 border-t pt-3">
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
    </div>
  );
}
