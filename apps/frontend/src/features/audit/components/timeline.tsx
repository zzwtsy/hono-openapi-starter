import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TimelineProps {
  children: ReactNode;
  className?: string;
}

function Timeline({ children, className }: TimelineProps) {
  return (
    <div className={cn("relative flex flex-col", className)}>
      {children}
    </div>
  );
}

interface TimelineItemProps {
  children: ReactNode;
  className?: string;
  /** 是否最后一项(不渲染连接线)。 */
  isLast?: boolean;
  /** 节点圆点颜色变体。 */
  variant?: "default" | "destructive";
}

function TimelineItem({ children, className, isLast = false, variant = "default" }: TimelineItemProps) {
  return (
    <div className={cn("relative flex gap-3 pb-6 last:pb-0", className)}>
      {!isLast && (
        <div className="absolute left-1.75 top-4 h-full w-px bg-border" />
      )}
      <div className={cn(
        "mt-1 size-3.75 shrink-0 rounded-full border-2",
        variant === "destructive"
          ? "border-destructive bg-destructive"
          : "border-primary bg-primary",
      )}
      />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}

export { Timeline, TimelineItem };
