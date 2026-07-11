import type { Permission, Role } from "@/api/globals";
import { useRequest } from "alova/client";
import { CircleAlert, KeyRound, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Apis from "@/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

// 角色权限分配(批量编辑):全量目录(listPermissions,10min 缓存) + 角色已有(listRolePermissions)合并出初始态。
// 本地 working set(勾选只改本地、不发请求)-> diff(toAdd/toRemove)-> 一次提交(assign 批量 + revoke 逐个)。
// 无即时 refetch -> 无 Skeleton 抖动;搜索过滤 + footer diff 预览 + 保存确认。
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

interface RolePermissionsDialogProps {
  role: Role;
  onClose: () => void;
}

export function RolePermissionsDialog({ role, onClose }: RolePermissionsDialogProps) {
  const { data: allPerms, loading: permsLoading, error: permsError, send: sendPerms } = useRequest(() => Apis.IAM.listPermissions());
  const {
    data: granted,
    loading: grantedLoading,
    error: grantedError,
    send: sendGranted,
  } = useRequest(() => Apis.IAM.listRolePermissions({ pathParams: { roleId: role.id } }));
  const [working, setWorking] = useState<Set<string>>(() => new Set());
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loading = permsLoading || grantedLoading;
  const error = permsError ?? grantedError;
  const initial = useMemo(() => new Set(granted ?? []), [granted]);

  // granted 加载/重试后,把 working 同步到初始态(批量编辑的 reset)。set-state-in-effect 是必要的:
  // working 需跟随 granted 数据变化重置,不能用 useMemo(working 是可变编辑态)。
  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- 同步外部数据到编辑态,仅 initial 变化时触发(重试/首次加载)
    setWorking(new Set(initial));
  }, [initial]);

  const toAdd = useMemo(() => [...working].filter(p => !initial.has(p)), [working, initial]);
  const toRemove = useMemo(() => [...initial].filter(p => !working.has(p)), [working, initial]);
  const hasChanges = toAdd.length > 0 || toRemove.length > 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q === "") {
      return allPerms ?? [];
    }
    return (allPerms ?? []).filter(
      p => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q),
    );
  }, [allPerms, search]);
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
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          权限分配 ·
          {role.name}
        </DialogTitle>
        <DialogDescription>勾选要授予的权限,完成后保存。</DialogDescription>
      </DialogHeader>
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
          ? <PermissionsSkeleton />
          : (
              <>
                <div className="relative">
                  <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索权限..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                {groups.size === 0
                  ? (
                      <Empty>
                        <EmptyMedia variant="icon">
                          <KeyRound />
                        </EmptyMedia>
                        <EmptyHeader>
                          <EmptyTitle>{search.trim() === "" ? "暂无权限" : "无匹配权限"}</EmptyTitle>
                          <EmptyDescription>{search.trim() === "" ? "权限目录为空。" : "换个关键词试试。"}</EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    )
                  : (
                      <div className="flex max-h-[50vh] flex-col gap-4 overflow-y-auto">
                        {[...groups.entries()].map(([resource, perms]) => (
                          <FieldSet key={resource}>
                            <FieldLegend variant="label">{resource}</FieldLegend>
                            <div className="flex flex-col gap-2">
                              {perms.map(perm => (
                                <Field key={perm.name} orientation="horizontal">
                                  <Checkbox
                                    id={`perm-${perm.name}`}
                                    checked={working.has(perm.name)}
                                    onCheckedChange={() => { toggle(perm.name); }}
                                  />
                                  <FieldLabel htmlFor={`perm-${perm.name}`} className="font-normal">
                                    <span>{perm.name}</span>
                                    {perm.description !== null && (
                                      <span className="text-muted-foreground">{perm.description}</span>
                                    )}
                                  </FieldLabel>
                                </Field>
                              ))}
                            </div>
                          </FieldSet>
                        ))}
                      </div>
                    )}
              </>
            )}
      <DialogFooter className="flex-row items-center justify-between sm:justify-between">
        {hasChanges
          ? (
              <p className="text-sm text-muted-foreground">
                新增
                {" "}
                {toAdd.length}
                {" "}
                · 撤销
                {" "}
                {toRemove.length}
              </p>
            )
          : <span />}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button type="button" disabled={!hasChanges || submitting} onClick={() => { void submit(); }}>
            {submitting && <Spinner data-icon="inline-start" />}
            保存
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

function PermissionsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: 3 }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <Skeleton key={`group-${i}`} className="h-20 w-full" />
      ))}
    </div>
  );
}
