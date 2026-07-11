import type { ReactNode } from "react";
import type { AppPermission } from "@/types/permissions";
import { useCan } from "@/hooks/use-permissions";

interface CanProps {
  /** 需要持有的权限名(后端契约生成的 AppPermission)。 */
  perm: AppPermission;
  /** 有权限时渲染的内容;无权限渲染 null。 */
  children: ReactNode;
}

/**
 * 声明式权限门:`<Can perm="iam.manage">{children}</Can>`。
 *
 * 取代散落的 `auth.permissions?.includes("x") === true` 内联判断。仅在 `_authenticated`
 * 子树使用(`useCan` 读 router context);无权限返回 null(不渲染 fallback,保持调用点精简)。
 */
export function Can({ perm, children }: CanProps): ReactNode {
  return useCan(perm) ? children : null;
}
