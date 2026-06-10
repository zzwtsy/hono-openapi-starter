import type { AppLoggerConfig } from "../config.js";

import { LogFileRotationTransport } from "@loglayer/transport-log-file-rotation";

export function createProdJsonlTransport(config: AppLoggerConfig) {
  return new LogFileRotationTransport({
    enabled: config.environment === "production",
    filename: config.logFile,
    frequency: "daily",
    dateFormat: "YMD",
    auditFile: config.auditFile,
    maxLogs: config.maxLogs,
    fieldNames: {
      timestamp: "ts",
      message: "msg",
      level: "level",
    },
  });
}
