import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface PermissionGroupLayoutProps extends ComponentProps<"div"> {
  maxColumns: 2 | 3;
}

/**
 * 权限资源分组的自平衡分栏容器。
 *
 * 使用 CSS multi-column 让不同高度的分组顺序填充，避免普通 Grid 被同一行
 * 最高分组撑开后产生大块空洞。调用方负责为每个直接子项设置
 * `break-inside-avoid`，并在需要固定高度时把滚动放在本容器外层。
 */
export function PermissionGroupLayout({ maxColumns, className, ...props }: PermissionGroupLayoutProps) {
  return (
    <div
      data-slot="permission-group-layout"
      data-max-columns={maxColumns}
      className={cn(
        "columns-1 gap-4",
        maxColumns === 2 ? "xl:columns-2" : "xl:columns-2 2xl:columns-3",
        className,
      )}
      {...props}
    />
  );
}
