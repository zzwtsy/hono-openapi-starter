import { accessAction } from "alova/client";

/**
 * IAM 列表 useRequest 的 action delegation 名。
 *
 * 为何需要:alova `hitSource` 只**删缓存**,不重拉已挂载的 `useRequest`
 * (源码 `hitCacheBySource` 仅 `cacheAdapter.remove`,无通知逻辑;见
 * docs/conventions/frontend/state-cache.md)。列表 `useRequest` 用
 * `actionDelegationMiddleware` 注册 action,mutation 后 `accessAction` 触发 send,
 * 跨组件刷新,无需 prop-drilling 或全局 store。
 */
export const IAM_ACTIONS = {
  usersList: "iam-users-list",
  rolesList: "iam-roles-list",
  userRoles: "iam-user-roles",
  userPermissions: "iam-user-permissions",
  userDirectPerms: "iam-user-direct-perms",
  rolePerms: "iam-role-perms",
  roleUsers: "iam-role-users",
} as const;

/**
 * mutation 后刷新 IAM 列表:逐个 `accessAction` 触发已注册的 `useRequest` send。
 * 第三参 `true`:目标列表未挂载(如非当前 tab)时静默 not-found,不抛错。
 */
export function refreshIam(...names: ReadonlyArray<string>): void {
  for (const name of names) {
    accessAction(name, (actions) => {
      // accessAction 回调参数为 Record<string, any>(alova 类型所限),send 是 any
      // eslint-disable-next-line ts/no-unsafe-call
      void actions.send();
    }, true);
  }
}
