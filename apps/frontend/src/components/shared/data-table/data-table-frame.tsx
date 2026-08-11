import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DataTableFrame({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex min-h-0 flex-1 flex-col gap-3", className)}>{children}</div>;
}

export function DataTableToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex shrink-0 flex-wrap items-center justify-end gap-2", className)}>{children}</div>;
}

export function DataTableViewport({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-h-0 flex-1 overflow-auto overscroll-contain rounded-lg border bg-card", className)}>{children}</div>;
}

export function DataTableFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex shrink-0 items-center pt-3", className)}>{children}</div>;
}
