import type {
  AuditNameResolver,
  AuditRelationSpec,
  AuditResolverErrorHandler,
  AuditResourceRef,
} from "./ports.js";

/**
 * 审计名称解析 registry。
 *
 * core 只提供 resolver port 和注册机制,具体数据库查询由应用装配层注册,
 * 避免 core/audit 直接依赖 user/org/role 等业务表。
 */
const resourceResolvers = new Map<string, AuditNameResolver>();
const relationResourceTypes = new Map<string, string>();

/** 注册资源类型名称解析器。重复注册同一 resolver 类型时必须保持实现一致。 */
export function registerAuditResourceResolver(type: string, resolver: AuditNameResolver): void {
  const existing = resourceResolvers.get(type);
  if (existing != null && existing !== resolver) {
    throw new Error(`duplicate audit resource resolver: ${type}`);
  }
  resourceResolvers.set(type, resolver);
}

/** 注册 before/after 字段到资源类型的映射。 */
export function registerAuditRelationResolver(spec: AuditRelationSpec): void {
  const existing = relationResourceTypes.get(spec.field);
  if (existing != null && existing !== spec.resourceType) {
    throw new Error(`audit relation field type mismatch: ${spec.field}`);
  }
  relationResourceTypes.set(spec.field, spec.resourceType);
}

/** 解析 resourceRefs 名称快照;调用方已提供 name 时优先保留,不再查询。 */
export async function resolveResourceRefNames(
  refs: readonly AuditResourceRef[],
  onError?: AuditResolverErrorHandler,
): Promise<AuditResourceRef[]> {
  return Promise.all(
    refs.map(async (ref) => {
      if (ref.name !== undefined) {
        return { ...ref };
      }

      const resolver = resourceResolvers.get(ref.type);
      // 名称快照是可选增强;未注册 resolver 时保留 type/id,不丢事件也不报错。
      if (resolver == null) {
        return { ...ref };
      }

      try {
        const name = await resolver(ref.id);
        return name === undefined ? { ...ref } : { ...ref, name };
      } catch (error) {
        onError?.(error, { kind: "resource", resourceType: ref.type, id: ref.id });
        return { ...ref };
      }
    }),
  );
}

/**
 * 解析 before/after 对象里的关联字段名称,存到 `_names` 子对象。
 *
 * 例:`{ orgId: "org_001", name: "张三" }` + `{ field: "orgId", resourceType: "org" }`
 * -> `{ orgId: "org_001", name: "张三", _names: { orgId: "华南总部" } }`
 *
 * 非 object、数组或无 relations 时原样返回。不修改原对象。
 */
export async function resolveRelationNames(
  data: unknown,
  relations?: readonly AuditRelationSpec[],
  onError?: AuditResolverErrorHandler,
): Promise<unknown> {
  if (
    data == null
    || typeof data !== "object"
    || Array.isArray(data)
    || relations == null
    || relations.length === 0
  ) {
    return data;
  }

  const obj = data as Record<string, unknown>;
  const names: Record<string, string> = {};

  await Promise.all(
    relations.map(async ({ field, resourceType }) => {
      const value = obj[field];
      if (typeof value !== "string") {
        return;
      }

      const registeredResourceType = relationResourceTypes.get(field);
      const resolver = registeredResourceType === resourceType
        ? resourceResolvers.get(registeredResourceType)
        : undefined;
      if (resolver == null) {
        onError?.(
          new Error(`audit relation resolver is not registered: ${field} -> ${resourceType}`),
          { kind: "relation", resourceType, id: value, field },
        );
        return;
      }

      try {
        const name = await resolver(value);
        if (name !== undefined) {
          names[field] = name;
        }
      } catch (error) {
        onError?.(error, { kind: "relation", resourceType, id: value, field });
      }
    }),
  );

  return { ...obj, _names: names };
}

/** 测试辅助:隔离模块级 resolver registry。 */
export function __resetAuditResolverRegistryForTest(): void {
  resourceResolvers.clear();
  relationResourceTypes.clear();
}
