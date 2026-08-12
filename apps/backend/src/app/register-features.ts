import type { createApp } from "@/core/app/create-app.js";
import auditRouter from "@/features/audit/index.js";
import healthRouter, { healthzRouter } from "@/features/health/index.js";
import iamRouter from "@/features/iam/index.js";
import meRouter from "@/features/me/index.js";
import projectsRouter from "@/features/projects/index.js";
import systemSettingsRouter from "@/features/system-settings/index.js";

type Application = ReturnType<typeof createApp>;

/** 按稳定顺序挂载 feature routes。 */
export function registerFeatureRoutes(app: Application): void {
  app.route("/", healthzRouter);
  app.route("/api/v1", healthRouter);
  app.route("/api/v1", meRouter);
  app.route("/api/v1", projectsRouter);
  app.route("/api/v1", iamRouter);
  app.route("/api/v1", systemSettingsRouter);
  app.route("/api/v1", auditRouter);
}
