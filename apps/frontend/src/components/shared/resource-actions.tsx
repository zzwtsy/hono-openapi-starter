import type { ComponentType, ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ResourceAction {
  id: string;
  /** 是否渲染该项(通常来自 `useCan` 的布尔)。false 时该项不进入菜单。 */
  allowed: boolean;
  label: ReactNode;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: "destructive";
  /** 业务级禁用(如行状态不允许),与 `allowed`(权限)区分。 */
  disabled?: boolean;
  /** tooltip / 禁用原因。 */
  title?: string;
}

interface ResourceActionsProps {
  items: ResourceAction[];
  /** trigger 的 `aria-label`,默认「操作」。 */
  label?: string;
}

/**
 * 数据驱动的行操作菜单:把「按权限显隐 + 手写 `DropdownMenuItem`」的重复样板收敛成
 * 数组声明,消除 `{canX && <DropdownMenuItem>}` 深嵌套。
 *
 * - `allowed`:权限级显隐;全部为 false 时返回 null(整列不渲染)。
 * - `disabled`/`title`:业务级禁用,对齐 CASL `<Can passThrough>` 的「禁用而非隐藏」语义。
 *
 * 权限判断由调用方经 `useCan` 算好布尔传入;本组件不耦合权限 hook,便于在非路由
 * 上下文(如测试)中渲染。后端仍是唯一授权边界,本组件只做 UX。
 */
export function ResourceActions({ items, label = "操作" }: ResourceActionsProps) {
  const visible = items.filter(item => item.allowed);
  if (visible.length === 0) {
    return null;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={label} />}>
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          {visible.map((item) => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem
                key={item.id}
                variant={item.variant}
                disabled={item.disabled}
                title={item.title}
                onClick={item.onClick}
              >
                <Icon />
                {item.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
