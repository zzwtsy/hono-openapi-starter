import type { PermissionDefinition } from "../auth/permissions.js";
import { sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { permissions, rolePermissions, roles, userPermissions } from "../../db/schema/authorization-schema.js";
import { logger } from "../logger/index.js";

/**
 * 标准 admin 角色:授予全部权限。启动同步时 upsert,空生产有个可授的角色。
 * `source='code'` 标记为代码同步角色,管理 API 不可改删。
 * 其他角色(viewer 等)由管理 API 按 deployment 创建(`source='instance'`)。
 */
export const ADMIN_ROLE = { id: "role-admin", name: "admin", source: "code" } as const;

/**
 * 从代码同步权限层目录到数据库:
 * - `permissions` 表:upsert 传入的权限 code(各 feature 声明,组装点汇总传入)
 * - 标准 `admin` 角色 + `role_permissions`(admin × 全部权限)
 *
 * 代码是权限的真相来源(各 feature `permissions.ts` 声明,组装点 `index.ts` 汇总),DB 表是运行时镜像。
 * 接收 `defs` 参数(反转依赖:core 不 import features,组装点传权限定义)。app 启动时自动跑,幂等 upsert。
 *
 * 单事务:三个 upsert 原子完成,中途失败不留半套状态。
 * code-only registry:从代码移除且仍有授权引用时同步失败;无引用的孤立 registry 行允许清理。
 */
export async function syncAuthorizationCatalog(defs: readonly PermissionDefinition[]) {
  if (defs.length === 0) {
    logger.warn("syncAuthorizationCatalog: defs 为空,未同步(检查组装点是否汇总了 feature 权限)");
    return;
  }

  await db.transaction(async (tx) => {
    const codes = defs.map(({ code }) => code);
    // 先检查 catalog 外的 code 是否仍被授权引用,禁止静默删除授权关系。
    const stale = await tx
      .select({ code: permissions.code })
      .from(permissions)
      .where(sql`${permissions.code} NOT IN (${sql.join(codes.map(code => sql`${code}`), sql`, `)})`);
    for (const row of stale) {
      const [roleGrant] = await tx
        .select({ roleId: rolePermissions.roleId })
        .from(rolePermissions)
        .where(sql`${rolePermissions.permissionCode} = ${row.code}`)
        .limit(1);
      const [userGrant] = await tx
        .select({ userId: userPermissions.userId })
        .from(userPermissions)
        .where(sql`${userPermissions.permissionCode} = ${row.code}`)
        .limit(1);
      if (roleGrant != null || userGrant != null) {
        throw new Error(`Stale permission code is still referenced: ${row.code}`);
      }
      await tx.delete(permissions).where(sql`${permissions.code} = ${row.code}`);
    }

    // 权限目录只保存 code; label 等展示元数据来自代码 catalog presenter。
    await tx
      .insert(permissions)
      .values(codes.map(code => ({ code })))
      .onConflictDoNothing();
    // 标准 admin 角色(onConflictDoUpdate 强制 source='code':migration 加列后旧库 admin 行可能被 default 'instance' 覆盖,sync 修正)
    await tx.insert(roles)
      .values(ADMIN_ROLE)
      .onConflictDoUpdate({ target: roles.id, set: { source: "code" } });
    // admin 授全部权限
    await tx
      .insert(rolePermissions)
      .values(codes.map(code => ({ roleId: ADMIN_ROLE.id, permissionCode: code })))
      .onConflictDoNothing();
  });

  logger.info(`synced authorization catalog: ${defs.length} permission(s), admin role`);
}
