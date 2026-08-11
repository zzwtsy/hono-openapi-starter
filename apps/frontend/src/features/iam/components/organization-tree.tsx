import type { OrganizationTreeIndex } from "../lib/organization-tree";
import type { OrganizationTreeItemData } from "./organization-tree-item";
import {
  hotkeysCoreFeature,
  searchFeature,
  selectionFeature,
  syncDataLoaderFeature,
} from "@headless-tree/core";
import { useTree } from "@headless-tree/react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
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
  const [prevRootIds, setPrevRootIds] = useState(index.rootIds);
  // 新增根默认展开:rootIds 变化(新增根组织)时把新根补进 expandedItems。
  // render 期间调整 state(React 官方模式,无 effect/set-state-in-effect 警告);
  // index.rootIds 引用稳定(index 不变则不变),引用比较不循环。diff 守护避免无谓渲染。
  if (index.rootIds !== prevRootIds) {
    setPrevRootIds(index.rootIds);
    setExpandedItems((prev) => {
      const existing = new Set(prev);
      const additions = index.rootIds.filter(id => !existing.has(id));
      return additions.length === 0 ? prev : [...prev, ...additions];
    });
  }
  const selectedItems = selectedId === undefined ? [] : [selectedId];
  // 选中项始终可见:把选中项的祖先强制并入展开集。副作用是选中项的祖先不可折叠(设计意图)。
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

  // index 变化(组织列表刷新)后重建树:dataLoader 闭包捕获本次 render 的 index,
  // 此时新 index 已就绪,用同步 rebuildTree(官方 syncDataLoader 推荐;scheduleRebuildTree 已弃用,
  // 仅用于数据在 useState、下次 render 才可见的场景,本组件不适用)。
  useEffect(() => {
    tree.rebuildTree();
  }, [index, tree]);

  const matchingItems = tree.getSearchMatchingItems();
  const focusMatch = (offset: number) => {
    if (matchingItems.length === 0) {
      return;
    }
    const currentId = tree.getFocusedItem()?.getId();
    const currentIndex = matchingItems.findIndex(item => item.getId() === currentId);
    // 焦点不在匹配项时(findIndex 返回 -1):上一个跳末项、下一个跳首项。
    let nextIndex: number;
    if (currentIndex === -1) {
      nextIndex = offset > 0 ? 0 : matchingItems.length - 1;
    } else {
      nextIndex = (currentIndex + offset + matchingItems.length) % matchingItems.length;
    }
    matchingItems[nextIndex]?.setFocused();
    void matchingItems[nextIndex]?.scrollTo({ block: "nearest" });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor="organization-search" className="sr-only">搜索组织</label>
        <InputGroup className="min-w-0 flex-1">
          <InputGroupAddon><Search /></InputGroupAddon>
          <InputGroupInput
            {...tree.getSearchInputElementProps()}
            id="organization-search"
            name="organization-search"
            autoComplete="off"
            placeholder="搜索组织…"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                tree.closeSearch();
              }
            }}
          />
        </InputGroup>
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
        className="flex min-h-72 flex-1 flex-col gap-0.5 overflow-y-auto rounded-lg border bg-background p-1 outline-none focus-within:ring-3 focus-within:ring-ring/50"
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
