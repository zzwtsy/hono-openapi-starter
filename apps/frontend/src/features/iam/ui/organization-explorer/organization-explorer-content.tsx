import type { OrganizationTreeIndex } from "../../model/organization-tree";
import type { Organization } from "@/shared/api/globals";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import { OrganizationDetails } from "../organization-details";
import { OrganizationTree } from "../organization-tree";

interface ExplorerContentProps {
  index: OrganizationTreeIndex;
  organization?: Organization;
  count: number;
  detailsOpen: boolean;
  onDetailsOpenChange: (open: boolean) => void;
  onSelectInTree: (id: string) => void;
  onSelectInDetails: (id: string) => void;
  onCreateChild: (parentId: string) => void;
  onEdit: (org: Organization) => void;
  onDelete: (org: Organization) => void;
}

/**
 * 组织浏览器内容区:双栏(树 + 详情)+ 移动 Sheet。
 * 抽出以消除 OrganizationDetails 在桌面 / 移动各渲染一遍的 JSX 重复(见 code-style §7)。
 */
export function ExplorerContent({
  index,
  organization,
  count,
  detailsOpen,
  onDetailsOpenChange,
  onSelectInTree,
  onSelectInDetails,
  onCreateChild,
  onEdit,
  onDelete,
}: ExplorerContentProps) {
  return (
    <>
      <div className="grid min-h-128 flex-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Card className="min-h-128">
          <CardHeader>
            <CardTitle>组织结构</CardTitle>
            <CardDescription className="tabular-nums">
              共
              {" "}
              {count}
              {" "}
              个组织
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1">
            <OrganizationTree
              index={index}
              selectedId={organization?.id}
              onSelect={onSelectInTree}
            />
          </CardContent>
        </Card>
        <div className="hidden min-w-0 lg:block">
          <OrganizationDetails
            index={index}
            organization={organization}
            onCreateChild={org => onCreateChild(org.id)}
            onEdit={onEdit}
            onDelete={onDelete}
            onSelect={onSelectInDetails}
          />
        </div>
      </div>

      <Sheet open={detailsOpen} onOpenChange={onDetailsOpenChange}>
        <SheetContent className="overflow-y-auto data-[side=right]:w-full sm:data-[side=right]:max-w-xl" side="right">
          <SheetHeader>
            <SheetTitle>组织详情</SheetTitle>
            <SheetDescription>查看并管理所选组织。</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <OrganizationDetails
              index={index}
              organization={organization}
              onCreateChild={(org) => {
                onDetailsOpenChange(false);
                onCreateChild(org.id);
              }}
              onEdit={(org) => {
                onDetailsOpenChange(false);
                onEdit(org);
              }}
              onDelete={(org) => {
                onDetailsOpenChange(false);
                onDelete(org);
              }}
              onSelect={onSelectInDetails}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
