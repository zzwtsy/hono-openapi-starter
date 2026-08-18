import type { LogLayerTransport } from "loglayer";
import type { AppLoggerConfig } from "./config.js";

import { redactionPlugin } from "@loglayer/plugin-redaction";
import { BlankTransport, LogLayer } from "loglayer";
import { serializeError } from "serialize-error";

import env from "@/config/env.js";

import { createLoggerConfig } from "./config.js";
import { logRedactionPaths, REDACTED, sanitizeSerializedError } from "./redact.js";
import { createProdJsonlTransport } from "./transports/prod-jsonl.js";

export type AppLogger = LogLayer;
export type RequestLogger = LogLayer;

const loggerConfig = createLoggerConfig(env);
// eslint-disable-next-line antfu/no-top-level-await -- Node.js 24 原生支持 TLA，此处用于隔离开发依赖。
const defaultTransports = await createDefaultTransports(loggerConfig);

export const logger = createAppLogger(loggerConfig, defaultTransports);

export function createAppLogger(
  config: AppLoggerConfig,
  transports: LogLayerTransport[],
): AppLogger {
  const appLogger = new LogLayer({
    errorSerializer: error => sanitizeSerializedError(serializeError(error)),
    plugins: [
      redactionPlugin({
        paths: logRedactionPaths,
        censor: REDACTED,
        strict: false,
      }),
    ],
    transport: transports,
  });

  if (config.level === "silent") {
    return appLogger.disableLogging();
  }

  return appLogger.setLevel(config.level);
}

async function createDefaultTransports(config: AppLoggerConfig): Promise<LogLayerTransport[]> {
  if (config.environment === "production") {
    return [createProdJsonlTransport(config)];
  }
  if (config.environment === "test") {
    // release 的 migration/seed 以 test 模式运行，不能回退到未随包分发的开发 transport。
    return [new BlankTransport({ shipToLogger: () => [] })];
  }

  // 生产 release 不安装开发日志美化器；仅非生产环境才解析该模块。
  const { createDevPrettyTransport } = await import("./transports/dev-pretty.js");
  return [createDevPrettyTransport(true)];
}
