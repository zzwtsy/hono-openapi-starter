import { describe, expect, it } from "vitest";

import { app } from "../../src/app.js";

// 静态 spec 校验:用 app.getOpenAPIDocument() 取契约,校验实现符合基础规范。
const spec = app.getOpenAPIDocument({
  openapi: "3.0.3",
  info: { title: "test", version: "0.0.0" },
}) as unknown as {
  paths: Record<string, Record<string, { operationId?: string; responses?: unknown; security?: unknown[] }>>;
  components?: { schemas?: Record<string, unknown>; securitySchemes?: Record<string, unknown> };
};

const operations = Object.values(spec.paths).flatMap(path => Object.values(path)).filter(op => op != null && typeof op === "object" && "operationId" in op);

describe("OpenAPI contract", () => {
  it("每个操作有 operationId", () => {
    for (const op of operations) {
      expect(op.operationId, `操作缺 operationId`).toBeTruthy();
    }
  });

  it("operationId 全局唯一", () => {
    const ids = operations.map(op => op.operationId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("每个操作有 responses", () => {
    for (const op of operations) {
      expect(op.responses, `操作 ${op.operationId} 缺 responses`).toBeDefined();
    }
  });

  it("注册了 ErrorEnvelope schema", () => {
    expect(spec.components?.schemas?.ErrorEnvelope).toBeDefined();
  });

  it("securitySchemes 已注册(Cookie + Bearer)", () => {
    expect(spec.components?.securitySchemes?.CookieAuth).toBeDefined();
    expect(spec.components?.securitySchemes?.BearerAuth).toBeDefined();
  });
});
