import type { Env } from "@/env.js";

export type AppLogLevel = Env["LOG_LEVEL"];

export interface AppLoggerConfig {
  environment: Env["NODE_ENV"];
  level: AppLogLevel;
  logFile: string;
  auditFile: string;
  maxLogs: number;
}

export function createLoggerConfig(env: Env): AppLoggerConfig {
  return {
    environment: env.NODE_ENV,
    level: env.LOG_LEVEL,
    logFile: "./logs/app-%DATE%.jsonl",
    auditFile: "./logs/.audit.json",
    maxLogs: env.LOG_MAX_FILES,
  };
}
