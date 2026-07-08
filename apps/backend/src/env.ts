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
  const message = formatEnvValidationError(parsed.error, ENV_FILE_HINT);
  process.stderr.write(`${message}\n`);
  // 抛错而非 process.exit:入口脚本/app 启动时未捕获即非零退出,防止带着错误配置启动;
  // 测试链路里被 vitest 捕获成测试失败(而非静默杀进程),便于定位。
  throw new Error("环境变量校验失败");
}

export type { Env } from "@/core/app/env-validation.js";
export default parsed.data;
