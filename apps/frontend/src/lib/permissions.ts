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

/** 是否持有任一权限。空 `required` 返回 false(无要求即不满足,与 `every` 语义对称取舍)。 */
export function hasAnyPermission(
  permissions: readonly AppPermission[] | undefined,
  ...required: readonly AppPermission[]
): boolean {
  return required.some(r => hasPermission(permissions, r));
}

/** 是否持有全部权限。空 `required` 返回 true。 */
export function hasAllPermissions(
  permissions: readonly AppPermission[] | undefined,
  ...required: readonly AppPermission[]
): boolean {
  return required.every(r => hasPermission(permissions, r));
}
