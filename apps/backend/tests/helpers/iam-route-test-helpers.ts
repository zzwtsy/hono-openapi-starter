import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppBindings } from "../../src/core/http/context.js";

import { OpenAPIHono } from "@hono/zod-openapi";

import { AppError } from "../../src/core/errors/app-error.js";

export const mockUser = { id: "u-1", orgId: "org-1", email: "a@b.c", name: "a" };
export const mockSession = { id: "s-1", userId: "u-1", token: "t" };
export const mockPermission = {
  code: "projects.read",
  resourceCode: "projects",
  actionCode: "read",
  resourceLabel: "项目",
  label: "查看项目",
};
export const mockRole = {
  id: "r-1",
  name: "viewer",
  description: null,
  source: "instance" as const,
  createdAt: new Date("2026-07-07T00:00:00.000Z"),
  updatedAt: new Date("2026-07-07T00:00:00.000Z"),
};
export const mockOrg = {
  id: "org-root",
  name: "Root",
  parentId: null,
  createdAt: new Date("2026-07-07T00:00:00.000Z"),
  updatedAt: new Date("2026-07-07T00:00:00.000Z"),
};

export function buildIamApp(register: (app: OpenAPIHono<AppBindings>) => void) {
  const app = new OpenAPIHono<AppBindings>();
  register(app);
  app.onError((err, c) => {
    const status = err instanceof AppError ? err.status : 500;
    return c.json({ code: err instanceof AppError ? err.code : "ERROR" }, status as ContentfulStatusCode);
  });
  return app;
}
