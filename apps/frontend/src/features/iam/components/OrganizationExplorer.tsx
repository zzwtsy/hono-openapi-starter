import type { Organization } from "@/api/globals";
import { useRequest } from "alova/client";
import { Building2, CircleAlert, Plus } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { buildOrganizationTree } from "../organization-tree";
import { OrganizationDetails } from "./organization-details";
import { OrganizationForm } from "./organization-form";
import { OrganizationTree } from "./organization-tree";

const NARROW_SCREEN_QUERY = "(max-width: 1023px)";

function subscribeToNarrowScreen(callback: () => void) {
  const query = window.matchMedia(NARROW_SCREEN_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function useIsNarrowScreen() {
  return useSyncExternalStore(
    subscribeToNarrowScreen,
    () => window.matchMedia(NARROW_SCREEN_QUERY).matches,
    () => false,
  );
}

interface OrganizationExplorerProps {
  selectedOrganizationId?: string;
  onSelectedOrganizationChange: (id?: string) => void;
}

export function OrganizationExplorer({
  selectedOrganizationId,
  onSelectedOrganizationChange,
}: OrganizationExplorerProps) {
  const { data, loading, error, send } = useRequest(() => Apis.IAM.listOrganizations());
  const [creatingParentId, setCreatingParentId] = useState<string | null>();
  const [editing, setEditing] = useState<Organization>();
  const [deleting, setDeleting] = useState<Organization>();
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isNarrowScreen = useIsNarrowScreen();
  const index = useMemo(() => buildOrganizationTree(data ?? []), [data]);
  const selectedOrganization = selectedOrganizationId === undefined
    ? index.byId.get(index.rootIds[0] ?? "")
    : index.byId.get(selectedOrganizationId) ?? index.byId.get(index.rootIds[0] ?? "");

  useEffect(() => {
    if (data === undefined) {
      return;
    }
    const resolvedId = selectedOrganization?.id;
    if (resolvedId !== selectedOrganizationId) {
      onSelectedOrganizationChange(resolvedId);
    }
  }, [data, onSelectedOrganizationChange, selectedOrganization?.id, selectedOrganizationId]);

  const refreshOrganizations = async () => {
    try {
      await send();
    } catch {
      toast.error("组织已保存，但列表刷新失败，请重试");
    }
  };

  const selectOrganization = (id: string, openDetails = false) => {
    onSelectedOrganizationChange(id);
    if (openDetails && isNarrowScreen) {
      setDetailsOpen(true);
    }
  };

  const handleCreated = async (organization: Organization) => {
    setCreatingParentId(undefined);
    await refreshOrganizations();
    onSelectedOrganizationChange(organization.id);
  };

  const handleUpdated = async (organization: Organization) => {
    setEditing(undefined);
    await refreshOrganizations();
    onSelectedOrganizationChange(organization.id);
  };

  const confirmDelete = async () => {
    if (deleting === undefined) {
      return;
    }
    const fallbackId = index.getParent(deleting.id)?.id ?? index.rootIds.find(id => id !== deleting.id);
    setDeletingBusy(true);
    try {
      await Apis.IAM.deleteOrganization({ pathParams: { orgId: deleting.id } });
      toast.success("组织已删除");
      setDeleting(undefined);
      setDetailsOpen(false);
      await refreshOrganizations();
      onSelectedOrganizationChange(fallbackId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeletingBusy(false);
    }
  };

  let content;
  if (loading && data === undefined) {
    content = <OrganizationExplorerSkeleton />;
  } else if (error !== null && data === undefined) {
    content = (
      <div className="flex flex-col items-start gap-3">
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>无法获取组织列表，请检查网络连接后重试。</AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={() => { void send(); }}>
          重试
        </Button>
      </div>
    );
  } else if (data?.length === 0) {
    content = (
      <Empty className="min-h-80 border">
        <EmptyMedia variant="icon">
          <Building2 />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>暂无组织</EmptyTitle>
          <EmptyDescription>创建第一个根组织，开始搭建组织结构。</EmptyDescription>
        </EmptyHeader>
        <Can permission="organizations.create">
          <EmptyContent>
            <Button onClick={() => { setCreatingParentId(null); }}>
              <Plus data-icon="inline-start" />
              新建根组织
            </Button>
          </EmptyContent>
        </Can>
      </Empty>
    );
  } else {
    content = (
      <>
        <div className="grid min-h-128 flex-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <Card className="min-h-128">
            <CardHeader>
              <CardTitle>组织结构</CardTitle>
              <CardDescription className="tabular-nums">
                共
                {data?.length ?? 0}
                {" "}
                个组织
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1">
              <OrganizationTree
                index={index}
                selectedId={selectedOrganization?.id}
                onSelect={(id) => { selectOrganization(id, true); }}
              />
            </CardContent>
          </Card>
          <div className="hidden min-w-0 lg:block">
            <OrganizationDetails
              index={index}
              organization={selectedOrganization}
              onCreateChild={(organization) => { setCreatingParentId(organization.id); }}
              onEdit={setEditing}
              onDelete={setDeleting}
              onSelect={(id) => { selectOrganization(id); }}
            />
          </div>
        </div>

        <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SheetContent className="overflow-y-auto data-[side=right]:w-full sm:data-[side=right]:max-w-xl" side="right">
            <SheetHeader>
              <SheetTitle>组织详情</SheetTitle>
              <SheetDescription>查看并管理所选组织。</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-4">
              <OrganizationDetails
                index={index}
                organization={selectedOrganization}
                onCreateChild={(organization) => {
                  setDetailsOpen(false);
                  setCreatingParentId(organization.id);
                }}
                onEdit={(organization) => {
                  setDetailsOpen(false);
                  setEditing(organization);
                }}
                onDelete={(organization) => {
                  setDetailsOpen(false);
                  setDeleting(organization);
                }}
                onSelect={(id) => { selectOrganization(id); }}
              />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 p-4 sm:p-6">
      <PageHeader title="组织管理" description="浏览和维护组织层级。">
        <Can permission="organizations.create">
          <Button onClick={() => { setCreatingParentId(null); }}>
            <Plus data-icon="inline-start" />
            新建根组织
          </Button>
        </Can>
      </PageHeader>

      {content}

      <Dialog
        open={creatingParentId !== undefined}
        onOpenChange={(open) => {
          if (!open) {
            setCreatingParentId(undefined);
          }
        }}
      >
        <DialogContent>
          {creatingParentId !== undefined && data !== undefined && (
            <OrganizationForm
              organizations={data}
              defaultParentId={creatingParentId ?? undefined}
              onSuccess={handleCreated}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(undefined);
          }
        }}
      >
        <DialogContent>
          {editing !== undefined && data !== undefined && (
            <OrganizationForm
              key={editing.id}
              organizations={data}
              organization={editing}
              onSuccess={handleUpdated}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting !== undefined}
        onOpenChange={(open) => {
          if (!open && !deletingBusy) {
            setDeleting(undefined);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除组织</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除组织“
              {deleting?.name}
              ”吗？此操作不可撤销。
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
              删除组织
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function OrganizationExplorerSkeleton() {
  return (
    <div className="grid min-h-128 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      {[0, 1].map(panel => (
        <Card key={panel}>
          <CardContent className="flex flex-col gap-3 p-4">
            {[0, 1, 2, 3, 4, 5].map(row => (
              <Skeleton key={row} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
