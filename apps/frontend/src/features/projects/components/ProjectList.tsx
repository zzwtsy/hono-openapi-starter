import type { Project } from "@/api/globals";
import { useRequest } from "alova/client";
import { CircleAlert, FolderKanban, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCan, useCanAny } from "@/hooks/use-permissions";
import { formatDate } from "@/lib/utils";
import { ProjectForm } from "./project-form";

export function ProjectList() {
  const { data, loading, error, send } = useRequest(() => Apis.Projects.listProjects());
  // 细粒度写权限:创建/编辑/删除各自独立(非 IAM 的三分 manage)。
  const canCreate = useCan("projects.create");
  const canUpdate = useCan("projects.update");
  const canDelete = useCan("projects.delete");
  const canManage = useCanAny(["projects.update", "projects.delete"]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const confirmDelete = async () => {
    if (deleting === null) {
      return;
    }
    const project = deleting;
    setDeletingBusy(true);
    try {
      await Apis.Projects.deleteProject({ pathParams: { projectId: project.id } });
      toast.success("项目已删除");
      setDeleting(null);
      void send();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeletingBusy(false);
    }
  };

  // mutation 成功后关 Dialog + 刷新列表(createProject/updateProject 不经 useRequest,手动 send 刷新)
  const handleCreated = () => {
    setCreateOpen(false);
    void send();
  };
  const handleUpdated = () => {
    setEditing(null);
    void send();
  };

  if (loading && data === undefined) {
    return <ListSkeleton />;
  }
  if (error !== null && data === undefined) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>无法获取项目列表。</AlertDescription>
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
            新建项目
          </Button>
        </div>
      )}
      {data?.length === 0
        ? (
            <Empty>
              <EmptyMedia variant="icon">
                <FolderKanban />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>暂无项目</EmptyTitle>
                <EmptyDescription>当前组织下还没有项目。</EmptyDescription>
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
                        <TableHead>组织</TableHead>
                        <TableHead>创建时间</TableHead>
                        {canManage && <TableHead className="text-right">操作</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.map(project => (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">{project.name}</TableCell>
                          <TableCell className="text-muted-foreground">{project.description ?? "-"}</TableCell>
                          <TableCell className="text-muted-foreground">{project.orgId}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(project.createdAt)}</TableCell>
                          {canManage && (
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="操作" />}>
                                  <MoreHorizontal />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuGroup>
                                    {canUpdate && (
                                      <DropdownMenuItem onClick={() => { setEditing(project); }}>
                                        <Pencil />
                                        编辑
                                      </DropdownMenuItem>
                                    )}
                                    {canDelete && (
                                      <DropdownMenuItem variant="destructive" onClick={() => { setDeleting(project); }}>
                                        <Trash2 />
                                        删除
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuGroup>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
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
          {createOpen && <ProjectForm onSuccess={handleCreated} />}
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
            <ProjectForm key={editing.id} project={editing} onSuccess={handleUpdated} />
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
            <AlertDialogTitle>删除项目</AlertDialogTitle>
            <AlertDialogDescription>
              {`确认删除项目"${deleting?.name}"?此操作不可撤销。`}
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
