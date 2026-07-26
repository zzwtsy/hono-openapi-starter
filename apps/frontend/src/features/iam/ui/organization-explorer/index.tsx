import type { Organization } from "@/api/globals";
import { useRequest } from "alova/client";
import { Building2, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Apis from "@/api";
import { Can } from "@/components/can";
import { AsyncListState } from "@/components/shared/async-list";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { buildOrganizationTree } from "../../model/organization-tree";
import { OrganizationDialogs } from "./organization-dialogs";
import { ExplorerContent } from "./organization-explorer-content";
import { OrganizationExplorerSkeleton } from "./organization-explorer-skeleton";

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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isNarrowScreen = useMediaQuery("(max-width: 1023px)");
  const index = useMemo(() => buildOrganizationTree(data ?? []), [data]);
  const selectedOrganization = selectedOrganizationId === undefined
    ? index.byId.get(index.rootIds[0] ?? "")
    : index.byId.get(selectedOrganizationId) ?? index.byId.get(index.rootIds[0] ?? "");

  // data 加载后初始化选中并同步 URL(父控制 selectedOrganizationId)。
  // useMemo 无法调回调(会丢 URL 同步),effect 是合理副作用(非 prop 同步反模式)。
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

  const { mutate: runWithToast, busy: deletingBusy } = useToastMutation();
  const confirmDelete = async () => {
    if (deleting === undefined) {
      return;
    }
    const fallbackId = index.getParent(deleting.id)?.id ?? index.rootIds.find(id => id !== deleting.id);
    const ok = await runWithToast(
      () => Apis.IAM.deleteOrganization({ pathParams: { orgId: deleting.id } }),
      { successMessage: "组织已删除", errorMessage: "删除失败" },
    );
    if (ok) {
      setDeleting(undefined);
      setDetailsOpen(false);
      await refreshOrganizations();
      onSelectedOrganizationChange(fallbackId);
    }
  };

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

      <AsyncListState
        loading={loading}
        error={error}
        data={data}
        onRetry={() => { void send(); }}
        loadingFallback={<OrganizationExplorerSkeleton />}
        errorDescription="无法获取组织列表，请检查网络连接后重试。"
      >
        {data?.length === 0
          ? (
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
            )
          : (
              <ExplorerContent
                index={index}
                organization={selectedOrganization}
                count={data?.length ?? 0}
                detailsOpen={detailsOpen}
                onDetailsOpenChange={setDetailsOpen}
                onSelectInTree={(id) => { selectOrganization(id, true); }}
                onSelectInDetails={(id) => { selectOrganization(id); }}
                onCreateChild={(parentId) => { setCreatingParentId(parentId); }}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            )}
      </AsyncListState>

      <OrganizationDialogs
        creatingParentId={creatingParentId}
        editing={editing}
        deleting={deleting}
        deletingBusy={deletingBusy}
        organizations={data}
        onCloseCreate={() => { setCreatingParentId(undefined); }}
        onCloseEdit={() => { setEditing(undefined); }}
        onCloseDelete={() => { setDeleting(undefined); }}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
        onConfirmDelete={() => { void confirmDelete(); }}
      />
    </div>
  );
}
