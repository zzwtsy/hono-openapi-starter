import { sql } from "drizzle-orm";

// 全仓固定的 PostgreSQL advisory lock key。只保护 organizations 拓扑及依赖管理子树的写入。
const ORGANIZATION_TOPOLOGY_LOCK_KEY = 0x484F4E4Fn;

export function acquireSharedTopologyLock() {
  return sql`SELECT pg_advisory_xact_lock_shared(${ORGANIZATION_TOPOLOGY_LOCK_KEY})`;
}

export function acquireExclusiveTopologyLock() {
  return sql`SELECT pg_advisory_xact_lock(${ORGANIZATION_TOPOLOGY_LOCK_KEY})`;
}
