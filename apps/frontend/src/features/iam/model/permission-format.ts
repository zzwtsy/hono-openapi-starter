import type { Permission } from "@/shared/api/globals";

/** 权限展示文案:description 优先,附代码;无 description 回退代码。 */
export function formatPermission(p: Pick<Permission, "name" | "description">): string {
  return p.description != null ? `${p.description}（${p.name}）` : p.name;
}
