import type { UserOrgOption } from "./user-form";
import type { UserSummary } from "@/api/globals";
import { useRequest } from "alova/client";
import {
  Ban,
  CircleAlert,
  CircleCheck,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCan } from "@/hooks/use-permissions";
import { buildOrganizationTree } from "../organization-tree";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { UserAuthorizationDialog } from "./user-authorization-dialog";
import { UserForm } from "./user-form";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN");
}

function isDisabled(u: UserSummary): boolean {
  return u.disabled === true;
}

interface UserListProps {
  orgId: string;
  /** 当前登录用户 id,用于隐藏「禁用自己」。 */
  currentUserId: string;
}

export function UserList({ orgId, currentUserId }: UserListProps) {
  const { data: users, loading, error, send } = useRequest(() => Apis.IAM.listUsers());
  const { data: roles } = useRequest(() => Apis.IAM.listRoles());
  const { data: organizations } = useRequest(() => Apis.IAM.listOrganizations());

  // create 用户时选归属组织:操作者管理子树(自身+子孙),复用 organization-tree 的 getDescendantIds。
  const orgOptions = useMemo<UserOrgOption[]>(() => {
    if (organizations == null) {
      return [];
    }
    const tree = buildOrganizationTree(organizations);
    return [
      { label: tree.getDisplayPath(orgId), value: orgId },
      ...[...tree.getDescendantIds(orgId)].map(id => ({ label: tree.getDisplayPath(id), value: id })),
    ];
  }, [organizations, orgId]);

  const canCreate = useCan("users.create");
  const canUpdate = useCan("users.update");
  const canReset = useCan("users.reset-password");
  const canDisable = useCan("users.disable");
  const canEnable = useCan("users.enable");
  const canAuthorize = useCan("iam.manage");
  const hasRowActions = canUpdate || canReset || canDisable || canEnable || canAuthorize;

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
    return <UserListSkeleton />;
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
                                <DropdownMenu>
                                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="操作" />}>
                                    <MoreHorizontal />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuGroup>
                                      {canAuthorize && (
                                        <DropdownMenuItem onClick={() => { setAuthorizing(u); }}>
                                          <ShieldCheck />
                                          授权
                                        </DropdownMenuItem>
                                      )}
                                      {canUpdate && (
                                        <DropdownMenuItem onClick={() => { setEditing(u); }}>
                                          <Pencil />
                                          编辑
                                        </DropdownMenuItem>
                                      )}
                                      {canReset && (
                                        <DropdownMenuItem onClick={() => { setResetting(u); }}>
                                          <KeyRound />
                                          重置密码
                                        </DropdownMenuItem>
                                      )}
                                      {canDisable && !disabled && !isSelf && (
                                        <DropdownMenuItem
                                          variant="destructive"
                                          onClick={() => { setDisabling(u); }}
                                        >
                                          <Ban />
                                          禁用
                                        </DropdownMenuItem>
                                      )}
                                      {canEnable && disabled && (
                                        <DropdownMenuItem onClick={() => { void enableUser(u); }}>
                                          <CircleCheck />
                                          启用
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuGroup>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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
            orgId={orgId}
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

function UserListSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        {[0, 1, 2, 3, 4].map(row => (
          <Skeleton key={row} className="h-8 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
