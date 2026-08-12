import type { ServerType } from "@hono/node-server";
import process from "node:process";

import { serve } from "@hono/node-server";
import { allPermissions } from "@/catalogs/permissions.js";
import env from "@/config/env.js";
import { shutdownAuditQueue, startRetentionCleanup, stopRetentionCleanup } from "@/core/audit/index.js";
import { syncAuthorizationCatalog } from "@/core/authorization/index.js";
import { logger } from "@/core/logger/index.js";
import { closeDb } from "@/db/client.js";
import { app } from "./create-application.js";

async function closeServer(server: ServerType): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error?: Error) => {
      if (error != null) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

/** 同步启动数据、启动 HTTP server，并注册由宿主拥有的关闭流程。 */
export async function startApplication(): Promise<void> {
  await syncAuthorizationCatalog(allPermissions);

  const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
    logger.info(`➜ Server is running on http://localhost:${info.port}`);
    if (env.NODE_ENV === "development") {
      logger.info(`➜ API Reference:  http://localhost:${info.port}/reference`);
    }
  });
  startRetentionCleanup();

  let shutdownPromise: Promise<void> | undefined;
  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (shutdownPromise != null) {
      return shutdownPromise;
    }
    shutdownPromise = (async () => {
      logger.withMetadata({ signal }).info("application shutdown started");
      await closeServer(server);
      await shutdownAuditQueue();
      stopRetentionCleanup();
      await closeDb();
      logger.withMetadata({ signal }).info("application shutdown completed");
    })();
    return shutdownPromise;
  };

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, () => {
      void shutdown(signal).catch((error) => {
        logger.withError(error).error("application shutdown failed");
        process.exitCode = 1;
      });
    });
  }
}
