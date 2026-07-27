import type { OrganizationTreeIndex } from "../lib/organization-tree";
import type { OrganizationTreeItemData } from "./organization-tree-item";
import {
  hotkeysCoreFeature,
  searchFeature,
  selectionFeature,
  syncDataLoaderFeature,
} from "@headless-tree/core";
import { useTree } from "@headless-tree/react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ORGANIZATION_TREE_ROOT_ID } from "../lib/organization-tree";
import { OrganizationTreeItem } from "./organization-tree-item";

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
        {tree.getItems().map(item => (
          <OrganizationTreeItem key={item.getKey()} item={item} onSelect={onSelect} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        使用方向键浏览层级，输入文字可快速定位组织。
      </p>
    </div>
  );
}
