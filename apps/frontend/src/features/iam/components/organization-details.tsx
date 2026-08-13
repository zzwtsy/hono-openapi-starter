import type { OrganizationTreeIndex } from "../lib/organization-tree";
import type { IamDetailMode } from "./iam-workbench";
import type { Organization } from "@/api/globals";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { useId } from "react";
import { ResourceActions } from "@/components/shared/resource-actions";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemContent, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { hasPermission } from "@/lib/permissions";
import { useTargetCapabilities } from "../hooks/use-iam-capabilities";
import { IamDetailSurface } from "./iam-detail-surface";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" });

interface OrganizationDetailsProps {
  mode: IamDetailMode;
  index: OrganizationTreeIndex;
  organization?: Organization;
  onCreateChild: (organization: Organization) => void;
  onDelete: (organization: Organization) => void;
  onEdit: (organization: Organization) => void;
  onSelect: (id: string) => void;
}

export function OrganizationDetails({
  mode,
  index,
  organization,
  onCreateChild,
  onDelete,
  onEdit,
  onSelect,
}: OrganizationDetailsProps) {
  const childOrganizationsTitleId = useId();
  const targetCapabilities = useTargetCapabilities(organization?.id ?? "").data?.permissionCodes;
  if (organization === undefined) {
    return (
      <IamDetailSurface mode={mode} title="组织详情">
        <Empty>
          <EmptyMedia variant="icon"><Building2 /></EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>选择一个组织</EmptyTitle>
            <EmptyDescription>从组织树中选择节点后查看详情。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </IamDetailSurface>
    );
  }

  const parent = index.getParent(organization.id);
  const children = index.getChildren(organization.id);
  const isSystemRoot = organization.parentId == null;
  const canCreate = hasPermission(targetCapabilities, "organizations.create");
  const canUpdate = hasPermission(targetCapabilities, "organizations.update");
  const canDelete = !isSystemRoot && hasPermission(targetCapabilities, "organizations.delete");
  const secondaryActions = [
    { id: "edit", allowed: canUpdate, label: "编辑", icon: Pencil, onClick: () => { onEdit(organization); } },
    {
      id: "delete",
      allowed: canDelete,
      label: "删除",
      icon: Trash2,
      variant: "destructive" as const,
      disabled: children.length > 0,
      disabledReason: children.length > 0 ? "需先移动或删除所有直接子组织" : undefined,
      onClick: () => { onDelete(organization); },
    },
  ];

  return (
    <IamDetailSurface
      mode={mode}
      title={organization.name}
      description={index.getDisplayPath(organization.id)}
      actions={canCreate || canUpdate || canDelete
        ? (
            <div className="flex items-center gap-1">
              {canCreate && (
                <Button variant="outline" size="sm" onClick={() => { onCreateChild(organization); }}>
                  <Plus data-icon="inline-start" />
                  新建子组织
                </Button>
              )}
              <ResourceActions label={`${organization.name} 的操作`} items={secondaryActions} />
            </div>
          )
        : undefined}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pt-3">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">上级组织</dt>
            <dd className="wrap-break-word font-medium">
              {parent?.name ?? (isSystemRoot ? "无（系统根）" : "管理范围根")}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">直接子组织</dt>
            <dd className="font-medium tabular-nums">{children.length}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">创建时间</dt>
            <dd className="font-medium tabular-nums">{dateFormatter.format(new Date(organization.createdAt))}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">更新时间</dt>
            <dd className="font-medium tabular-nums">{dateFormatter.format(new Date(organization.updatedAt))}</dd>
          </div>
        </dl>

        <Separator />

        <section aria-labelledby={childOrganizationsTitleId} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id={childOrganizationsTitleId} className="font-medium">子组织</h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {children.length}
              {" "}
              个
            </span>
          </div>
          {children.length === 0
            ? (
                <Empty className="min-h-28 p-4">
                  <EmptyHeader>
                    <EmptyTitle>暂无子组织</EmptyTitle>
                    <EmptyDescription>当前组织没有直接子组织。</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )
            : (
                <ItemGroup className="grid gap-2 sm:grid-cols-2">
                  {children.map(child => (
                    <Item
                      key={child.id}
                      render={<button type="button" />}
                      variant="outline"
                      size="sm"
                      onClick={() => { onSelect(child.id); }}
                    >
                      <ItemMedia variant="icon"><Building2 /></ItemMedia>
                      <ItemContent><ItemTitle>{child.name}</ItemTitle></ItemContent>
                    </Item>
                  ))}
                </ItemGroup>
              )}
        </section>
      </div>
    </IamDetailSurface>
  );
}
