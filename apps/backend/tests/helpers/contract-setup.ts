import process from "node:process";

// contract test 不连 DB,设假 env 让 EnvSchema 校验通过(无真实密钥/DB)。
// ??= 不覆盖已设(如 CI 注入)。需与 EnvSchema 必填字段同步。
process.env.NODE_ENV ??= "test";
process.env.LOG_LEVEL ??= "silent";
process.env.DATABASE_URL ??= "postgres://fake:fake@localhost:5432/fake";
process.env.BETTER_AUTH_SECRET ??= "test-secret-at-least-32-characters-long-placeholder";
process.env.BETTER_AUTH_URL ??= "http://localhost:3001";
process.env.DISABLE_SIGN_UP ??= "true";
