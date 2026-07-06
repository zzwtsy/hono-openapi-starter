import { checkPermission } from "./check.js";
import { getPermissionCache } from "./permission-cache.js";

/**
 * 权限检查服务:调用 `checkPermission` 并做请求级 memoize。
 *
 * memoize 通过 ALS(`getPermissionCache`)隐式传播,调用方无需传 cache。
 * 同请求内同 (userId, permission, orgId) 只查一次 db。
 */
export const PermissionService = {
  async check(userId: string, permission: string, orgId: string): Promise<boolean> {
    const cache = getPermissionCache();
    const key = `${userId}:${permission}:${orgId}`;

    const cached = cache?.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const allowed = await checkPermission(userId, permission, orgId);
    cache?.set(key, allowed);
    return allowed;
  },
};
