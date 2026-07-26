import { format } from "date-fns";
import { CalendarIcon, XIcon } from "lucide-react";
import { zhCN } from "react-day-picker/locale";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Calendar } from "@/shared/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

// shadcn Calendar(react-day-picker 包装) + Base UI Popover 的薄包装。单选日期粒度
// (授权过期用),不含时分。value 为 ISO 字符串(与后端 expiresAt 一致),null/undefined 表示永不过期。
// 组合 shadcn Calendar + Base UI Popover;PopoverTrigger 用 Base UI render prop(base-nova 无 asChild)。
// 清除按钮为独立 button(带 aria-label),不再嵌套在 trigger 内。

// 禁用今天之前的日期(过期时间应在未来)。模块级常量,避免 render 内 new Date() 破坏纯度。
const disabledPast = { before: new Date() };

interface DatePickerProps {
  value?: string | null;
  onChange: (iso: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export function DatePicker({ value, onChange, placeholder = "永不过期", className, disabled, id }: DatePickerProps) {
  const selected = value != null ? new Date(value) : undefined;

  return (
    <Popover>
      <div className="relative">
        <PopoverTrigger
          render={props => (
            <Button
              id={id}
              type="button"
              variant="outline"
              size="default"
              disabled={disabled}
              className={cn("w-full justify-start font-normal", selected && "pr-8", !selected && "text-muted-foreground", className)}
              {...props}
            >
              <CalendarIcon className="size-4" />
              {selected ? format(selected, "yyyy年M月d日") : placeholder}
            </Button>
          )}
        />
        {selected != null && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="清除日期"
            disabled={disabled}
            className="absolute top-1/2 right-1.5 -translate-y-1/2"
            onClick={() => { onChange(null); }}
          >
            <XIcon className="size-3.5" />
          </Button>
        )}
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date != null ? date.toISOString() : null);
          }}
          disabled={disabledPast}
          locale={zhCN}
          weekStartsOn={1}
        />
      </PopoverContent>
    </Popover>
  );
}
