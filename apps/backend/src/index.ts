import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { logger } from "./core/logger/index.js";
import env from "./env.js";

serve({
  fetch: app.fetch,
  port: env.PORT,
}, (info) => {
  logger.info(`➜ Server is running on http://localhost:${info.port}`);
  if (env.NODE_ENV === "development") {
    logger.info(`➜ API Reference:  http://localhost:${info.port}/reference`);
  }
});
