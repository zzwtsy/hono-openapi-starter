import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type * as schema from "./schema/index.js";

/** 数据库实例类型（注入 schema 后的 PostgresJsDatabase）。 */
export type DB = PostgresJsDatabase<typeof schema>;

/** 事务执行上下文类型（db.transaction 回调首参）。 */
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

/** repository 方法统一接收的执行上下文：db 或 tx。事务边界由 service 控制。 */
export type Exec = DB | Tx;
