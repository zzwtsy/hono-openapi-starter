import process from "node:process";

import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { syncAuthorizationCatalog } from "./core/authorization/index.js";
import { logger } from "./core/logger/index.js";
import env from "./env.js";

async function main() {
  // 启动时从代码同步权限目录 + 标准 admin 角色到 DB(幂等,生产免人肉)。
  await syncAuthorizationCatalog();

  serve({
    fetch: app.fetch,
    port: env.PORT,
  }, (info) => {
    logger.info(`➜ Server is running on http://localhost:${info.port}`);
    if (env.NODE_ENV === "development") {
      logger.info(`➜ API Reference:  http://localhost:${info.port}/reference`);
    }
  });
}

main().catch((error) => {
  logger.withError(error).error("startup failed");
  process.exit(1);
});
