import type { Permission, Role } from "@/api/globals";
import { actionDelegationMiddleware, useRequest } from "alova/client";
import { format } from "date-fns";
import { CalendarClock, CircleAlert, KeyRound, Pencil, Search, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import Apis from "@/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCan, useCanAll } from "@/hooks/use-permissions";
import { formatDate } from "@/lib/utils";
import { IAM_ACTIONS, refreshIam } from "../iam-actions";
import { formatPermission } from "../permission-format";
import { RoleForm } from "./role-form";

function groupByResource(perms: Permission[]): Map<string, Permission[]> {
  const groups = new Map<string, Permission[]>();
  for (const p of perms) {
    const resource = p.name.split(".")[0] ?? "other";
    const list = groups.get(resource);
    if (list === undefined) {
      groups.set(resource, [p]);
    } else {
      list.push(p);
    }
  }
  return groups;
}

interface RoleDetailPanelProps {
  role: Role;
  tab: string;
  onTabChange: (tab: string) => void;
  onNavigateUser: (userId: string) => void;
  getOrgPath: (orgId: string) => string;
}

export function RoleDetailPanel({ role, tab, onTabChange, onNavigateUser, getOrgPath }: RoleDetailPanelProps) {
  const canUpdate = useCan("roles.update");
  const canDelete = useCan("roles.delete");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const handleEditSuccess = () => {
    setEditing(false);
    refreshIam(IAM_ACTIONS.rolesList);
  };

  const confirmDelete = async () => {
    setDeletingBusy(true);
    try {
      await Apis.IAM.deleteRole({ pathParams: { roleId: role.id } });
      toast.success("角色已删除");
      setDeleting(false);
      refreshIam(IAM_ACTIONS.rolesList);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex h-full min-h-0 flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-lg font-medium">{role.name}</span>
            {role.description !== null && (
              <span className="text-sm text-muted-foreground">{role.description}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {role.source === "code"
              ? (
                  <Tooltip>
                    <TooltipTrigger render={<Badge variant="secondary">代码</Badge>} />
                    <TooltipContent>代码同步角色，不可修改或删除</TooltipContent>
                  </Tooltip>
                )
              : <Badge>实例</Badge>}
          </div>
        </div>

        <Tabs value={tab} onValueChange={onTabChange} className="flex min-h-0 flex-1 flex-col">
          <TabsList>
            <TabsTrigger value="info">信息</TabsTrigger>
            <TabsTrigger value="permissions">权限分配</TabsTrigger>
            <TabsTrigger value="users">已授用户</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="min-h-0 flex-1 overflow-y-auto">
            <RoleInfoTab
              role={role}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onEdit={() => { setEditing(true); }}
              onDelete={() => { setDeleting(true); }}
            />
          </TabsContent>
          <TabsContent value="permissions" className="min-h-0 flex-1 overflow-y-auto">
            <RolePermissionsTab key={role.id} role={role} />
          </TabsContent>
          <TabsContent value="users" className="min-h-0 flex-1 overflow-y-auto">
            <RoleUsersTab key={role.id} role={role} onNavigateUser={onNavigateUser} getOrgPath={getOrgPath} />
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          {editing && <RoleForm key={role.id} role={role} onSuccess={handleEditSuccess} />}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting}
        onOpenChange={(o) => {
          if (o || !deletingBusy) {
            setDeleting(o);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除角色</AlertDialogTitle>
            <AlertDialogDescription>
              {`确认删除角色"${role.name}"?此操作不可撤销。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBusy}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletingBusy}
              onClick={() => { void confirmDelete(); }}
            >
              {deletingBusy && <Spinner data-icon="inline-start" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function RoleInfoTab({ role, canUpdate, canDelete, onEdit, onDelete }: {
  role: Role;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">名称</dt>
          <dd className="font-medium">{role.name}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">描述</dt>
          <dd className="font-medium">{role.description ?? "-"}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">来源</dt>
          <dd>
            {role.source === "code"
              ? (
                  <Tooltip>
                    <TooltipTrigger render={<Badge variant="secondary">代码</Badge>} />
                    <TooltipContent>代码同步角色，不可修改或删除</TooltipContent>
                  </Tooltip>
                )
              : <Badge>实例</Badge>}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">创建时间</dt>
          <dd className="font-medium">{formatDate(role.createdAt)}</dd>
        </div>
      </dl>

      {role.source === "instance" && (
        <>
          <Separator />
          <div className="flex flex-wrap gap-2">
            {canUpdate && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil data-icon="inline-start" />
                编辑
              </Button>
            )}
            {canDelete && (
              <Button variant="outline" size="sm" onClick={onDelete}>
                <Trash2 data-icon="inline-start" />
                删除
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function RolePermissionsTab({ role }: { role: Role }) {
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
  const groups = useMemo(() => groupByResource(filtered), [filtered]);

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
                    <EmptyTitle>{search.trim() === "" ? "暂无权限" : "无匹配权限"}</EmptyTitle>
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

function RoleUsersTab({ role, onNavigateUser, getOrgPath }: { role: Role; onNavigateUser: (userId: string) => void; getOrgPath: (orgId: string) => string }) {
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
      {loading
        ? <Skeleton className="h-16 w-full" />
        : error !== null && users === undefined
          ? (
              <p className="text-sm text-muted-foreground">
                加载失败,
                <Button variant="link" size="sm" className="h-auto p-0" onClick={() => { void send(); }}>重试</Button>
              </p>
            )
          : users === undefined || users.length === 0
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
    </div>
  );
}
