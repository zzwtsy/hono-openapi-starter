import { serve } from "@hono/node-server";
import { configureOpenApi } from "./core/app/openapi.js";
import { logger } from "./core/logger/index.js";
import env from "./env.js";
import { app } from "./routes.generated.js";

if (env.NODE_ENV === "development") {
  configureOpenApi(app);
}

serve({
  fetch: app.fetch,
  port: env.PORT,
}, (info) => {
  logger.info(`➜ Server is running on http://localhost:${info.port}`);
  if (env.NODE_ENV === "development") {
    logger.info(`➜ API Reference:  http://localhost:${info.port}/reference`);
  }
});
