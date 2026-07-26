import type { Project } from "@/api/globals";
import { useRequest } from "alova/client";
import { FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import Apis from "@/api";
import { Can } from "@/components/can";
import { ResourceActions } from "@/components/resource-actions";
import { AsyncListState } from "@/components/shared/async-list";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCan } from "@/hooks/use-permissions";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { formatDate } from "@/lib/utils";
import { ProjectForm } from "./project-form";

export function ProjectList() {
  const { data, loading, error, send } = useRequest(() => Apis.Projects.listProjects());
  // 细粒度写权限:创建/编辑/删除各自独立(非 IAM 的三分 manage)。
  const canUpdate = useCan("projects.update");
  const canDelete = useCan("projects.delete");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const { mutate: runWithToast, busy: deletingBusy } = useToastMutation();

  const confirmDelete = async () => {
    if (deleting === null) {
      return;
    }
    const ok = await runWithToast(
      () => Apis.Projects.deleteProject({ pathParams: { projectId: deleting.id } }),
      { successMessage: "项目已删除", errorMessage: "删除失败" },
    );
    if (ok) {
      setDeleting(null);
      void send();
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

  return (
    <AsyncListState loading={loading} error={error} data={data} onRetry={() => { void send(); }} errorDescription="无法获取项目列表。">
      <div className="flex flex-col gap-4">
        <Can permission="projects.create">
          <div className="flex justify-end">
            <Button onClick={() => { setCreateOpen(true); }}>
              <Plus data-icon="inline-start" />
              新建项目
            </Button>
          </div>
        </Can>
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
                          <Can anyOf={["projects.update", "projects.delete"]}><TableHead className="text-right">操作</TableHead></Can>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data?.map(project => (
                          <TableRow key={project.id}>
                            <TableCell className="font-medium">{project.name}</TableCell>
                            <TableCell className="text-muted-foreground">{project.description ?? "-"}</TableCell>
                            <TableCell className="text-muted-foreground">{project.orgId}</TableCell>
                            <TableCell className="text-muted-foreground">{formatDate(project.createdAt)}</TableCell>
                            <Can anyOf={["projects.update", "projects.delete"]}>
                              <TableCell className="text-right">
                                <ResourceActions
                                  items={[
                                    { id: "edit", allowed: canUpdate, label: "编辑", icon: Pencil, onClick: () => { setEditing(project); } },
                                    { id: "delete", allowed: canDelete, label: "删除", icon: Trash2, variant: "destructive", onClick: () => { setDeleting(project); } },
                                  ]}
                                />
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

        <ConfirmDeleteDialog
          open={deleting !== null}
          busy={deletingBusy}
          title="删除项目"
          description={`确认删除项目"${deleting?.name}"?此操作不可撤销。`}
          onConfirm={() => { void confirmDelete(); }}
          onClose={() => setDeleting(null)}
        />
      </div>
    </AsyncListState>
  );
}
