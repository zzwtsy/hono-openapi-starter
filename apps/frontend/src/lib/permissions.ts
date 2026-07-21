import type { AppPermission } from "@/types/permissions";

/**
 * 纯权限谓词,供路由 beforeLoad 守卫(`require-permission`)与侧边栏导航过滤共用,
 * 收敛原本散落 4+ 处的 `auth.permissions?.includes("x") === true` null-handling 惯用法。
 *
 * 不在前端再维护权限名单:`AppPermission` 来自后端契约生成(见 `@/types/permissions`)。
 */

/** 是否持有某权限。`permissions` 为 undefined(未登录/未加载)时返回 false。 */
export function hasPermission(
  permissions: readonly AppPermission[] | undefined,
  required: AppPermission,
): boolean {
  return permissions?.includes(required) === true;
}

/**
 * 是否持有「任一」权限(OR)。`permissions` 为 undefined 或 `required` 为空数组时返回 false
 * (空数组语义为"无要求",放行更危险,故显式返回 false)。
 */
export function hasAnyPermission(
  permissions: readonly AppPermission[] | undefined,
  required: readonly AppPermission[],
): boolean {
  return required.length > 0 && required.some(p => permissions?.includes(p) === true);
}

/** 是否持有「全部」权限(AND)。`permissions` 为 undefined 或 `required` 为空数组时返回 false。 */
export function hasAllPermissions(
  permissions: readonly AppPermission[] | undefined,
  required: readonly AppPermission[],
): boolean {
  return required.length > 0 && required.every(p => permissions?.includes(p) === true);
}
