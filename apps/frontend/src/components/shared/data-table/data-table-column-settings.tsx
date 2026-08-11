import type { Plugins } from "@dnd-kit/abstract";
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/react";
import { RestrictToVerticalAxis } from "@dnd-kit/abstract/modifiers";
import { Accessibility, Feedback } from "@dnd-kit/dom";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { Columns3, GripVertical, RotateCcw } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

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

function ColumnSettingRow({ column, index, onlyVisible, onToggle }: { column: DataTableColumnSetting; index: number; onlyVisible: boolean; onToggle: (id: string, checked: boolean) => void }) {
  const sortable = useSortable({
    id: column.id,
    index,
    modifiers: [RestrictToVerticalAxis],
    transition: { duration: 150, easing: "ease-out" },
  });

  return (
    <div
      ref={sortable.ref}
      className="flex min-w-0 select-none items-center gap-1 rounded-md px-1 py-0.5 hover:bg-muted/50"
    >
      <Button
        ref={sortable.handleRef}
        type="button"
        variant="ghost"
        size="icon-sm"
        className="touch-none cursor-grab text-muted-foreground active:translate-y-0 active:cursor-grabbing"
        aria-label={`拖拽列：${column.label}`}
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
  const byId = useMemo(() => new Map(columns.map(column => [column.id, column])), [columns]);
  const items = useMemo(() => order.filter(id => byId.has(id)), [byId, order]);
  const onlyVisible = columns.filter(column => column.visible && column.canHide).length <= 1;
  const plugins = useMemo(() => {
    const labelOf = (id: string) => byId.get(id)?.label ?? id;
    return (defaults: Plugins) => [
      ...defaults,
      Accessibility.configure({
        screenReaderInstructions: {
          draggable: "按空格或回车键抓取列，使用上下方向键移动，按空格或回车键放置，按 Esc 取消。",
        },
        announcements: {
          dragstart: ({ operation: { source } }: DragStartEvent) => source === null ? undefined : `已抓取列 ${labelOf(String(source.id))}。`,
          dragover: ({ operation: { source } }: DragOverEvent) => isSortable(source) ? `列 ${labelOf(String(source.id))} 已移动到第 ${source.index + 1} 位。` : undefined,
          dragend: ({ operation: { source }, canceled }: DragEndEvent) => {
            if (source === null) {
              return undefined;
            }
            if (canceled) {
              return `已取消列 ${labelOf(String(source.id))} 的移动。`;
            }
            return isSortable(source)
              ? `列 ${labelOf(String(source.id))} 已放置在第 ${source.index + 1} 位。`
              : `已放置列 ${labelOf(String(source.id))}。`;
          },
        },
      }),
      Feedback.configure({ dropAnimation: { duration: 150, easing: "ease-out" } }),
    ];
  }, [byId]);

  const handleDragEnd = ({ canceled, operation: { source } }: DragEndEvent) => {
    if (canceled || !isSortable(source) || source.initialIndex === source.index) {
      return;
    }
    const overId = items[source.index];
    if (overId !== undefined) {
      onMove(String(source.id), overId);
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
        <DragDropProvider plugins={plugins} onDragEnd={handleDragEnd}>
          <div className="flex max-h-72 flex-col gap-0.5 overflow-x-hidden overflow-y-auto" role="list" aria-label="可配置列">
            {items.map((id, index) => {
              const column = byId.get(id);
              return column === undefined
                ? null
                : <ColumnSettingRow key={column.id} column={column} index={index} onlyVisible={onlyVisible} onToggle={onToggle} />;
            })}
          </div>
        </DragDropProvider>
        <Separator />
        <Button type="button" variant="ghost" size="sm" className="w-full justify-start" onClick={onReset}>
          <RotateCcw data-icon="inline-start" aria-hidden="true" />
          恢复默认
        </Button>
      </PopoverContent>
    </Popover>
  );
}
