import type { AppBindings } from "../http/context.js";
import { AsyncLocalStorage } from "node:async_hooks";
import { createMiddleware } from "hono/factory";

const permissionCacheStorage = new AsyncLocalStorage<Map<string, boolean | string[]>>();

/** 在请求级 ALS 上下文内执行 callback,提供权限 cache(供中间件与测试共用)。 */
export async function runWithPermissionCache<T>(callback: () => Promise<T>): Promise<T> {
  return permissionCacheStorage.run(new Map(), callback);
}

/** 取当前请求的权限 cache(无 ALS 上下文返回 undefined,不缓存)。 */
export function getPermissionCache(): Map<string, boolean | string[]> | undefined {
  return permissionCacheStorage.getStore();
}

/**
 * 请求级权限 cache 中间件:开启 ALS 上下文,同请求内 `PermissionService.check`
 * 共享结果,避免重复递归 CTE。见 [权限层规范](../../../docs/conventions/authorization.md)。
 */
export function permissionCacheMiddleware() {
  return createMiddleware<AppBindings>(async (_c, next) => {
    await runWithPermissionCache(async () => {
      await next();
    });
  });
}
