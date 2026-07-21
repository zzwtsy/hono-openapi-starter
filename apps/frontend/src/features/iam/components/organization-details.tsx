import type { OrganizationTreeIndex } from "../organization-tree";
import type { Organization } from "@/api/globals";
import { Building2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { useCan, useCanAny } from "@/hooks/use-permissions";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" });

interface OrganizationDetailsProps {
  index: OrganizationTreeIndex;
  organization?: Organization;
  onCreateChild: (organization: Organization) => void;
  onDelete: (organization: Organization) => void;
  onEdit: (organization: Organization) => void;
  onSelect: (id: string) => void;
}

export function OrganizationDetails({
  index,
  organization,
  onCreateChild,
  onDelete,
  onEdit,
  onSelect,
}: OrganizationDetailsProps) {
  const canCreate = useCan("organizations.create");
  const canUpdate = useCan("organizations.update");
  const canDelete = useCan("organizations.delete");
  const canManage = useCanAny(["organizations.create", "organizations.update", "organizations.delete"]);

  if (organization === undefined) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-1 items-center justify-center">
          <Empty>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>选择一个组织</EmptyTitle>
              <EmptyDescription>从组织树中选择节点后查看详情。</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  const parent = index.getParent(organization.id);
  const children = index.getChildren(organization.id);

  return (
    <Card className="h-full">
      <CardHeader className="has-data-[slot=card-action]:grid-cols-1 sm:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <CardTitle className="break-words text-lg">{organization.name}</CardTitle>
        <CardDescription className="break-words">{index.getDisplayPath(organization.id)}</CardDescription>
        {canManage && (
          <CardAction className="col-start-1 row-span-1 row-start-auto mt-3 flex flex-wrap items-center justify-self-start sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:justify-self-end">
            {canCreate && (
              <Button variant="outline" size="sm" onClick={() => { onCreateChild(organization); }}>
                <Plus data-icon="inline-start" />
                新建子组织
              </Button>
            )}
            {canUpdate && (
              <Button variant="ghost" size="sm" onClick={() => { onEdit(organization); }}>
                <Pencil data-icon="inline-start" />
                编辑
              </Button>
            )}
            {canDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={(
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`更多组织操作：${organization.name}`}
                    />
                  )}
                >
                  <MoreHorizontal />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={children.length > 0}
                      onClick={() => { onDelete(organization); }}
                    >
                      <Trash2 />
                      {children.length > 0 ? "请先处理子组织" : "删除组织"}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">上级组织</dt>
            <dd className="break-words font-medium">{parent?.name ?? "无（根组织）"}</dd>
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

        <section aria-labelledby="child-organizations-title" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="child-organizations-title" className="font-medium">子组织</h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {children.length}
              {" "}
              个
            </span>
          </div>
          {children.length === 0
            ? <p className="text-sm text-muted-foreground">当前组织没有直接子组织。</p>
            : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {children.map(child => (
                    <Button
                      key={child.id}
                      variant="outline"
                      className="min-w-0 justify-start"
                      onClick={() => { onSelect(child.id); }}
                    >
                      <Building2 data-icon="inline-start" />
                      <span className="truncate">{child.name}</span>
                    </Button>
                  ))}
                </div>
              )}
        </section>
      </CardContent>
    </Card>
  );
}
