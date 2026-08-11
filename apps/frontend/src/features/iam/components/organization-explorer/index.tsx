import type { Organization } from "@/api/globals";
import { useRequest } from "alova/client";
import { Building2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import Apis from "@/api";
import { AsyncListState } from "@/components/shared/async-list";
import { Can } from "@/components/shared/can";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { buildOrganizationTree } from "../../lib/organization-tree";
import { IamDetailSurface } from "../iam-detail-surface";
import { IamWorkbench } from "../iam-workbench";
import { OrganizationDetails } from "../organization-details";
import { OrganizationDialogs } from "./organization-dialogs";
import { OrganizationNavigationPanel } from "./organization-explorer-content";
import { OrganizationExplorerSkeleton } from "./organization-explorer-skeleton";

interface OrganizationExplorerProps {
  selectedOrganizationId?: string;
  onSelectedOrganizationChange: (id?: string) => void;
}

function EmptyOrganizations({ onCreate }: { onCreate: () => void }) {
  return (
    <Empty className="h-full min-h-80 border">
      <EmptyMedia variant="icon"><Building2 /></EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>暂无组织</EmptyTitle>
        <EmptyDescription>创建第一个根组织，开始搭建组织结构。</EmptyDescription>
      </EmptyHeader>
      <Can permission="organizations.create">
        <EmptyContent>
          <Button onClick={onCreate}>
            <Plus data-icon="inline-start" />
            新建根组织
          </Button>
        </EmptyContent>
      </Can>
    </Empty>
  );
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
  const index = useMemo(() => buildOrganizationTree(data ?? []), [data]);
  const selectedOrganization = selectedOrganizationId === undefined
    ? index.byId.get(index.rootIds[0] ?? "")
    : index.byId.get(selectedOrganizationId) ?? index.byId.get(index.rootIds[0] ?? "");

  // data 加载后初始化选中并同步 URL(父控制 selectedOrganizationId)。
  // 选中态 URL-driven:selectedOrganizationId 未指定或失效时,selectedOrganization
  // 派生 fallback(rootIds[0]),不写 URL(用户点选才写)。无 effect 通知父。

  const refreshOrganizations = async () => {
    try {
      await send();
    } catch {
      toast.error("组织已保存，但列表刷新失败，请重试");
    }
  };

  const selectOrganization = (id: string, openDetails = false) => {
    onSelectedOrganizationChange(id);
    if (openDetails) {
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
    <>
      <IamWorkbench
        title="组织管理"
        description="浏览和维护组织层级。"
        actions={(
          <Can permission="organizations.create">
            <Button onClick={() => { setCreatingParentId(null); }}>
              <Plus data-icon="inline-start" />
              新建根组织
            </Button>
          </Can>
        )}
        navigation={(
          <AsyncListState
            loading={loading}
            error={error}
            data={data}
            onRetry={() => { void send(); }}
            loadingFallback={<OrganizationExplorerSkeleton />}
            errorDescription="无法获取组织列表，请检查网络连接后重试。"
          >
            {data?.length === 0
              ? <EmptyOrganizations onCreate={() => { setCreatingParentId(null); }} />
              : (
                  <OrganizationNavigationPanel
                    index={index}
                    selectedId={selectedOrganization?.id}
                    count={data?.length ?? 0}
                    onSelect={(id) => { selectOrganization(id, true); }}
                  />
                )}
          </AsyncListState>
        )}
        detailsOpen={detailsOpen}
        onDetailsOpenChange={setDetailsOpen}
        sheetTitle="组织详情"
        sheetDescription="查看并管理所选组织。"
        renderDetail={mode => selectedOrganization === undefined
          ? (
              <IamDetailSurface mode={mode} title="组织详情">
                <Empty>
                  <EmptyMedia variant="icon"><Building2 /></EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>选择一个组织</EmptyTitle>
                    <EmptyDescription>从组织树中选择节点后查看详情。</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </IamDetailSurface>
            )
          : (
              <OrganizationDetails
                mode={mode}
                index={index}
                organization={selectedOrganization}
                onCreateChild={(org) => {
                  setDetailsOpen(false);
                  setCreatingParentId(org.id);
                }}
                onEdit={(org) => {
                  setDetailsOpen(false);
                  setEditing(org);
                }}
                onDelete={(org) => {
                  setDetailsOpen(false);
                  setDeleting(org);
                }}
                onSelect={(id) => { selectOrganization(id); }}
              />
            )}
      />

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
    </>
  );
}
