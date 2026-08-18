import type { ItemInstance } from "@headless-tree/core";
import type { Organization } from "@/api/globals";
import { Building2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OrganizationTreeItemData {
  name: string;
  organization?: Organization;
}

interface OrganizationTreeItemProps {
  item: ItemInstance<OrganizationTreeItemData>;
  onSelect: (id: string) => void;
}

export function OrganizationTreeItem({ item, onSelect }: OrganizationTreeItemProps) {
  const organization = item.getItemData().organization;
  if (organization === undefined) {
    return null;
  }
  const isFolder = item.isFolder();
  const isExpanded = item.isExpanded();
  const isSelected = item.isSelected();
  const isFocused = item.isFocused();
  const isMatching = item.isMatchingSearch();

  return (
    <div
      {...item.getProps()}
      className={cn(
        "group/tree-item flex min-h-9 min-w-0 items-center gap-1 rounded-lg pr-2 text-sm outline-none select-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/60",
        isSelected && "bg-muted/50 text-foreground",
        // focused(roving tabindex 键盘焦点):方向键移动的是 focused(非 selected),
        // 用 ring 标记位置;无此样式则上下方向键"看似无效"。
        isFocused && !isSelected && "ring-2 ring-ring ring-inset",
      )}
      style={{ paddingLeft: `${item.getItemMeta().level * 16 + 4}px` }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(organization.id);
        }
      }}
    >
      {isFolder
        ? (
            <button
              type="button"
              tabIndex={-1}
              className="flex size-7 shrink-0 items-center justify-center rounded-sm hover:bg-background/70"
              aria-label={`${isExpanded ? "收起" : "展开"}${organization.name}`}
              onClick={(event) => {
                event.stopPropagation();
                if (isExpanded) {
                  item.collapse();
                } else {
                  item.expand();
                }
              }}
            >
              <ChevronRight className={cn("size-4 transition-transform duration-150", isExpanded && "rotate-90")} />
            </button>
          )
        : <span className="size-7 shrink-0" aria-hidden="true" />}
      <Building2 className="size-4 shrink-0" aria-hidden="true" />
      <span className={cn("min-w-0 flex-1 truncate", isMatching && "font-medium text-primary")}>
        {organization.name}
      </span>
    </div>
  );
}
