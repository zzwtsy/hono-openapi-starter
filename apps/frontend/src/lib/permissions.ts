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
