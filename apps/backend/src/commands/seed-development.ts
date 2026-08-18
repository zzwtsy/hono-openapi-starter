/**
 * 为本地端到端调试准备固定的演示组织、用户、标准 admin 授权和样例项目。
 *
 * 仅允许在 development 或 test 环境幂等执行，生产环境会拒绝运行。该命令不模拟业务 API：
 * 账号通过 Better Auth 兼容哈希直接写入，权限目录复用启动同步逻辑。失败时以非零状态退出，
 * 并在结束时尽力关闭数据库连接。
 */
import process from "node:process";

import { hashPassword } from "better-auth/crypto";

import { allPermissions } from "@/catalogs/permissions.js";
import env from "@/config/env.js";
import { ADMIN_ROLE, syncAuthorizationCatalog } from "@/core/authorization/index.js";
import { logger } from "@/core/logger/index.js";
import { closeDb, db } from "@/db/client.js";
import { account, organizations, projects, user, userRoles } from "@/db/schema/index.js";

const DEV = {
  org: "org-dev",
  userId: "user-dev",
  email: "dev@example.com",
  password: "dev-password",
  project: "proj-dev-1",
} as const;

async function main() {
  if (env.NODE_ENV === "production") {
    logger.error("db:seed 拒绝在生产环境执行(需 NODE_ENV=development 或 test)");
    process.exitCode = 1;
    return;
  }

  await syncAuthorizationCatalog(allPermissions);
  await db.insert(organizations).values({ id: DEV.org, name: "Dev Org" }).onConflictDoNothing();
  await db
    .insert(user)
    .values({ id: DEV.userId, name: "Dev User", email: DEV.email, orgId: DEV.org })
    .onConflictDoNothing();
  const passwordHash = await hashPassword(DEV.password);
  await db
    .insert(account)
    .values({
      id: "account-dev",
      accountId: DEV.userId,
      providerId: "credential",
      userId: DEV.userId,
      password: passwordHash,
    })
    .onConflictDoNothing();
  await db
    .insert(userRoles)
    .values({ userId: DEV.userId, roleId: ADMIN_ROLE.id, orgId: DEV.org })
    .onConflictDoNothing();
  await db
    .insert(projects)
    .values({ id: DEV.project, name: "示例项目", orgId: DEV.org })
    .onConflictDoNothing();

  logger.withMetadata({ email: DEV.email, password: DEV.password }).info("seeded dev demo data");
}

main()
  .catch((error) => {
    logger.withError(error).error("seed failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    // postgres-js 会保持 socket 活跃；成功或失败都必须关闭连接池才能结束进程。
    await closeDb().catch(error => logger.withError(error).warn("closeDb failed"));
  });
