import type { PermissionDefinition } from "./permissions.js";

import { projectPermissions } from "../../features/projects/permissions.js";

/**
 * 应用全部权限定义(单一真相来源)。
 *
 * 类型与运行时同源:`AppPermission` union 从本数组推导,`syncAuthorizationCatalog` 也读本数组
 * 同步进 DB。新增 feature 时追加 import + 展开到数组;漏登记会导致 `AppPermission` 类型缺该权限,
 * `requirePermission("x")` 编译报错(fail-loud),不会静默丢权限。
 */
export const APP_PERMISSIONS = [
  ...projectPermissions,
] as const satisfies readonly PermissionDefinition[];

/** 应用所有权限名的联合(从 `APP_PERMISSIONS` 推导,与运行时同源)。 */
export type AppPermission = (typeof APP_PERMISSIONS)[number]["name"];
