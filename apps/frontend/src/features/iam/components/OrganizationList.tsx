import type { Organization } from "@/api/globals";
import { useRequest } from "alova/client";
import { Building2, CircleAlert, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
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
import { OrganizationForm } from "./organization-form";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN");
}

export function OrganizationList() {
  const { data, loading, error, send } = useRequest(() => Apis.IAM.listOrganizations());
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [deleting, setDeleting] = useState<Organization | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const orgMap = new Map((data ?? []).map(o => [o.id, o.name]));

  const confirmDelete = async () => {
    if (deleting === null) {
      return;
    }
    const org = deleting;
    setDeletingBusy(true);
    try {
      await Apis.IAM.deleteOrganization({ pathParams: { orgId: org.id } });
      toast.success("组织已删除");
      setDeleting(null);
      void send();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeletingBusy(false);
    }
  };

  const handleCreated = () => {
    setCreateOpen(false);
    void send();
  };
  const handleUpdated = () => {
    setEditing(null);
    void send();
  };

  if (loading && data === undefined) {
    return <OrganizationListSkeleton />;
  }
  if (error !== null && data === undefined) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>无法获取组织列表。</AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={() => { void send(); }}>
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Can perm="iam.manage">
        <div className="flex justify-end">
          <Button onClick={() => { setCreateOpen(true); }}>
            <Plus data-icon="inline-start" />
            新建组织
          </Button>
        </div>
      </Can>
      {data?.length === 0
        ? (
            <Empty>
              <EmptyMedia variant="icon">
                <Building2 />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>暂无组织</EmptyTitle>
                <EmptyDescription>当前还没有组织。</EmptyDescription>
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
                        <TableHead>父组织</TableHead>
                        <TableHead>创建时间</TableHead>
                        <Can perm="iam.manage">
                          <TableHead className="text-right">操作</TableHead>
                        </Can>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.map(org => (
                        <TableRow key={org.id}>
                          <TableCell className="font-medium">{org.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {org.parentId != null ? (orgMap.get(org.parentId) ?? org.parentId) : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(org.createdAt)}</TableCell>
                          <Can perm="iam.manage">
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="操作" />}>
                                  <MoreHorizontal />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuGroup>
                                    <DropdownMenuItem onClick={() => { setEditing(org); }}>
                                      <Pencil />
                                      编辑
                                    </DropdownMenuItem>
                                    <DropdownMenuItem variant="destructive" onClick={() => { setDeleting(org); }}>
                                      <Trash2 />
                                      删除
                                    </DropdownMenuItem>
                                  </DropdownMenuGroup>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
          {createOpen && data !== undefined && (
            <OrganizationForm organizations={data} onSuccess={handleCreated} />
          )}
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
          {editing !== null && data !== undefined && (
            <OrganizationForm key={editing.id} organizations={data} organization={editing} onSuccess={handleUpdated} />
          )}
        </DialogContent>
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
            <AlertDialogTitle>删除组织</AlertDialogTitle>
            <AlertDialogDescription>
              {`确认删除组织"${deleting?.name}"?有子组织或关联数据时将拒绝删除。`}
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

function OrganizationListSkeleton() {
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
