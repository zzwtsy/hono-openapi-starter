import path from "node:path";
import process from "node:process";
import { config } from "dotenv";
import { formatEnvValidationError, safeParseEnv } from "./core/app/env-validation.js";

// 注意：测试环境优先读取 .env.test，避免污染开发/生产配置。
const ENV_FILE_NAME = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
const ENV_FILE_HINT = path.posix.join(process.cwd(), ENV_FILE_NAME);

config({
  path: path.resolve(
    process.cwd(),
    ENV_FILE_NAME,
  ),
});

const parsed = safeParseEnv(process.env);

if (!parsed.success) {
  console.error(formatEnvValidationError(parsed.error, ENV_FILE_HINT));
  // 注意：环境变量不合法时主动终止进程，防止应用带着错误配置启动。
  process.exit(1);
}

export type { Env } from "@/core/app/env-validation.js";
export default parsed.data;
