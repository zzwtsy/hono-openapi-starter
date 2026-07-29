import type { AppBindings } from "../http/context.js";

import type { AuditConfig } from "./types.js";

import { createMiddleware } from "hono/factory";
import { AppError } from "../errors/app-error.js";
import { writeAudit } from "./write-audit.js";

/**
 * 审计路由中间件:声明式挂在路由 `middleware` 数组上,service/handler 零改动。
 *
 * 执行流程:
 * 1. handler 前:调 `before(c)` 查旧值(配了才查)
 * 2. await next():执行 handler
 * 3. handler 后:读 after(配了 `after` 函数则调函数;否则默认从响应体 `.data` 读)
 * 4. fire-and-forget:writeAudit 入队,不阻塞响应
 *
 * 失败路径:handler 抛错时,catch 里记 failure(before 有值、after 为空、errorCode 记错误码),
 * 然后 rethrow 给 errorHandler。finally 确保无论成功失败都记审计。
 *
 * 用 `createMiddleware<AppBindings>` 不带泛型,配置经闭包传入,不破坏 createRoute 类型推断。
 */
export function audit(config: AuditConfig) {
  return createMiddleware<AppBindings>(async (c, next) => {
    // 1. handler 前:查 before(配了才查)
    let before: unknown;
    if (config.before != null) {
      try {
        before = await config.before(c);
      } catch {
        // before 查询失败不阻塞业务(如资源不存在让 handler 自己抛 404)
      }
    }

    // 2. 执行 handler
    let status: "success" | "failure" = "success";
    let errorCode: string | undefined;

    try {
      await next();
      if (c.res.status >= 400) {
        status = "failure";
      }
    } catch (e) {
      status = "failure";
      errorCode = e instanceof AppError ? e.code : "COMMON_INTERNAL_ERROR";
      throw e;
    } finally {
      // 3/4. handler 后:读 after,fire-and-forget 记审计
      let after: unknown;

      if (config.after != null) {
        try {
          after = await config.after(c);
        } catch {
          // after 查询失败不阻塞响应
        }
      } else if (status === "success") {
        try {
          const body = await c.res.clone().json() as { data?: unknown };
          after = body.data;
        } catch {
          // 响应体不是 JSON 或读取失败,after 为空
        }
      }

      // 先解析 resourceRefs(async),再 fire-and-forget writeAudit
      const refs = config.resourceRefs != null
        ? await config.resourceRefs(c)
        : [{ type: config.resourceType ?? "unknown", id: await config.resourceId?.(c) ?? "" }];
      void writeAudit({
        action: config.action,
        resourceRefs: refs,
        beforeState: before,
        afterState: after,
        relations: config.relations,
        metadata: config.metadata,
        status,
        errorCode,
      }).catch(() => {
        // fire-and-forget:审计失败不阻塞响应,也不应崩溃进程。
        // writeAudit 内部已 try/catch 并 log error,此处二次兜底。
      });
    }
  });
}
