import { createRoute, z } from "@hono/zod-openapi";
import { BlankTransport, LogLayer } from "loglayer";
import { describe, expect, it } from "vitest";

import { createRouter } from "../app/create-router.js";
import { AppError } from "../errors/app-error.js";
import { errorHandler } from "../errors/error-handler.js";
import { requestIdMiddleware } from "../http/request-id-middleware.js";
import { successResponse } from "../http/response.js";

import { loggerMiddleware } from "./middleware.js";

interface LogEntry {
  data: Record<string, unknown>;
  level: string;
  messages: unknown[];
}

describe("loggerMiddleware", () => {
  it("uses the incoming request id in response and pino-http access logs", async () => {
    const { app, entries } = createTestApp();

    const response = await app.request("/ok", {
      headers: {
        "X-Real-IP": "127.0.0.1",
        "X-Request-Id": "req_incoming",
      },
    });
    const body = await response.json() as { meta: { requestId: string } };

    expect(body.meta.requestId).toBe("req_incoming");
    expect(response.headers.get("X-Request-Id")).toBe("req_incoming");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      level: "info",
      messages: ["request completed"],
      data: {
        requestId: "req_incoming",
        req: {
          method: "GET",
          url: "/ok",
          remoteAddress: "127.0.0.1",
        },
        res: {
          statusCode: 200,
        },
      },
    });
    expect(entries[0]?.data.responseTime).toEqual(expect.any(Number));
    expect(entries[0]?.data).not.toHaveProperty("method");
    expect(entries[0]?.data).not.toHaveProperty("path");
    expect(entries[0]?.data).not.toHaveProperty("durationMs");
  });

  it("generates one request id for response envelope, response header, and logs", async () => {
    const { app, entries } = createTestApp();

    const response = await app.request("/ok");
    const body = await response.json() as { meta: { requestId: string } };

    expect(body.meta.requestId).toBeTruthy();
    expect(response.headers.get("X-Request-Id")).toBe(body.meta.requestId);
    expect(entries[0]?.data.requestId).toBe(body.meta.requestId);
  });

  it("logs AppError failures with pino-http request data and mapped error fields", async () => {
    const { app, entries } = createTestApp();

    const response = await app.request("/fail", {
      headers: {
        "X-Request-Id": "req_failed",
      },
    });

    expect(response.status).toBe(409);
    expect(entries).toHaveLength(2);

    const failed = findEntry(entries, "request failed");
    const completed = findEntry(entries, "request completed");

    expect(failed).toMatchObject({
      level: "error",
      data: {
        requestId: "req_failed",
        code: "COMMON_CONFLICT",
        status: 409,
        type: "business",
        req: {
          method: "GET",
          url: "/fail",
        },
        res: {
          statusCode: 409,
        },
      },
    });
    expect(failed?.data.stack).toEqual(expect.any(String));
    expect(completed).toMatchObject({
      level: "info",
      data: {
        requestId: "req_failed",
        req: {
          method: "GET",
          url: "/fail",
        },
        res: {
          statusCode: 409,
        },
      },
    });
  });

  it("logs unknown failures as internal errors", async () => {
    const { app, entries } = createTestApp();

    const response = await app.request("/unknown");

    expect(response.status).toBe(500);

    const failed = findEntry(entries, "request failed");

    expect(failed).toMatchObject({
      level: "error",
      data: {
        code: "COMMON_INTERNAL_ERROR",
        status: 500,
        type: "internal",
        res: {
          statusCode: 500,
        },
      },
    });
  });

  it("logs validation responses as completed requests only", async () => {
    const { app, entries } = createTestApp();

    const response = await app.request("/validate");

    expect(response.status).toBe(422);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      level: "info",
      messages: ["request completed"],
      data: {
        req: {
          method: "GET",
          url: "/validate",
        },
        res: {
          statusCode: 422,
        },
      },
    });
    expect(entries[0]?.data).not.toHaveProperty("stack");
    expect(entries[0]?.data).not.toHaveProperty("code");
  });
});

const validationRoute = createRoute({
  method: "get",
  path: "/validate",
  request: {
    query: z.object({
      value: z.string(),
    }),
  },
  responses: {
    200: {
      description: "OK",
    },
    422: {
      description: "Validation failed",
    },
  },
});

function createTestApp() {
  const entries: LogEntry[] = [];
  const app = createRouter();

  app.use("*", requestIdMiddleware());
  app.use("*", loggerMiddleware({
    logger: createCaptureLogger(entries),
  }));
  app.onError(errorHandler);

  app.get("/ok", c => successResponse(c, { ok: true }));
  app.get("/fail", () => {
    throw new AppError("COMMON_CONFLICT", {
      message: "Already exists",
    });
  });
  app.get("/unknown", () => {
    throw new Error("Unexpected failure");
  });
  app.openapi(validationRoute, c => successResponse(c, {
    value: c.req.valid("query").value,
  }));

  return { app, entries };
}

function createCaptureLogger(entries: LogEntry[]) {
  return new LogLayer({
    transport: new BlankTransport({
      shipToLogger: ({ logLevel, messages, data, hasData }) => {
        entries.push({
          level: logLevel,
          messages,
          data: hasData === true && isRecord(data) ? data : {},
        });

        return [];
      },
    }),
  });
}

function findEntry(entries: LogEntry[], message: string) {
  return entries.find(entry => entry.messages.includes(message));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
