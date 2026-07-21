import type { UserOrgOption } from "./user-form";
import type { UserSummary } from "@/api/globals";
import { useRequest } from "alova/client";
import {
  Ban,
  CircleAlert,
  CircleCheck,
  KeyRound,
  Pencil,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import Apis from "@/api";
import { ResourceActions } from "@/components/resource-actions";
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCan, useCanAll, useCanAny, useCanMap } from "@/hooks/use-permissions";
import { formatDate } from "@/lib/utils";
import { buildOrganizationTree } from "../organization-tree";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { UserAuthorizationDialog } from "./user-authorization-dialog";
import { UserForm } from "./user-form";

function isDisabled(u: UserSummary): boolean {
  return u.disabled === true;
}

interface UserListProps {
  orgId: string;
  /** 当前登录用户 id,用于隐藏「禁用自己」。 */
  currentUserId: string;
}

export function UserList({ orgId, currentUserId }: UserListProps) {
  // 权限检查提到请求前:roles/organizations 分别需 roles.read/organizations.read,按读权限门控 immediate
  // 避免无对应权限的用户进页面即触发 403(B5 D2)。授权入口需 assignments.read + roles.read +
  // permissions.read + 至少一个写(grant/revoke),读门控保证打开授权对话框时其内部读请求不 403。
  const canCreate = useCan("users.create");
  // 两个 hook 必须无条件调用(不能 `useCanAll(...) && useCanAny(...)` 短路,否则违反 rules-of-hooks),
  // 再用 && 组合结果:读门控保证打开授权对话框时其内部读请求不 403,写门控保证至少能授或撤。
  const canReadForAuthorize = useCanAll(["assignments.read", "roles.read", "permissions.read"]);
  const canWriteAuthorize = useCanAny(["assignments.grant", "assignments.revoke"]);
  const canAuthorize = canReadForAuthorize && canWriteAuthorize;
  const canReadRoles = useCan("roles.read");
  const canReadOrgs = useCan("organizations.read");

  const { data: users, loading, error, send } = useRequest(() => Apis.IAM.listUsers());
  // roles 用于授权对话框(角色下拉);organizations 用于建用户选 org + 授权 org 切换。
  // 各自按读权限 immediate 门控:无对应读权限不请求,降级为 undefined(对话框/表单条件渲染容错)。
  const { data: roles } = useRequest(() => Apis.IAM.listRoles(), { immediate: canReadRoles });
  const { data: organizations } = useRequest(() => Apis.IAM.listOrganizations(), { immediate: canReadOrgs });

  // create 用户时选归属组织:操作者管理子树(自身+子孙),复用 organization-tree 的 getDescendantIds。
  // listOrganizations 需 organizations.read;无该权限(如仅 users.create 无 organizations.read)时 organizations 为 undefined,
  // 降级为仅操作者 home org(建用户仍可用默认 org,只是不能选子组织)。
  const orgOptions = useMemo<UserOrgOption[]>(() => {
    if (organizations == null) {
      return [{ label: orgId, value: orgId }];
    }
    const tree = buildOrganizationTree(organizations);
    return [
      { label: tree.getDisplayPath(orgId), value: orgId },
      ...[...tree.getDescendantIds(orgId)].map(id => ({ label: tree.getDisplayPath(id), value: id })),
    ];
  }, [organizations, orgId]);

  const caps = useCanMap(["users.update", "users.reset-password", "users.disable", "users.enable"] as const);
  const hasRowActions = canAuthorize
    || caps["users.update"]
    || caps["users.reset-password"]
    || caps["users.disable"]
    || caps["users.enable"];

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserSummary | null>(null);
  const [resetting, setResetting] = useState<UserSummary | null>(null);
  const [disabling, setDisabling] = useState<UserSummary | null>(null);
  const [disablingBusy, setDisablingBusy] = useState(false);
  const [authorizing, setAuthorizing] = useState<UserSummary | null>(null);

  const refresh = () => {
    void send();
  };

  const handleCreated = () => {
    setCreateOpen(false);
    refresh();
  };
  const handleUpdated = () => {
    setEditing(null);
    refresh();
  };
  const handleReset = () => {
    setResetting(null);
    refresh();
  };

  const confirmDisable = async () => {
    if (disabling === null) {
      return;
    }
    const target = disabling;
    setDisablingBusy(true);
    try {
      await Apis.IAM.disableUser({ pathParams: { userId: target.id } });
      toast.success("用户已禁用");
      setDisabling(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "禁用失败");
    } finally {
      setDisablingBusy(false);
    }
  };

  const enableUser = async (u: UserSummary) => {
    try {
      await Apis.IAM.enableUser({ pathParams: { userId: u.id } });
      toast.success("用户已启用");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "启用失败");
    }
  };

  if (loading && users === undefined) {
    return <ListSkeleton />;
  }
  if (error !== null && users === undefined) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>无法获取用户列表。</AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={() => { void send(); }}>
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {canCreate && (
        <div className="flex justify-end">
          <Button onClick={() => { setCreateOpen(true); }}>
            <Plus data-icon="inline-start" />
            新建用户
          </Button>
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
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>用户名</TableHead>
                        <TableHead>邮箱</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>创建时间</TableHead>
                        {hasRowActions && <TableHead className="text-right">操作</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users?.map((u) => {
                        const disabled = isDisabled(u);
                        const isSelf = u.id === currentUserId;
                        return (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.name}</TableCell>
                            <TableCell className="text-muted-foreground">{u.email}</TableCell>
                            <TableCell>
                              {disabled
                                ? <Badge variant="destructive">已禁用</Badge>
                                : <Badge variant="secondary">正常</Badge>}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                            {hasRowActions && (
                              <TableCell className="text-right">
                                <ResourceActions
                                  items={[
                                    { id: "authorize", allowed: canAuthorize && !isSelf, label: "授权", icon: ShieldCheck, onClick: () => { setAuthorizing(u); } },
                                    { id: "edit", allowed: caps["users.update"], label: "编辑", icon: Pencil, onClick: () => { setEditing(u); } },
                                    { id: "reset", allowed: caps["users.reset-password"], label: "重置密码", icon: KeyRound, onClick: () => { setResetting(u); } },
                                    { id: "disable", allowed: caps["users.disable"] && !disabled && !isSelf, label: "禁用", icon: Ban, variant: "destructive", onClick: () => { setDisabling(u); } },
                                    { id: "enable", allowed: caps["users.enable"] && disabled, label: "启用", icon: CircleCheck, onClick: () => { void enableUser(u); } },
                                  ]}
                                />
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          {createOpen && <UserForm onSuccess={handleCreated} orgOptions={orgOptions} defaultOrgId={orgId} />}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editing !== null}
        onOpenChange={(o) => {
          if (!o)
            setEditing(null);
        }}
      >
        <DialogContent>
          {editing !== null && (
            <UserForm key={editing.id} user={editing} onSuccess={handleUpdated} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetting !== null}
        onOpenChange={(o) => {
          if (!o)
            setResetting(null);
        }}
      >
        <DialogContent>
          {resetting !== null && (
            <ResetPasswordDialog key={resetting.id} user={resetting} onSuccess={handleReset} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={authorizing !== null}
        onOpenChange={(o) => {
          if (!o)
            setAuthorizing(null);
        }}
      >
        {authorizing !== null && roles !== undefined && (
          <UserAuthorizationDialog
            key={authorizing.id}
            user={authorizing}
            orgId={authorizing.orgId ?? orgId}
            orgOptions={orgOptions}
            roles={roles}
          />
        )}
      </Dialog>

      <AlertDialog
        open={disabling !== null}
        onOpenChange={(o) => {
          if (!o && !disablingBusy)
            setDisabling(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>禁用用户</AlertDialogTitle>
            <AlertDialogDescription>
              {`确认禁用用户「${disabling?.name}」?对方将立即下线且无法重新登录,直至重新启用。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disablingBusy}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={disablingBusy}
              onClick={() => { void confirmDisable(); }}
            >
              {disablingBusy && <Spinner data-icon="inline-start" />}
              禁用
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
