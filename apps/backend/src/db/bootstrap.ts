import { randomUUID } from "node:crypto";
import process from "node:process";

import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";

import { ADMIN_ROLE, syncAuthorizationCatalog } from "../core/authorization/index.js";
import { logger } from "../core/logger/index.js";
import env from "../env.js";
import { allPermissions } from "../permissions-catalog.js";
import { closeDb, db } from "./client.js";
import { account, organizations, user, userRoles } from "./schema/index.js";

/**
 * 生产首次部署引导:建根组织 + 第一个 admin 用户(授标准 admin 角色)。
 *
 * 空库无 admin,需一次性引导造第一个 admin;否则无人能登录调管理 API。
 * 之后再由该 admin 通过管理 API 建其他角色/授权。
 *
 * 输入走 env(BOOTSTRAP_ADMIN_EMAIL/PASSWORD/ROOT_ORG_ID),避免密码进 shell history。
 * 生产首次部署后可清除密码 env。dev 环境用 `db:seed` 建演示数据即可,不必跑 bootstrap。
 *
 * 幂等:组织已存在跳过;admin 用户 email 已存在则报错退出(不静默覆盖密码)。
 */
async function main() {
  const email = env.BOOTSTRAP_ADMIN_EMAIL;
  const password = env.BOOTSTRAP_ADMIN_PASSWORD;
  if (email == null || password == null) {
    logger.error("bootstrap: 缺少 BOOTSTRAP_ADMIN_EMAIL 或 BOOTSTRAP_ADMIN_PASSWORD(参考 .env.example)");
    process.exit(1);
  }

  const rootOrgId = env.BOOTSTRAP_ROOT_ORG_ID;

  // 权限目录 + 标准 admin 角色(复用启动同步,幂等)
  await syncAuthorizationCatalog(allPermissions);

  // 根组织
  await db.insert(organizations).values({ id: rootOrgId, name: "Root" }).onConflictDoNothing();

  // admin 用户已存在则拒绝(避免重复 bootstrap 覆盖密码)
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  if (existing != null) {
    logger.error(`bootstrap: 用户 ${email} 已存在,如需重置请先手动删除或换邮箱`);
    process.exit(1);
  }

  // 建 admin 用户(归属根组织)+ 账号(better-auth 兼容哈希)
  const userId = randomUUID();
  await db.insert(user).values({ id: userId, name: "Admin", email, orgId: rootOrgId });
  const passwordHash = await hashPassword(password);
  await db.insert(account).values({
    id: randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: passwordHash,
  });

  // 在根组织授 admin 角色(全局 admin:祖先遍历使其对任意子组织 iam.manage 通过)
  await db
    .insert(userRoles)
    .values({ userId, roleId: ADMIN_ROLE.id, orgId: rootOrgId })
    .onConflictDoNothing();

  logger.withMetadata({ email, rootOrgId }).info("bootstrapped first admin");
}

main()
  .catch((error) => {
    logger.withError(error).error("bootstrap failed");
    process.exit(1);
  })
  .finally(async () => {
    // 关池,否则 postgres-js 保持 socket 活跃,进程不退出。
    await closeDb().catch(error => logger.withError(error).warn("closeDb failed"));
  });
