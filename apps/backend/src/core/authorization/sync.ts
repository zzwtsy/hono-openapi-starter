import { db } from "../../db/client.js";
import { permissions, rolePermissions, roles } from "../../db/schema/authorization-schema.js";
import { APP_PERMISSIONS } from "../auth/permissions-manifest.js";
import { logger } from "../logger/index.js";

/**
 * 标准 admin 角色:授予全部权限。启动同步时 upsert,空生产有个可授的角色。
 * 其他角色(viewer 等)由未来管理 API 按 deployment 创建。
 */
export const ADMIN_ROLE = { id: "role-admin", name: "admin" } as const;

/**
 * 从代码同步权限层目录到数据库:
 * - `permissions` 表:upsert `APP_PERMISSIONS`(各 feature 声明的权限定义,含 description)
 * - 标准 `admin` 角色 + `role_permissions`(admin × 全部权限)
 *
 * 代码是权限的真相来源(`AppPermission` union,从 `permissions-manifest.ts` 的 `APP_PERMISSIONS`
 * 数组推导),DB 表是运行时镜像(给 FK + 管理界面)。app 启动时自动跑(`index.ts`),幂等 upsert,
 * 生产免人肉。
 *
 * 单事务:三个 upsert 原子完成,中途失败不留半套状态。
 * Upsert-only:从代码移除权限不会自动删库行(需手动清理 `role_permissions` + `permissions`)。
 */
export async function syncAuthorizationCatalog() {
  const defs = [...APP_PERMISSIONS];
  if (defs.length === 0) {
    logger.warn("syncAuthorizationCatalog: APP_PERMISSIONS 为空,未同步(检查 permissions-manifest 是否展开了 feature 权限数组)");
    return;
  }

  await db.transaction(async (tx) => {
    // 权限目录(含 description)
    await tx
      .insert(permissions)
      .values(defs)
      .onConflictDoNothing();
    // 标准 admin 角色
    await tx.insert(roles).values(ADMIN_ROLE).onConflictDoNothing();
    // admin 授全部权限
    await tx
      .insert(rolePermissions)
      .values(defs.map(({ name }) => ({ roleId: ADMIN_ROLE.id, permission: name })))
      .onConflictDoNothing();
  });

  logger.info(`synced authorization catalog: ${defs.length} permission(s), admin role`);
}
