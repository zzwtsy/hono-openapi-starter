/**
 * 权限检查 Port(接口 + holder)。
 *
 * PEP(core/auth/require-permission)经 PermissionService 调本 Port,不直接依赖具体 PDP 实现。
 * Adapter(features/iam/IamPermissionChecker)实现接口,启动时 `setPermissionChecker` 装配。
 *
 * core 不 import features:holder 持接口引用,由 app.ts(组装点)装配实例。
 */

export interface PermissionChecker {
  /** 检查用户在某组织是否有某权限(递归 CTE 算法由 Adapter 实现)。 */
  check: (userId: string, permission: string, orgId: string) => Promise<boolean>;
  /** 列出用户在某组织的全部有效权限全集。 */
  listEffectivePermissions: (userId: string, orgId: string) => Promise<string[]>;
}

let impl: PermissionChecker | undefined;

/** 装配 PermissionChecker 实现(Adapter)。app 启动时调一次。 */
export function setPermissionChecker(checker: PermissionChecker): void {
  impl = checker;
}

/** 取已装配的实现;未装配抛错(启动期暴露,不静默)。 */
export function requireChecker(): PermissionChecker {
  if (impl == null) {
    throw new Error("PermissionChecker 未装配(启动时需调 setPermissionChecker)");
  }
  return impl;
}
