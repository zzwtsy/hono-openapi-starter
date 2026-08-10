import type { Announcements, DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { closestCenter, DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Columns3, GripVertical, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface DataTableColumnSetting {
  id: string;
  label: string;
  visible: boolean;
  canHide: boolean;
}

interface DataTableColumnSettingsProps {
  columns: readonly DataTableColumnSetting[];
  order: readonly string[];
  onToggle: (id: string, checked: boolean) => void;
  onMove: (activeId: string, overId: string) => void;
  onReset: () => void;
}

function ColumnDragOverlay({ column }: { column: DataTableColumnSetting | undefined }) {
  return createPortal(
    <DragOverlay>
      {column === undefined
        ? null
        : <div className="flex h-9 w-full items-center rounded-md border bg-popover px-3 text-sm font-medium shadow-md" aria-hidden="true">{column.label}</div>}
    </DragOverlay>,
    document.body,
  );
}

function ColumnSettingRow({ column, onlyVisible, onToggle }: { column: DataTableColumnSetting; onlyVisible: boolean; onToggle: (id: string, checked: boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex min-w-0 select-none items-center gap-1 rounded-md px-1 py-0.5 hover:bg-muted/50", isDragging && "opacity-40")}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="touch-none cursor-grab text-muted-foreground active:translate-y-0 active:cursor-grabbing"
        aria-label={`拖拽列：${column.label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden="true" />
      </Button>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{column.label}</span>
      <Checkbox
        checked={column.visible}
        disabled={!column.canHide || (onlyVisible && column.visible)}
        aria-label={`${column.visible ? "隐藏" : "显示"}列：${column.label}`}
        onCheckedChange={(checked) => {
          if (checked === true || checked === false) {
            onToggle(column.id, checked);
          }
        }}
      />
    </div>
  );
}

export function DataTableColumnSettings({ columns, order, onToggle, onMove, onReset }: DataTableColumnSettingsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const byId = useMemo(() => new Map(columns.map(column => [column.id, column])), [columns]);
  const items = useMemo(() => order.filter(id => byId.has(id)), [byId, order]);
  const activeColumn = activeId === null ? undefined : byId.get(activeId);
  const onlyVisible = columns.filter(column => column.visible && column.canHide).length <= 1;
  const announcements = useMemo<Announcements>(() => {
    const labelOf = (id: string) => byId.get(id)?.label ?? id;
    return {
      onDragStart: ({ active }: Pick<DragStartEvent, "active">) => `已抓取列 ${labelOf(String(active.id))}，使用方向键移动，按空格放置。`,
      onDragOver: ({ active, over }) => over === null ? undefined : `列 ${labelOf(String(active.id))} 移动到 ${labelOf(String(over.id))} 附近。`,
      onDragEnd: ({ active, over }: Pick<DragEndEvent, "active" | "over">) => over === null ? `已取消列 ${labelOf(String(active.id))} 的移动。` : `列 ${labelOf(String(active.id))} 已放置在 ${labelOf(String(over.id))} 位置。`,
      onDragCancel: ({ active }: { active: DragEndEvent["active"] }) => `已取消列 ${labelOf(String(active.id))} 的移动。`,
    };
  }, [byId]);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (over !== null && active.id !== over.id) {
      onMove(String(active.id), String(over.id));
    }
  };

  return (
    <Popover>
      <PopoverTrigger
        render={triggerProps => (
          <Button type="button" variant="outline" size="sm" aria-label="列设置" title="列设置" {...triggerProps}>
            <Columns3 data-icon="inline-start" aria-hidden="true" />
            列设置
          </Button>
        )}
      />
      <PopoverContent align="end">
        <PopoverHeader>
          <PopoverTitle>列设置</PopoverTitle>
          <PopoverDescription>拖拽调整顺序，勾选控制显示。</PopoverDescription>
        </PopoverHeader>
        <DndContext
          sensors={sensors}
          modifiers={[restrictToVerticalAxis]}
          collisionDetection={closestCenter}
          accessibility={{ announcements }}
          onDragStart={({ active }: DragStartEvent) => { setActiveId(String(active.id)); }}
          onDragCancel={() => { setActiveId(null); }}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <div className="flex max-h-72 flex-col gap-0.5 overflow-x-hidden overflow-y-auto" role="list" aria-label="可配置列">
              {items.map((id) => {
                const column = byId.get(id);
                return column === undefined
                  ? null
                  : <ColumnSettingRow key={column.id} column={column} onlyVisible={onlyVisible} onToggle={onToggle} />;
              })}
            </div>
          </SortableContext>
          <ColumnDragOverlay column={activeColumn} />
        </DndContext>
        <Separator />
        <Button type="button" variant="ghost" size="sm" className="w-full justify-start" onClick={onReset}>
          <RotateCcw data-icon="inline-start" aria-hidden="true" />
          恢复默认
        </Button>
      </PopoverContent>
    </Popover>
  );
}
