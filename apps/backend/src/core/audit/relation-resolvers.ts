import { eq } from "drizzle-orm";

import { db } from "@/db/client.js";
import { organizations, roles, user } from "@/db/schema/index.js";

/**
 * 关联名称解析注册表(统一):resourceRefs 和 before/after 共用同一套 resolver。
 *
 * - `resolveResourceRefNames`:给 resourceRefs 数组的每个 ref 加 `name`(历史快照)
 * - `resolveRelationNames`:给 before/after 对象里的约定关联字段加 `_names` 子对象
 *
 * 按"资源类型"注册 resolver;`fieldToType` 把 before/after 的字段名映射到 resolver type。
 * 加新关联类型只需在 `relationResolvers` + `fieldToType` 各加一行。
 */

export const relationResolvers = {
  org: async (id: string): Promise<string | undefined> => {
    const [row] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, id));
    return row?.name;
  },
  user: async (id: string): Promise<string | undefined> => {
    const [row] = await db.select({ name: user.name }).from(user).where(eq(user.id, id));
    return row?.name;
  },
  role: async (id: string): Promise<string | undefined> => {
    const [row] = await db.select({ name: roles.name }).from(roles).where(eq(roles.id, id));
    return row?.name;
  },
} as const;

export type RelationType = keyof typeof relationResolvers;

/** before/after 字段名 -> resolver type 的映射。 */
const fieldToType: Record<string, RelationType> = {
  orgId: "org",
  userId: "user",
  roleId: "role",
};

/** 解析 resourceRefs 里的名称快照,返回带 `name` 的新数组。 */
export async function resolveResourceRefNames(
  refs: Array<{ type: string; id: string }>,
): Promise<Array<{ type: string; id: string; name?: string }>> {
  return Promise.all(
    refs.map(async (ref) => {
      const resolver = relationResolvers[ref.type as RelationType];
      const name = resolver != null ? await resolver(ref.id) : undefined;
      return { ...ref, name };
    }),
  );
}

/**
 * 解析 before/after 对象里的关联字段名称,存到 `_names` 子对象。
 *
 * 例:`{ orgId: "org_001", name: "张三" }` + relations: `["orgId"]`
 * -> `{ orgId: "org_001", name: "张三", _names: { orgId: "华南总部" } }`
 *
 * 非 object 或无 relations 时原样返回。不修改原对象。
 */
export async function resolveRelationNames(
  data: unknown,
  relations?: readonly string[],
): Promise<unknown> {
  if (data == null || typeof data !== "object" || relations == null || relations.length === 0) {
    return data;
  }

  const obj = data as Record<string, unknown>;
  const names: Record<string, string | undefined> = {};

  await Promise.all(
    relations.map(async (field) => {
      const value = obj[field];
      if (typeof value === "string") {
        const type = fieldToType[field];
        if (type != null) {
          names[field] = await relationResolvers[type](value);
        }
      }
    }),
  );

  return { ...obj, _names: names };
}
