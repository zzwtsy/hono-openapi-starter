import type { AuditAction } from "@/api/globals";
import { useRequest } from "alova/client";
import Apis from "@/api";

/** action 目录(cacheFor=Infinity,永久缓存)。 */
export function useAuditActions(): readonly AuditAction[] {
  const { data } = useRequest(() => Apis.Audit.listAuditActions(), { immediate: true });
  return data ?? [];
}
