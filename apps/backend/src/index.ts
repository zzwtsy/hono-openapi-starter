import process from "node:process";

import { startApplication } from "./app/lifecycle.js";
import { logger } from "./core/logger/index.js";
import { closeDb } from "./db/client.js";

startApplication().catch(async (error) => {
  logger.withError(error).error("startup failed");
  await closeDb().catch(closeError => logger.withError(closeError).warn("closeDb failed"));
  process.exitCode = 1;
});
