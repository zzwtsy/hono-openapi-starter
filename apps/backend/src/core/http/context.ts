import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { HonoLogLayerVariables } from "@loglayer/hono";
import type { Schema } from "hono";

import type { AuthVariables } from "../auth/context.js";

export interface AppBindings {
  Variables: HonoLogLayerVariables & {
    requestId: string;
    userId?: string;
  } & Partial<AuthVariables>;
}

// eslint-disable-next-line ts/no-empty-object-type
export type AppOpenAPI<S extends Schema = {}> = OpenAPIHono<AppBindings, S>;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppBindings>;
