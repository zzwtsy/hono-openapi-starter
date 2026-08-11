import type { OrganizationTreeIndex } from "../../lib/organization-tree";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationTree } from "../organization-tree";

interface ExplorerContentProps {
  index: OrganizationTreeIndex;
  selectedId?: string;
  count: number;
  onSelect: (id: string) => void;
}

/** 组织工作台左侧导航；详情挂载与 Sheet 由 IamWorkbench 统一负责。 */
export function OrganizationNavigationPanel({ index, selectedId, count, onSelect }: ExplorerContentProps) {
  return (
    <Card size="sm" className="h-full min-h-0">
      <CardHeader>
        <CardTitle>组织结构</CardTitle>
        <CardDescription className="tabular-nums">
          共
          {count}
          {" "}
          个组织
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1">
        <OrganizationTree index={index} selectedId={selectedId} onSelect={onSelect} />
      </CardContent>
    </Card>
  );
}
