import type { PermissionRef } from "@/api/globals";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface RolePreviewCollapsibleProps {
  previewPerms?: PermissionRef[];
  newPerms?: PermissionRef[];
}

export function RolePreviewCollapsible({ previewPerms, newPerms }: RolePreviewCollapsibleProps) {
  const newPermsSet = new Set(newPerms?.map(permission => permission.code) ?? []);

  return (
    <Collapsible className="group/collapsible">
      <CollapsibleTrigger render={<Button variant="ghost" size="sm" className="w-full justify-start" />}>
        <ChevronRight className="size-4 transition-transform group-data-open/collapsible:rotate-90" />
        <span>
          该角色含
          {" "}
          {previewPerms?.length ?? 0}
          {" "}
          项权限
          {newPerms !== undefined && newPerms.length > 0 && ` · 授予后新增 ${newPerms.length} 项`}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-wrap gap-1 rounded-lg border p-2">
          {previewPerms === undefined || previewPerms.length === 0
            ? <span className="text-sm text-muted-foreground">该角色暂无权限</span>
            : previewPerms.map(p => (
                <Badge
                  key={p.code}
                  variant={newPermsSet.has(p.code) ? "default" : "secondary"}
                  className="text-xs"
                >
                  {p.label}
                </Badge>
              ))}
        </div>
        {newPerms !== undefined && newPerms.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">高亮为用户当前未持有的新增权限。</p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
