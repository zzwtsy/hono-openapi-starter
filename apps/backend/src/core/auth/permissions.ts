/** 权限名格式:`<resource>.<action>`(如 `users.read`)。 */
export type PermissionName = `${string}.${string}`;

/**
 * 权限定义:name + 可选 description。
 *
 * 各 feature 在自己的 `permissions.ts` 用 `as const satisfies readonly PermissionDefinition[]`
 * 声明权限数组;`core/auth/permissions-manifest.ts` 汇总为 `APP_PERMISSIONS`。同一个数组既是
 * 类型来源(`AppPermission` union 从它推导)又是运行时目录(`syncAuthorizationCatalog` 从它同步进 DB),
 * 权限名只写一次,漏登记在编译期报错(fail-loud),不会出现「类型合法但运行时缺权限」的静默裂缝。
 *
 * `description` 进数据库 `permissions` 表,供管理界面展示。
 */
export interface PermissionDefinition {
  name: PermissionName;
  description?: string;
}
