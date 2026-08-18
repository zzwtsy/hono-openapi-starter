import type { PermissionCode } from "@/types/permissions";

/**
 * 纯权限谓词，供路由 beforeLoad 守卫(`require-permission`)与侧边栏导航过滤共用。
 *
 * 不在前端再维护权限名单:`PermissionCode` 来自后端契约生成(见 `@/types/permissions`)。
 */

/** 是否持有某权限。`permissionCodes` 为 undefined(未登录/未加载)时返回 false。 */
export function hasPermission(
  permissionCodes: readonly PermissionCode[] | undefined,
  required: PermissionCode,
): boolean {
  return permissionCodes?.includes(required) === true;
}

/**
 * 是否持有「任一」权限(OR)。`permissionCodes` 为 undefined 或 `required` 为空数组时返回 false
 * (空数组语义为"无要求",放行更危险,故显式返回 false)。
 */
export function hasAnyPermission(
  permissionCodes: readonly PermissionCode[] | undefined,
  required: readonly PermissionCode[],
): boolean {
  return required.length > 0 && required.some(p => permissionCodes?.includes(p) === true);
}

/** 是否持有「全部」权限(AND)。`permissionCodes` 为 undefined 或 `required` 为空数组时返回 false。 */
export function hasAllPermissions(
  permissionCodes: readonly PermissionCode[] | undefined,
  required: readonly PermissionCode[],
): boolean {
  return required.length > 0 && required.every(p => permissionCodes?.includes(p) === true);
}
