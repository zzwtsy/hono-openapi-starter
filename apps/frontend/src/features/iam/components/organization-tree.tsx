import type { OrganizationTreeIndex } from "../organization-tree";
import type { Organization } from "@/api/globals";
import {
  hotkeysCoreFeature,
  searchFeature,
  selectionFeature,
  syncDataLoaderFeature,
} from "@headless-tree/core";
import { useTree } from "@headless-tree/react";
import { Building2, ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ORGANIZATION_TREE_ROOT_ID,

} from "../organization-tree";

interface OrganizationTreeItemData {
  name: string;
  organization?: Organization;
}

interface OrganizationTreeProps {
  index: OrganizationTreeIndex;
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function OrganizationTree({ index, selectedId, onSelect }: OrganizationTreeProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>(() => [
    ...index.rootIds,
    ...(selectedId === undefined ? [] : index.getAncestors(selectedId).map(item => item.id)),
  ]);
  const selectedItems = selectedId === undefined ? [] : [selectedId];
  // Headless Tree compares expandedItems by reference while updating config during render.
  const visibleExpandedItems = useMemo(() => selectedId === undefined
    ? expandedItems
    : [...new Set([...expandedItems, ...index.getAncestors(selectedId).map(item => item.id)])], [expandedItems, index, selectedId]);
  const tree = useTree<OrganizationTreeItemData>({
    rootItemId: ORGANIZATION_TREE_ROOT_ID,
    dataLoader: {
      getItem: (id) => {
        if (id === ORGANIZATION_TREE_ROOT_ID) {
          return { name: "组织" };
        }
        const organization = index.byId.get(id);
        return { name: organization?.name ?? id, organization };
      },
      getChildren: id => id === ORGANIZATION_TREE_ROOT_ID
        ? index.rootIds
        : index.getChildren(id).map(child => child.id),
    },
    getItemName: item => item.getItemData().name,
    isItemFolder: item => item.getId() === ORGANIZATION_TREE_ROOT_ID || index.getChildren(item.getId()).length > 0,
    state: { expandedItems: visibleExpandedItems, selectedItems },
    setExpandedItems,
    setSelectedItems: (updater) => {
      const next = typeof updater === "function" ? updater(selectedItems) : updater;
      const nextId = next.at(-1);
      if (nextId !== undefined && nextId !== ORGANIZATION_TREE_ROOT_ID) {
        onSelect(nextId);
      }
    },
    onPrimaryAction: (item) => {
      if (item.getId() !== ORGANIZATION_TREE_ROOT_ID) {
        onSelect(item.getId());
      }
    },
    features: [syncDataLoaderFeature, selectionFeature, hotkeysCoreFeature, searchFeature],
  });

  useEffect(() => {
    tree.scheduleRebuildTree();
  }, [index, tree]);

  const matchingItems = tree.getSearchMatchingItems();
  const focusMatch = (offset: number) => {
    if (matchingItems.length === 0) {
      return;
    }
    const currentId = tree.getFocusedItem()?.getId();
    const currentIndex = matchingItems.findIndex(item => item.getId() === currentId);
    const nextIndex = (currentIndex + offset + matchingItems.length) % matchingItems.length;
    matchingItems[nextIndex]?.setFocused();
    void matchingItems[nextIndex]?.scrollTo({ block: "nearest" });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor="organization-search" className="sr-only">搜索组织</label>
        <Input
          {...tree.getSearchInputElementProps()}
          id="organization-search"
          name="organization-search"
          autoComplete="off"
          placeholder="搜索组织…"
          className="min-w-0 flex-1"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              tree.closeSearch();
            }
          }}
        />
        {tree.getSearchValue() !== "" && (
          <>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {matchingItems.length}
              {" "}
              项
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="上一个匹配组织"
              disabled={matchingItems.length === 0}
              onMouseDown={event => event.preventDefault()}
              onClick={() => { focusMatch(-1); }}
            >
              <ChevronUp />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="下一个匹配组织"
              disabled={matchingItems.length === 0}
              onMouseDown={event => event.preventDefault()}
              onClick={() => { focusMatch(1); }}
            >
              <ChevronDown />
            </Button>
          </>
        )}
      </div>

      <div
        {...tree.getContainerProps("组织结构")}
        className="min-h-72 flex-1 overflow-y-auto rounded-lg border bg-background p-1 outline-none focus-within:ring-3 focus-within:ring-ring/50"
      >
        {tree.getItems().map((item) => {
          const organization = item.getItemData().organization;
          if (organization === undefined) {
            return null;
          }
          const isFolder = item.isFolder();
          const isExpanded = item.isExpanded();
          const isSelected = item.isSelected();
          const isMatching = item.isMatchingSearch();
          const itemProps = item.getProps();
          return (
            <div
              key={item.getKey()}
              {...itemProps}
              className={cn(
                "group/tree-item flex min-h-9 min-w-0 items-center gap-1 rounded-md pr-2 text-sm outline-none select-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/60",
                isSelected && "bg-accent text-accent-foreground",
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
                      <ChevronRight className={cn("transition-transform duration-150", isExpanded && "rotate-90")} />
                    </button>
                  )
                : <span className="size-7 shrink-0" aria-hidden="true" />}
              <Building2 className="shrink-0" aria-hidden="true" />
              <span className={cn("min-w-0 flex-1 truncate", isMatching && "font-medium text-primary")}>
                {organization.name}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        使用方向键浏览层级，输入文字可快速定位组织。
      </p>
    </div>
  );
}
