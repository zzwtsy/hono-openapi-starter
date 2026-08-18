import { sql } from "drizzle-orm";

// 全仓固定的 PostgreSQL advisory lock key，只保护 organizations 拓扑及依赖管理子树的写入。
const ORGANIZATION_TOPOLOGY_LOCK_KEY = 0x484F4E4Fn;

/**
 * 为依赖当前组织拓扑的写操作生成共享 transaction advisory lock。
 *
 * 调用方必须在 `db.transaction` 回调内执行返回的 SQL；锁随该 transaction 结束自动释放。
 */
export function acquireSharedTopologyLock() {
  return sql`SELECT pg_advisory_xact_lock_shared(${ORGANIZATION_TOPOLOGY_LOCK_KEY})`;
}

/**
 * 为组织拓扑变更生成排他 transaction advisory lock。
 *
 * 调用方必须在 `db.transaction` 回调内执行返回的 SQL；锁随该 transaction 结束自动释放。
 */
export function acquireExclusiveTopologyLock() {
  return sql`SELECT pg_advisory_xact_lock(${ORGANIZATION_TOPOLOGY_LOCK_KEY})`;
}
