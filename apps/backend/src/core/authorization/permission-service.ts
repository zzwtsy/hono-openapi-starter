import { getPermissionCache } from "./permission-cache.js";
import { requireChecker } from "./permission-checker.js";

/**
 * 权限检查服务:memoize 装饰 + 调 PermissionChecker Port。
 *
 * memoize 通过 ALS(`getPermissionCache`)隐式传播,Adapter(IamPermissionChecker)无需关心。
 * 同请求内同 key 只查一次;list 以 `list:` 前缀 key 区分(值类型 string[])。
 *
 * 本服务做缓存装饰,算法委托给 `requireChecker()`(Port)。
 */
export const PermissionService = {
  async check(userId: string, permission: string, orgId: string): Promise<boolean> {
    const cache = getPermissionCache();
    const key = `${userId}:${permission}:${orgId}`;

    const cached = cache?.get(key);
    if (typeof cached === "boolean") {
      return cached;
    }

    const allowed = await requireChecker().check(userId, permission, orgId);
    cache?.set(key, allowed);
    return allowed;
  },

  /** 列出用户在某组织的全部有效权限(全集,走请求级 memoize)。 */
  async listEffectivePermissions(userId: string, orgId: string): Promise<string[]> {
    const cache = getPermissionCache();
    const key = `list:${userId}:${orgId}`;

    const cached = cache?.get(key);
    if (Array.isArray(cached)) {
      return cached;
    }

    const permissions = await requireChecker().listEffectivePermissions(userId, orgId);
    cache?.set(key, permissions);
    return permissions;
  },
};
