import process from "node:process";
import * as z from "zod";

const SENSITIVE_KEY_PATTERN = /SECRET|TOKEN|PASSWORD|KEY/i;
const MAX_DISPLAY_VALUE_LENGTH = 120;

/**
 * 应用环境变量校验模型。
 *
 * 字段默认值用于减少本地启动配置成本；敏感字段值仅在错误展示时脱敏输出。
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("production"),
  PORT: z.coerce.number().default(3001),

  // 日志配置。
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]),
  LOG_MAX_FILES: z.coerce.number().default(90),

  // 数据库配置。
  DATABASE_URL: z.string(),

  // Better Auth 配置。
  /** 认证会话签名密钥；校验失败时只显示掩码值。 */
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  /** 可信来源列表，多个来源用逗号分隔。 */
  BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),

  // API 与文档配置。
  /** 允许的前端来源列表，逗号分隔；留空则放行所有来源 */
  CORS_ORIGINS: z.string().optional(),
  /** 生产环境是否公开 /openapi.json（默认关闭，避免暴露端点结构） */
  OPENAPI_PUBLIC: z.stringbool().default(false),

  // 审计日志配置。
  /** 审计日志保留天数(0 = 永久保留,默认 90 天)。查询时惰性过滤 + 定时物理删除。 */
  AUDIT_LOG_RETENTION_DAYS: z.coerce.number().int().min(0).default(90),

  // 首次部署 bootstrap 配置。
  BOOTSTRAP_ADMIN_EMAIL: z.email().optional(),
  /** 首个 admin 密码；bootstrap 成功后应从部署环境移除。 */
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(8).optional(),
  BOOTSTRAP_ROOT_ORG_ID: z.string().default("org-root"),
});

export type Env = z.infer<typeof EnvSchema>;

function getIssueKey(issue: z.core.$ZodIssue): string {
  const key = issue.path[0];
  return typeof key === "string" && key.length > 0 ? key : "ROOT";
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

function maskSensitiveValue(value: string): string {
  if (value.length <= 4)
    return "****";

  return `${value.slice(0, 2)}${"*".repeat(value.length - 4)}${value.slice(-2)}`;
}

function truncateValue(value: string): string {
  if (value.length <= MAX_DISPLAY_VALUE_LENGTH)
    return value;

  return `${value.slice(0, MAX_DISPLAY_VALUE_LENGTH)}...`;
}

function formatIssueValue(key: string, issue: z.core.$ZodIssue): string {
  const rawValue = issue.input ?? (key !== "ROOT" ? process.env[key] : undefined);

  if (rawValue == null)
    return "<未设置>";

  const value = typeof rawValue === "string" ? rawValue : String(rawValue);

  if (isSensitiveKey(key))
    return maskSensitiveValue(value);

  return truncateValue(value);
}

/** 格式化环境变量校验错误；敏感值使用掩码，其他过长值会被截断。 */
export function formatEnvValidationError(error: z.ZodError, envFileHint: string): string {
  const lines = [`❌ 环境变量校验失败 (${error.issues.length} 项)`, ""];

  for (const [index, issue] of error.issues.entries()) {
    const key = getIssueKey(issue);
    const displayValue = formatIssueValue(key, issue);

    lines.push(`${index + 1}. [${key}] ${issue.message}`);
    lines.push(`   当前值: ${displayValue}`);
  }

  lines.push("");
  lines.push("请参考配置示例: apps/backend/.env.example");
  lines.push(`当前加载文件: ${envFileHint}`);

  return lines.join("\n");
}

export function safeParseEnv(rawEnv: NodeJS.ProcessEnv) {
  return EnvSchema.safeParse(rawEnv);
}
