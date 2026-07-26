/**
 * 权限检查 Port(接口 + holder)。
 *
 * PEP(core/auth/require-permission)经 PermissionService 调本 Port,不直接依赖具体 PDP 实现。
 * Adapter(features/iam/IamPermissionChecker)实现接口,启动时 `setPermissionChecker` 装配。
 *
 * core 不 import features:holder 持接口引用,由 app.ts(组装点)装配实例。
 */

/** 权限来源:角色授予或直接授权,绑定组织,可过期。orgId 可能是祖先组织(经继承生效)。 */
export interface PermissionSource {
  type: "role" | "direct";
  roleId: string | null;
  roleName: string | null;
  orgId: string;
  expiresAt: Date | null;
}

/** 生效权限及其来源集合(同一权限可多来源)。 */
export interface EffectivePermission {
  permission: string;
  sources: PermissionSource[];
}

/** 被 deny 抵消的权限:本会生效(suppressedSources)但被直接 deny 扣掉(deniedBy,可多 org)。 */
export interface DeniedPermission {
  permission: string;
  deniedBy: { orgId: string; expiresAt: Date | null }[];
  suppressedSources: PermissionSource[];
}

/** listEffectivePermissions 返回:生效权限 + 被 deny 抵消的权限,均带来源链。 */
export interface UserPermissionsResult {
  effective: EffectivePermission[];
  denied: DeniedPermission[];
}

export interface PermissionChecker {
  /** 检查用户在某组织是否有某权限(递归 CTE 算法由 Adapter 实现)。 */
  check: (userId: string, permission: string, orgId: string) => Promise<boolean>;
  /** 列出用户在某组织的有效权限全集(带来源链:角色/直接/继承,含被 deny 抵消的)。 */
  listEffectivePermissions: (userId: string, orgId: string) => Promise<UserPermissionsResult>;
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
