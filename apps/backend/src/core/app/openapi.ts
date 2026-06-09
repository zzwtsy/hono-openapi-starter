import type { AppOpenAPI } from "./create-router.js";

import { Scalar } from "@scalar/hono-api-reference";

export function configureOpenApi(app: AppOpenAPI) {
  // `/openapi.json` 面向机器读取，作为 SDK 生成和契约校验的来源。
  app.doc("/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "Hono 后端模板 API",
      version: "1.0.0",
      description: "面向生产环境的 Hono 后端模板 API。",
    },
  });

  // `/reference` 面向开发者阅读，直接消费同一份 OpenAPI 文档。
  app.get("/reference", Scalar({
    pageTitle: "Hono 后端模板 API 参考文档",
    withDefaultFonts: false,
    telemetry: false,
    showDeveloperTools: "never",
    spec: {
      url: "/openapi.json",
    },
  }));
}
