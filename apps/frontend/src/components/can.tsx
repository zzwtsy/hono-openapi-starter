import type { ReactNode } from "react";
import type { AppPermission } from "@/types/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import { hasAllPermissions, hasAnyPermission, hasPermission } from "@/lib/permissions";

type CanProps = {
  children: ReactNode | ((state: { allowed: boolean }) => ReactNode);
  /** 无权限时渲染,默认隐藏(null);仅 children 为元素时生效。 */
  fallback?: ReactNode;
} & (
  | { permission: AppPermission; anyOf?: never; allOf?: never }
  | { anyOf: readonly AppPermission[]; permission?: never; allOf?: never }
  | { allOf: readonly AppPermission[]; permission?: never; anyOf?: never }
);

/**
 * 声明式权限门控:有权限渲染 children,无权限渲染 `fallback`(默认隐藏)。
 *
 * 三选一互斥(联合类型编译期强制,传 ≥2 个或 0 个都报错):
 * - `permission`:单权限
 * - `anyOf`:任一(OR,操作列可见性)
 * - `allOf`:全部(AND,复合门控如角色权限配置需 assign+revoke+两 read)
 *
 * children 可为元素(hide 模式,无权限渲染 fallback)或 render function
 * `{({ allowed }) => ...}`(disable 模式,无权限可渲染禁用态,且不创建多余元素)。
 * 对齐 CASL `<Can>` 的元素/render-prop 双模式。
 *
 * 行菜单场景用 `<ResourceActions>`(数据驱动,各 item 的 `allowed` 由 `useCan` 算好传入)。
 * 后端仍是唯一授权边界,本组件只做 UX。
 */
export function Can({ permission, anyOf, allOf, children, fallback = null }: CanProps) {
  const owned = usePermissions();
  const allowed = permission
    ? hasPermission(owned, permission)
    : allOf
      ? hasAllPermissions(owned, allOf)
      : hasAnyPermission(owned, anyOf ?? []);
  return typeof children === "function"
    ? children({ allowed })
    : allowed ? children : fallback;
}
