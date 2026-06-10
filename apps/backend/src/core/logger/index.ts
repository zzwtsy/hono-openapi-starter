import type { LogLayerTransport } from "loglayer";
import type { AppLoggerConfig } from "./config.js";

import { redactionPlugin } from "@loglayer/plugin-redaction";
import { LogLayer } from "loglayer";
import { serializeError } from "serialize-error";

import env from "../../env.js";

import { createLoggerConfig } from "./config.js";
import { logRedactionPaths, REDACTED, sanitizeSerializedError } from "./redact.js";
import { createDevPrettyTransport } from "./transports/dev-pretty.js";
import { createProdJsonlTransport } from "./transports/prod-jsonl.js";

export type AppLogger = LogLayer;
export type RequestLogger = LogLayer;

export const logger = createAppLogger(createLoggerConfig(env));

export function createAppLogger(
  config: AppLoggerConfig,
  transports: LogLayerTransport[] = createLoggerTransports(config),
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

function createLoggerTransports(config: AppLoggerConfig): LogLayerTransport[] {
  if (config.environment === "production") {
    return [createProdJsonlTransport(config)];
  }

  return [createDevPrettyTransport(config.environment === "development")];
}
