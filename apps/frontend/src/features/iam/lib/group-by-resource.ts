/**
 * 按 permission resource(点号前缀)分组。
 *
 * 泛型化 + `keyOf` 回调,由调用方传入 catalog 的 resourceCode，消除面板重复实现。
 */
export function groupByResource<T>(
  items: T[],
  keyOf: (item: T) => string,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const resource = keyOf(item) || "other";
    const list = groups.get(resource);
    if (list === undefined) {
      groups.set(resource, [item]);
    } else {
      list.push(item);
    }
  }
  return groups;
}
