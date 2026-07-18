import type { PermissionDefinition } from "../auth/permissions.js";
import { sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { permissions, rolePermissions, roles } from "../../db/schema/authorization-schema.js";
import { logger } from "../logger/index.js";

/**
 * 标准 admin 角色:授予全部权限。启动同步时 upsert,空生产有个可授的角色。
 * `source='code'` 标记为代码同步角色,管理 API 不可改删。
 * 其他角色(viewer 等)由管理 API 按 deployment 创建(`source='instance'`)。
 */
export const ADMIN_ROLE = { id: "role-admin", name: "admin", source: "code" } as const;

/**
 * 从代码同步权限层目录到数据库:
 * - `permissions` 表:upsert 传入的权限定义(各 feature 声明,组装点汇总传入)
 * - 标准 `admin` 角色 + `role_permissions`(admin × 全部权限)
 *
 * 代码是权限的真相来源(各 feature `permissions.ts` 声明,组装点 `index.ts` 汇总),DB 表是运行时镜像。
 * 接收 `defs` 参数(反转依赖:core 不 import features,组装点传权限定义)。app 启动时自动跑,幂等 upsert。
 *
 * 单事务:三个 upsert 原子完成,中途失败不留半套状态。
 * Upsert-only:从代码移除权限不会自动删库行,需手动清理 `role_permissions` + `permissions`。
 */
export async function syncAuthorizationCatalog(defs: readonly PermissionDefinition[]) {
  if (defs.length === 0) {
    logger.warn("syncAuthorizationCatalog: defs 为空,未同步(检查组装点是否汇总了 feature 权限)");
    return;
  }

  await db.transaction(async (tx) => {
    // 权限目录(含 description):onConflictDoUpdate 更新 description + updatedAt,
    // 代码改权限描述后启动同步生效(此前 DoNothing 导致描述改了不更新)。
    await tx
      .insert(permissions)
      .values([...defs])
      .onConflictDoUpdate({
        target: permissions.name,
        set: { description: sql`EXCLUDED.description`, updatedAt: new Date() },
      });
    // 标准 admin 角色(onConflictDoUpdate 强制 source='code':migration 加列后旧库 admin 行可能被 default 'instance' 覆盖,sync 修正)
    await tx.insert(roles)
      .values(ADMIN_ROLE)
      .onConflictDoUpdate({ target: roles.id, set: { source: "code" } });
    // admin 授全部权限
    await tx
      .insert(rolePermissions)
      .values(defs.map(({ name }) => ({ roleId: ADMIN_ROLE.id, permission: name })))
      .onConflictDoNothing();
  });

  logger.info(`synced authorization catalog: ${defs.length} permission(s), admin role`);
}
