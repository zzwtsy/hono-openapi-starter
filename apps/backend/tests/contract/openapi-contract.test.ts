import { describe, expect, it } from "vitest";

import { app } from "../../src/app.js";

// 静态 spec 校验:用 app.getOpenAPIDocument() 取契约,对齐 Spectral OAS 标准规则校验实现。
interface Operation {
  operationId?: string;
  description?: string;
  tags?: string[];
  responses?: Record<string, { description?: string; content?: Record<string, { schema?: unknown }> }>;
}
interface Spec {
  paths: Record<string, Record<string, Operation>>;
  components?: {
    schemas?: Record<string, { required?: string[]; properties?: Record<string, unknown> }>;
    securitySchemes?: Record<string, unknown>;
  };
}

const spec = app.getOpenAPIDocument({
  openapi: "3.0.3",
  info: { title: "test", version: "0.0.0" },
}) as unknown as Spec;

const operations = Object.values(spec.paths)
  .flatMap(path => Object.values(path))
  .filter((op): op is Operation => op != null && typeof op === "object" && "operationId" in op);

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

  // 对齐 Spectral operation-description:每个 operation 必须有 description。
  it("每个操作有 description", () => {
    for (const op of operations) {
      expect(op.description, `操作 ${op.operationId} 缺 description`).toBeTruthy();
    }
  });

  // 对齐 Spectral operation-tags:每个 operation 至少一个 tag。
  it("每个操作有 tags", () => {
    for (const op of operations) {
      expect(op.tags, `操作 ${op.operationId} 缺 tags`).toBeDefined();
      expect(op.tags?.length, `操作 ${op.operationId} tags 为空`).toBeGreaterThan(0);
    }
  });

  it("每个操作有 responses", () => {
    for (const op of operations) {
      expect(op.responses, `操作 ${op.operationId} 缺 responses`).toBeDefined();
    }
  });

  // 对齐 Spectral operation-success-response:至少一个 2xx 响应。
  it("每个操作有 success response(2xx)", () => {
    for (const op of operations) {
      const successCodes = Object.keys(op.responses ?? {}).filter(code => code.startsWith("2"));
      expect(successCodes.length, `操作 ${op.operationId} 缺 2xx 响应`).toBeGreaterThan(0);
    }
  });

  // 强化:每个响应的 content 必须有 schema(不只 responses 存在)。
  it("每个响应有 schema", () => {
    for (const op of operations) {
      for (const [code, response] of Object.entries(op.responses ?? {})) {
        const schema = response.content?.["application/json"]?.schema;
        expect(schema, `操作 ${op.operationId} 的 ${code} 响应缺 schema`).toBeDefined();
      }
    }
  });

  it("注册了 ErrorEnvelope schema", () => {
    expect(spec.components?.schemas?.ErrorEnvelope).toBeDefined();
  });

  // envelope 漂移检查:ErrorEnvelope 的 required 字段集合必须与运行时 envelope 一致。
  it("envelope 结构无漂移(required 字段集合)", () => {
    const envelope = spec.components?.schemas?.ErrorEnvelope;
    expect(envelope?.required).toEqual(
      expect.arrayContaining(["success", "code", "message", "data", "error", "meta"]),
    );
    expect(envelope?.required?.length).toBe(6);
  });

  it("securitySchemes 已注册(Cookie + Bearer)", () => {
    expect(spec.components?.securitySchemes?.CookieAuth).toBeDefined();
    expect(spec.components?.securitySchemes?.BearerAuth).toBeDefined();
  });
});
