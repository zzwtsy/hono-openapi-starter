/**
 * 为生产首次部署创建唯一根组织、首个管理员账号和对应角色授权。
 *
 * 仅处理尚未完成初始化的环境，不负责重置既有账号或替换既有根组织。根组织、账号和授权
 * 在同一事务中写入；权限目录同步在事务外独立完成。失败时命令以非零状态退出，并在结束时
 * 尽力关闭数据库连接。
 */
import { randomUUID } from "node:crypto";
import process from "node:process";

import { hashPassword } from "better-auth/crypto";
import { eq, isNull } from "drizzle-orm";

import { allPermissions } from "@/catalogs/permissions.js";
import env from "@/config/env.js";
import { ADMIN_ROLE, syncAuthorizationCatalog } from "@/core/authorization/index.js";
import { logger } from "@/core/logger/index.js";
import { closeDb, db } from "@/db/client.js";
import { account, organizations, user, userRoles } from "@/db/schema/index.js";

async function main() {
  const email = env.BOOTSTRAP_ADMIN_EMAIL;
  const password = env.BOOTSTRAP_ADMIN_PASSWORD;
  if (email == null || password == null) {
    throw new Error("bootstrap: 缺少 BOOTSTRAP_ADMIN_EMAIL 或 BOOTSTRAP_ADMIN_PASSWORD（参考 .env.example）");
  }

  const rootOrgId = env.BOOTSTRAP_ROOT_ORG_ID;
  await syncAuthorizationCatalog(allPermissions);
  const passwordHash = await hashPassword(password);
  const userId = randomUUID();

  await db.transaction(async (tx) => {
    const [existingRoot] = await tx
      .select({ id: organizations.id })
      .from(organizations)
      .where(isNull(organizations.parentId));
    if (existingRoot != null && existingRoot.id !== rootOrgId) {
      throw new Error(`bootstrap: 系统根已存在(${existingRoot.id})，与 BOOTSTRAP_ROOT_ORG_ID 不一致`);
    }
    if (existingRoot == null) {
      await tx.insert(organizations).values({ id: rootOrgId, name: "Root" });
    }

    const [existing] = await tx.select({ id: user.id }).from(user).where(eq(user.email, email));
    if (existing != null) {
      throw new Error(`bootstrap: 用户 ${email} 已存在，如需重置请先手动删除或换邮箱`);
    }

    await tx.insert(user).values({ id: userId, name: "Admin", email, orgId: rootOrgId });
    await tx.insert(account).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
    });
    await tx
      .insert(userRoles)
      .values({ userId, roleId: ADMIN_ROLE.id, orgId: rootOrgId })
      .onConflictDoNothing();
  });

  logger.withMetadata({ email, rootOrgId }).info("bootstrapped first admin");
}

main()
  .catch((error) => {
    logger.withError(error).error("bootstrap failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb().catch(error => logger.withError(error).warn("closeDb failed"));
  });
