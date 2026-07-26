/**
 * 按 permission resource(点号前缀)分组。
 *
 * 泛型化 + `keyOf` 回调,兼容 `Permission.name` 与 `EffectivePermission.permission`
 * 两种取值方式,消除 user-detail-panel / role-detail-panel 的重复实现。
 */
export function groupByResource<T>(
  items: T[],
  keyOf: (item: T) => string,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const resource = keyOf(item).split(".")[0] ?? "other";
    const list = groups.get(resource);
    if (list === undefined) {
      groups.set(resource, [item]);
    } else {
      list.push(item);
    }
  }
  return groups;
}
