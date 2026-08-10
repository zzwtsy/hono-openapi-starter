import type { Project } from "@/api/globals";
import { useRequest } from "alova/client";
import { useState } from "react";
import Apis from "@/api";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCan } from "@/hooks/use-permissions";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { ProjectDataTable } from "./project-data-table";
import { ProjectForm } from "./project-form";

export function ProjectList() {
  const { data, loading, error, send } = useRequest(() => Apis.Projects.listProjects());
  const canCreate = useCan("projects.create");
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
  const handleCreated = () => {
    setCreateOpen(false);
    void send();
  };
  const handleUpdated = () => {
    setEditing(null);
    void send();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ProjectDataTable
        data={data}
        loading={loading}
        error={error}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onRetry={() => { void send(); }}
        onCreate={() => { setCreateOpen(true); }}
        onEdit={setEditing}
        onDelete={setDeleting}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          {createOpen && <ProjectForm onSuccess={handleCreated} />}
        </DialogContent>
      </Dialog>
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
          }
        }}
      >
        <DialogContent>
          {editing !== null && <ProjectForm key={editing.id} project={editing} onSuccess={handleUpdated} />}
        </DialogContent>
      </Dialog>
      <ConfirmDeleteDialog
        open={deleting !== null}
        busy={deletingBusy}
        title="删除项目"
        description={`确认删除项目"${deleting?.name}"?此操作不可撤销。`}
        onConfirm={() => { void confirmDelete(); }}
        onClose={() => { setDeleting(null); }}
      />
    </div>
  );
}
