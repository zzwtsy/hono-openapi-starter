import type { AppOpenAPI } from "./create-router.js";

import { Scalar } from "@scalar/hono-api-reference";
import env from "@/config/env.js";
import { securitySchemes } from "../http/openapi/security.js";

export function configureOpenApi(app: AppOpenAPI) {
  // 注册安全方案组件:认证路由通过 `security` 引用,生成的 spec 如实反映需认证。
  for (const [name, scheme] of Object.entries(securitySchemes)) {
    app.openAPIRegistry.registerComponent("securitySchemes", name, scheme);
  }

  // `/openapi.json` 生产默认关闭，避免暴露完整端点结构；开发环境或显式开启时挂载。
  // 需要静态 spec 时直接调 app.getOpenAPIDocument() 取文档,不依赖此端点。
  if (env.NODE_ENV === "development" || env.OPENAPI_PUBLIC) {
    app.doc("/openapi.json", {
      openapi: "3.0.3",
      info: {
        title: "Hono 后端模板 API",
        version: "1.0.0",
        description: "面向生产环境的 Hono 后端模板 API。",
      },
    }, {
      // Zod union 允许多个分支重叠,与 anyOf 语义一致。
      // 全局使用 oneOf 会与递归 AuditJsonValue 的显式 anyOf 合并,
      // 让 Wormhole 把 schema 生成为交叉类型(&)而不是联合类型(|)。
      unionPreferredType: "anyOf",
    });
  }

  // `/reference` 面向开发者阅读，仅开发环境挂载。
  if (env.NODE_ENV === "development") {
    app.get("/reference", Scalar({
      pageTitle: "Hono 后端模板 API 参考文档",
      withDefaultFonts: false,
      telemetry: false,
      showDeveloperTools: "never",
      localization: {
        locale: "zh-CN",
        direction: "auto",
      },
      spec: {
        url: "/openapi.json",
      },
    }));
  }
}
