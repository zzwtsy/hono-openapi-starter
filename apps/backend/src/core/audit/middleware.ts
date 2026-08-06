import type { AppBindings } from "../http/context.js";

import type { AuditConfig } from "./types.js";

import { createMiddleware } from "hono/factory";
import { AppError } from "../errors/app-error.js";
import { logger } from "../logger/index.js";
import { registerAuditAction } from "./action.js";
import { writeAudit } from "./write-audit.js";

/**
 * 审计路由中间件:声明式挂在路由 `middleware` 数组上,service/handler 零改动。
 *
 * 执行流程:
 * 1. handler 前:调 `before(c)` 查旧值(配了才查)
 * 2. await next():执行 handler
 * 3. handler 后:调配置的 `after`;未配置时暂时兼容从响应体 `.data` 读取
 * 4. fire-and-forget:writeAudit 入队,不阻塞响应
 *
 * 失败路径:Hono compose 在 handler 抛错时于最内层 dispatch 调用 errorHandler,并把错误挂到
 * `c.error`,`next()` 不会 reject —— 失败检测以 `c.error` + `c.res.status` 为准(catch 仅作兜底)。
 * finally 确保无论成功失败都记审计。
 *
 * 用 `createMiddleware<AppBindings>` 不带泛型,配置经闭包传入,不破坏 createRoute 类型推断。
 */
/**
 * 定义期校验(fail-fast):配置错误在 route 定义时即抛,不等到请求期。
 * 与请求期 try/catch 互补:静态错误尽早暴露,运行时抖动(响应体不可读等)不覆盖业务。
 */
function assertAuditConfig(config: AuditConfig): void {
  if (
    config.action == null
    || typeof config.action !== "object"
    || typeof config.action.action !== "string"
    || config.action.action.length === 0
  ) {
    throw new Error("audit config: action definition is required");
  }
  if (typeof config.action.label !== "string" || config.action.label.length === 0) {
    throw new Error(`audit config: action label is required (action: ${config.action.action})`);
  }
  const actionCode = config.action.action;
  const hasResourceType = config.resourceType != null;
  const hasResourceRefs = config.resourceRefs != null;
  if (hasResourceType === hasResourceRefs) {
    throw new Error(
      `audit config: exactly one of resourceType or resourceRefs must be set (action: ${actionCode})`,
    );
  }
  if (hasResourceType && config.resourceId == null) {
    throw new Error(`audit config: resourceType set but resourceId missing (action: ${actionCode})`);
  }
}

export function audit(config: AuditConfig) {
  // 配置错误在此抛(route 定义期),不会污染请求路径。
  assertAuditConfig(config);
  registerAuditAction(config.action);
  const actionCode = config.action.action;

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
      // Hono compose 在 handler 抛错时于最内层 dispatch 调用 errorHandler 并把错误挂到
      // context.error,next() 正常 resolve —— 失败检测以 c.error + c.res.status 为准。
      // (旧实现依赖 catch,errorCode 对 handler 抛错恒为 undefined——隐性 bug)
      const err = c.error;
      if (err instanceof AppError) {
        status = "failure";
        errorCode = err.code;
      } else if (err != null) {
        status = "failure";
        errorCode = "COMMON_INTERNAL_ERROR";
      } else if (c.res.status >= 400) {
        status = "failure";
      }
    } catch (e) {
      // 兜底:正常配置下 next() 不 reject(compose 内部消化),仅非 Error 抛错等边界走到这里。
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

      // 解析 resourceRefs(async),再 fire-and-forget writeAudit。
      // 解析失败降级为空引用数组继续记(failure 审计不丢),不覆盖业务响应/错误码——
      // create 路由失败路径可能没有资源 id,此时继续记录不带资源引用的事件。
      let refs: Array<{ type: string; id: string }> = [];
      try {
        if (config.resourceRefs != null) {
          refs = await config.resourceRefs(c);
        } else if (config.resourceType != null) {
          const id = (await config.resourceId?.(c)) ?? "";
          refs = [{ type: config.resourceType, id }];
        }
      } catch (e) {
        logger
          .withError(e)
          .withMetadata({ action: actionCode })
          .error("audit resource refs resolution failed, recording without refs");
      }

      // metadata 解析:支持函数形式(读请求上下文);解析失败不阻塞审计,降级 undefined
      let metadata: Record<string, unknown> | undefined;
      if (typeof config.metadata === "function") {
        try {
          metadata = await config.metadata(c);
        } catch {
          // metadata 解析失败不阻塞审计
        }
      } else {
        metadata = config.metadata;
      }

      void writeAudit({
        action: actionCode,
        resourceRefs: refs,
        beforeState: before,
        afterState: after,
        relations: config.relations,
        metadata,
        status,
        errorCode,
      }).catch(() => {
        // fire-and-forget:审计失败不阻塞响应,也不应崩溃进程。
        // writeAudit 内部已 try/catch 并 log error,此处二次兜底。
      });
    }
  });
}
