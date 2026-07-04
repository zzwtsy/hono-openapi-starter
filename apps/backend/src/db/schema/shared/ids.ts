import { text } from "drizzle-orm/pg-core";

/** 主键列：text id，由应用层生成（与 Better Auth generateId 统一，不依赖 DB 自增）。 */
export const idColumn = () => text().primaryKey();

/** 生成主键：UUIDv4（Node 内置 crypto，core/auth 批次配 Better Auth generateId 对齐）。 */
export const generateId = () => crypto.randomUUID();
