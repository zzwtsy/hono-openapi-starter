import process from "node:process";

import { hashPassword } from "better-auth/crypto";

import { ADMIN_ROLE, syncAuthorizationCatalog } from "../core/authorization/index.js";
import { logger } from "../core/logger/index.js";
import env from "../env.js";
import { allPermissions } from "../permissions-catalog.js";
import { closeDb, db } from "./client.js";
import { account, organizations, projects, systemSettings, user, userRoles } from "./schema/index.js";

/**
 * dev 环境演示数据:dev 组织 + 可登录的 dev 用户(授标准 admin 角色)+ 样例项目。
 * 仅供本地端到端调试(`pnpm db:seed`),生产环境拒绝执行。
 *
 * 权限目录 + 标准 admin 角色由 `syncAuthorizationCatalog` 保证就位(复用启动同步逻辑)。
 * dev 用户用 `better-auth/crypto` 的 `hashPassword` 生成兼容密码,直接 insert `user`+`account`
 * (绕过 hooks.before 注册开关),之后走正常 `/api/auth/sign-in/email` 登录。
 */

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
    process.exit(1);
  }

  // 权限目录 + 标准 admin 角色(复用启动同步,幂等)
  await syncAuthorizationCatalog(allPermissions);
  // dev 组织
  await db.insert(organizations).values({ id: DEV.org, name: "Dev Org" }).onConflictDoNothing();
  // dev 用户(带 orgId)+ 账号(better-auth 兼容哈希,绕过 hooks.before 注册开关,登录走正常端点)
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
  // 在 dev 组织授 admin 角色(admin 含 projects.read 等全部权限)
  await db
    .insert(userRoles)
    .values({ userId: DEV.userId, roleId: ADMIN_ROLE.id, orgId: DEV.org })
    .onConflictDoNothing();
  // 样例项目
  await db
    .insert(projects)
    .values({ id: DEV.project, name: "示例项目", orgId: DEV.org })
    .onConflictDoNothing();
  // 系统设置:dev 默认开启注册(hooks.before 读此配置控制 /sign-up/email)
  await db
    .insert(systemSettings)
    .values({ key: "signUp", value: { enabled: true } })
    .onConflictDoNothing();

  logger.withMetadata({ email: DEV.email, password: DEV.password }).info("seeded dev demo data");
}

main()
  .catch((error) => {
    logger.withError(error).error("seed failed");
    process.exit(1);
  })
  .finally(async () => {
    // 关池,否则 postgres-js 保持 socket 活跃,进程不退出。
    await closeDb().catch(error => logger.withError(error).warn("closeDb failed"));
  });
