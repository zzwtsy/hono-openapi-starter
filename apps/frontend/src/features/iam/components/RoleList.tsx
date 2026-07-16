import type { Role } from "@/api/globals";
import { useRequest } from "alova/client";
import { CircleAlert, KeyRound, MoreHorizontal, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Apis from "@/api";
import { Can } from "@/components/Can";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RoleForm } from "./role-form";
import { RolePermissionsDialog } from "./role-permissions-dialog";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN");
}

export function RoleList() {
  const { data, loading, error, send } = useRequest(() => Apis.IAM.listRoles());
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState<Role | null>(null);
  const [assigning, setAssigning] = useState<Role | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const confirmDelete = async () => {
    if (deleting === null) {
      return;
    }
    const role = deleting;
    setDeletingBusy(true);
    try {
      await Apis.IAM.deleteRole({ pathParams: { roleId: role.id } });
      toast.success("角色已删除");
      setDeleting(null);
      void send();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeletingBusy(false);
    }
  };

  // mutation 成功后关 Dialog + 刷新列表(createRole/updateRole 不经 useRequest,手动 send 刷新)
  const handleCreated = () => {
    setCreateOpen(false);
    void send();
  };
  const handleUpdated = () => {
    setEditing(null);
    void send();
  };

  if (loading && data === undefined) {
    return <RoleListSkeleton />;
  }
  if (error !== null && data === undefined) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>无法获取角色列表。</AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={() => { void send(); }}>
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Can perm="roles.manage">
        <div className="flex justify-end">
          <Button onClick={() => { setCreateOpen(true); }}>
            <Plus data-icon="inline-start" />
            新建角色
          </Button>
        </div>
      </Can>
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
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>名称</TableHead>
                        <TableHead>描述</TableHead>
                        <TableHead>来源</TableHead>
                        <TableHead>创建时间</TableHead>
                        <Can perm="roles.manage">
                          <TableHead className="text-right">操作</TableHead>
                        </Can>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.map(role => (
                        <TableRow key={role.id}>
                          <TableCell className="font-medium">{role.name}</TableCell>
                          <TableCell className="text-muted-foreground">{role.description ?? "-"}</TableCell>
                          <TableCell>
                            {role.source === "code"
                              ? (
                                  <Tooltip>
                                    <TooltipTrigger render={<Badge variant="secondary">代码</Badge>} />
                                    <TooltipContent>代码同步角色，不可修改或删除</TooltipContent>
                                  </Tooltip>
                                )
                              : <Badge>实例</Badge>}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(role.createdAt)}</TableCell>
                          <Can perm="roles.manage">
                            <TableCell className="text-right">
                              {role.source === "instance" && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="操作" />}>
                                    <MoreHorizontal />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuGroup>
                                      <DropdownMenuItem onClick={() => { setAssigning(role); }}>
                                        <KeyRound />
                                        权限分配
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => { setEditing(role); }}>
                                        <Pencil />
                                        编辑
                                      </DropdownMenuItem>
                                      <DropdownMenuItem variant="destructive" onClick={() => { setDeleting(role); }}>
                                        <Trash2 />
                                        删除
                                      </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </TableCell>
                          </Can>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          {createOpen && <RoleForm onSuccess={handleCreated} />}
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
            <RoleForm key={editing.id} role={editing} onSuccess={handleUpdated} />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={assigning !== null}
        onOpenChange={(o) => {
          if (!o)
            setAssigning(null);
        }}
      >
        {assigning !== null && (
          <RolePermissionsDialog key={assigning.id} role={assigning} onClose={() => { setAssigning(null); }} />
        )}
      </Dialog>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(o) => {
          if (!o && !deletingBusy)
            setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除角色</AlertDialogTitle>
            <AlertDialogDescription>
              {`确认删除角色"${deleting?.name}"?此操作不可撤销。`}
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
    </div>
  );
}

function RoleListSkeleton() {
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
