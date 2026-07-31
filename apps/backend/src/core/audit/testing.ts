/**
 * 测试专用:audit() 中间件透传替身。
 *
 * 供 feature 路由测试 mock `@/core/audit/index.js` 用:不写审计、不触发 before/after,
 * 只透传 next(),让测试聚焦路由业务本身(埋点行为在 core/audit/middleware.test.ts 覆盖)。
 *
 * 不进 index.ts 导出(生产代码不可见)。
 */
export function auditPassthrough() {
  return async (_c: unknown, next: () => Promise<void>) => {
    await next();
  };
}
