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

  // --- 日志相关配置 ---
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]),
  /** 保留的最大日志文件数量 (默认: 90) */
  LOG_MAX_FILES: z.coerce.number().default(90),

  // --- 数据库相关配置 ---
  DATABASE_URL: z.string(),

  // --- Better Auth 相关配置 ---
  /** 认证服务的密钥, 长度必须至少 32 位 */
  BETTER_AUTH_SECRET: z.string().min(32),
  /** 认证服务的公网访问地址 */
  BETTER_AUTH_URL: z.url(),
  /** 可信任的来源列表 `,` 逗号分隔 */
  BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),
  /** 禁止注册 */
  DISABLE_SIGN_UP: z.stringbool().default(true),
});

/** 应用启动时环境变量的最终类型。 */
export type Env = z.infer<typeof EnvSchema>;

/**
 * 从 Zod issue 中提取环境变量键名。
 *
 * @param issue Zod 校验失败条目。
 * @returns 首层路径键名，缺失时返回 `ROOT`。
 */
function getIssueKey(issue: z.core.$ZodIssue): string {
  const key = issue.path[0];
  return typeof key === "string" && key.length > 0 ? key : "ROOT";
}

/**
 * 判断变量名是否属于敏感信息。
 *
 * @param key 环境变量名。
 * @returns 是否需要脱敏显示。
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

/**
 * 对敏感值进行部分掩码处理。
 *
 * @param value 原始字符串值。
 * @returns 脱敏后的字符串。
 */
function maskSensitiveValue(value: string): string {
  if (value.length <= 4)
    return "****";

  return `${value.slice(0, 2)}${"*".repeat(value.length - 4)}${value.slice(-2)}`;
}

/**
 * 截断过长展示值，避免启动日志过大。
 *
 * @param value 待展示字符串。
 * @returns 截断后的字符串。
 */
function truncateValue(value: string): string {
  if (value.length <= MAX_DISPLAY_VALUE_LENGTH)
    return value;

  return `${value.slice(0, MAX_DISPLAY_VALUE_LENGTH)}...`;
}

/**
 * 格式化单个环境变量的错误展示值。
 *
 * @param key 环境变量键名。
 * @param issue 对应校验错误。
 * @returns 脱敏并截断后的可读值。
 */
function formatIssueValue(key: string, issue: z.core.$ZodIssue): string {
  const rawValue = issue.input ?? (key !== "ROOT" ? process.env[key] : undefined);

  if (rawValue == null)
    return "<未设置>";

  const value = typeof rawValue === "string" ? rawValue : String(rawValue);

  if (isSensitiveKey(key))
    return maskSensitiveValue(value);

  return truncateValue(value);
}

/**
 * 拼接环境变量校验失败的完整提示信息。
 *
 * @param error Zod 错误对象。
 * @param envFileHint 当前加载 env 文件的路径提示。
 * @returns 可直接输出到终端的多行文本。
 */
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

/** 对环境变量做安全解析，返回 Zod 标准结果。 */
export function safeParseEnv(rawEnv: NodeJS.ProcessEnv) {
  return EnvSchema.safeParse(rawEnv);
}
