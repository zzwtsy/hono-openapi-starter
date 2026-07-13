import { format } from "date-fns";
import { CalendarIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// shadcn Calendar(react-day-picker 包装) + Base UI Popover 的薄包装。单选日期粒度
// (授权过期用),不含时分。value 为 ISO 字符串(与后端 expiresAt 一致),null/undefined 表示永不过期。
// 沿用 shadcn 官方 date-picker-demo 组合模式;PopoverTrigger 用 Base UI render prop(base-nova 无 asChild)。

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
      <PopoverTrigger
        render={props => (
          <Button
            id={id}
            variant="outline"
            size="default"
            disabled={disabled}
            className={cn("w-full justify-start font-normal", !selected && "text-muted-foreground", className)}
            {...props}
          >
            <CalendarIcon className="size-4" />
            {selected ? format(selected, "yyyy-MM-dd") : placeholder}
            {selected != null && (
              <XIcon
                className="ml-auto size-3.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              />
            )}
          </Button>
        )}
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date != null ? date.toISOString() : null);
          }}
          disabled={disabledPast}
        />
      </PopoverContent>
    </Popover>
  );
}
