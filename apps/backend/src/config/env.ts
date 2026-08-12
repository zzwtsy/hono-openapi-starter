import path from "node:path";
import process from "node:process";
import { config } from "dotenv";

import { formatEnvValidationError, safeParseEnv } from "./env-schema.js";

const ENV_FILE_NAME = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
const ENV_FILE_HINT = path.posix.join(process.cwd(), ENV_FILE_NAME);

config({ path: path.resolve(process.cwd(), ENV_FILE_NAME) });

const parsed = safeParseEnv(process.env);
if (!parsed.success) {
  const message = formatEnvValidationError(parsed.error, ENV_FILE_HINT);
  process.stderr.write(`${message}\n`);
  throw new Error("环境变量校验失败");
}

export type { Env } from "./env-schema.js";
export default parsed.data;
