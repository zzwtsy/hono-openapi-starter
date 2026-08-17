import type { Context } from "hono";
import type { AppBindings } from "../http/context.js";

import type { AuditResourceRef } from "./ports.js";
import type {
  AuditConfig,
  AuditSnapshotConfig,
  AuditSnapshotInput,
} from "./types.js";

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
 * 3. handler 后:按 `after` 显式配置捕获 response/none/自定义快照,未配置则不捕获
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
function isSnapshotConfig(value: unknown): value is AuditSnapshotConfig {
  return typeof value === "object"
    && value !== null
    && typeof (value as { capture?: unknown }).capture === "function";
}

function isSnapshotInput(value: unknown): value is AuditSnapshotInput {
  return typeof value === "function" || isSnapshotConfig(value);
}

async function resolveSnapshot(input: AuditSnapshotInput, c: Context<AppBindings>): Promise<unknown> {
  if (typeof input === "function") {
    return input(c);
  }
  const value = await input.capture(c);
  return input.transform == null ? value : input.transform(value, c);
}

async function readResponseData(c: Context<AppBindings>): Promise<unknown> {
  const body = await c.res.clone().json() as { data?: unknown };
  return body.data;
}

function assertActionDefinition(config: AuditConfig): void {
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
}

function assertSnapshotInputs(config: AuditConfig): void {
  if (config.before != null && !isSnapshotInput(config.before)) {
    throw new Error(`audit config: invalid before snapshot (action: ${config.action.action})`);
  }
  if (
    config.after != null
    && config.after !== "response"
    && config.after !== "none"
    && !isSnapshotInput(config.after)
  ) {
    throw new Error(`audit config: invalid after snapshot (action: ${config.action.action})`);
  }
}

function assertResourceMode(config: AuditConfig): void {
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

function assertAuditConfig(config: AuditConfig): void {
  assertActionDefinition(config);
  assertSnapshotInputs(config);
  assertResourceMode(config);
}

async function captureSnapshotSafely(
  input: AuditSnapshotInput | undefined,
  c: Context<AppBindings>,
): Promise<unknown> {
  if (input == null) {
    return undefined;
  }
  try {
    return await resolveSnapshot(input, c);
  } catch {
    return undefined;
  }
}

interface AuditOutcome {
  status: "success" | "failure";
  errorCode?: string;
}

function readAuditOutcome(c: Context<AppBindings>): AuditOutcome {
  if (c.error instanceof AppError) {
    return { status: "failure", errorCode: c.error.code };
  }
  if (c.error != null) {
    return { status: "failure", errorCode: "COMMON_INTERNAL_ERROR" };
  }
  return { status: c.res.status >= 400 ? "failure" : "success" };
}

async function captureResponseSafely(c: Context<AppBindings>): Promise<unknown> {
  try {
    return await readResponseData(c);
  } catch {
    return undefined;
  }
}

async function resolveAfterSnapshot(
  afterConfig: AuditConfig["after"],
  status: AuditOutcome["status"],
  c: Context<AppBindings>,
): Promise<unknown> {
  if (afterConfig === "response") {
    return status === "success" ? captureResponseSafely(c) : undefined;
  }
  if (afterConfig == null || afterConfig === "none") {
    return undefined;
  }
  return captureSnapshotSafely(afterConfig, c);
}

async function resolveResourceRefs(
  config: AuditConfig,
  c: Context<AppBindings>,
  actionCode: string,
): Promise<readonly AuditResourceRef[]> {
  try {
    if (config.resourceRefs != null) {
      return await config.resourceRefs(c);
    }
    const id = (await config.resourceId(c)) ?? "";
    return [{ type: config.resourceType, id }];
  } catch (error) {
    logger
      .withError(error)
      .withMetadata({ action: actionCode })
      .error("audit resource refs resolution failed, recording without refs");
    return [];
  }
}

async function resolveMetadata(
  metadataConfig: AuditConfig["metadata"],
  c: Context<AppBindings>,
): Promise<Record<string, unknown> | undefined> {
  if (typeof metadataConfig !== "function") {
    return metadataConfig;
  }
  try {
    return await metadataConfig(c);
  } catch {
    return undefined;
  }
}

export function audit(config: AuditConfig) {
  // 配置错误在此抛(route 定义期),不会污染请求路径。
  assertAuditConfig(config);
  registerAuditAction(config.action);
  const actionCode = config.action.action;

  return createMiddleware<AppBindings>(async (c, next) => {
    // 在 handler 前捕获业务发生时间,避免 after/名称解析延迟污染事件时间。
    const occurredAt = new Date();

    // 1. handler 前:查 before(配了才查)
    const before = await captureSnapshotSafely(config.before, c);

    // 2. 执行 handler
    let status: "success" | "failure" = "success";
    let errorCode: string | undefined;

    try {
      await next();
      // Hono compose 在 handler 抛错时于最内层 dispatch 调用 errorHandler 并把错误挂到
      // context.error,next() 正常 resolve —— 失败检测以 c.error + c.res.status 为准。
      // (旧实现依赖 catch,errorCode 对 handler 抛错恒为 undefined——隐性 bug)
      ({ errorCode, status } = readAuditOutcome(c));
    } catch (e) {
      // 兜底:正常配置下 next() 不 reject(compose 内部消化),仅非 Error 抛错等边界走到这里。
      status = "failure";
      errorCode = e instanceof AppError ? e.code : "COMMON_INTERNAL_ERROR";
      throw e;
    } finally {
      // 3/4. handler 后:读 after,fire-and-forget 记审计
      const after = await resolveAfterSnapshot(config.after, status, c);

      // 解析 resourceRefs(async),再 fire-and-forget writeAudit。
      // 解析失败降级为空引用数组继续记(failure 审计不丢),不覆盖业务响应/错误码——
      // create 路由失败路径可能没有资源 id,此时继续记录不带资源引用的事件。
      const refs = await resolveResourceRefs(config, c, actionCode);

      // metadata 解析:支持函数形式(读请求上下文);解析失败不阻塞审计,降级 undefined
      const metadata = await resolveMetadata(config.metadata, c);

      void writeAudit({
        action: actionCode,
        resourceRefs: refs,
        beforeState: before,
        afterState: after,
        relations: config.relations,
        metadata,
        status,
        occurredAt,
        errorCode,
      }).catch(() => {
        // fire-and-forget:审计失败不阻塞响应,也不应崩溃进程。
        // writeAudit 内部已 try/catch 并 log error,此处二次兜底。
      });
    }
  });
}
