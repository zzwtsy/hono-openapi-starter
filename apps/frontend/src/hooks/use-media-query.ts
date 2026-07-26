import * as React from "react";

/**
 * 响应式媒体查询:监听 `query` 是否匹配当前视口。
 *
 * 用 useSyncExternalStore 订阅 matchMedia change。统一替代 users.tsx /
 * roles.tsx / organization-explorer.tsx 各自手写的 subscribe + getSnapshot 样板。
 */
export function useMediaQuery(query: string): boolean {
  return React.useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
