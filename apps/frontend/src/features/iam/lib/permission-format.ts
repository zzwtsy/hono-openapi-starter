import type { PermissionRef } from "@/api/globals";

/** 权限展示文案:label 与 code 同时展示，展示元数据完全来自后端 PermissionRef。 */
export function formatPermission(p: Pick<PermissionRef, "code" | "label">): string {
  return `${p.label}（${p.code}）`;
}
