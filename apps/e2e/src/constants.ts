import path from "node:path";
import process from "node:process";

export const E2E_ROOT = path.resolve(import.meta.dirname, "..");
export const REPO_ROOT = path.resolve(E2E_ROOT, "../..");
export const AUTH_DIR = path.join(E2E_ROOT, ".auth");
export const TEST_RESULTS_DIR = path.join(E2E_ROOT, "test-results");
// Playwright 会清空 outputDir；服务日志必须独立保存，避免测试启动时被删除。
export const SERVICE_LOG_DIR = path.join(E2E_ROOT, "service-logs");

export const BACKEND_URL = process.env.E2E_BACKEND_URL ?? "http://localhost:3001";
export const FRONTEND_URL = process.env.E2E_FRONTEND_URL ?? "http://localhost:5173";

export const SEED_ADMIN = {
  email: "dev@example.com",
  password: "dev-password",
  orgId: "org-dev",
} as const;

export const ADMIN_ROLE_ID = "role-admin";
export const RESTRICTED_USER = {
  email: "e2e-restricted@example.test",
  password: "e2e-restricted-password",
  name: "E2E Restricted User",
} as const;

export const ADMIN_STATE = path.join(AUTH_DIR, "seed-admin.json");
export const RESTRICTED_STATE = path.join(AUTH_DIR, "restricted.json");

// 各 project 使用独立的 RFC 5737 文档地址，避免并行认证共享后端限流额度。
const PROJECT_CLIENT_IPS: Readonly<Record<string, string>> = {
  setup: "192.0.2.10",
  chromium: "192.0.2.20",
  firefox: "192.0.2.30",
  webkit: "192.0.2.40",
};

export function e2eClientHeaders(projectName: string): Record<string, string> {
  const clientIp = PROJECT_CLIENT_IPS[projectName];
  if (clientIp == null) {
    throw new Error(`Unknown E2E project: ${projectName}`);
  }
  return { "x-forwarded-for": clientIp };
}

export function runId(): string {
  return process.env.E2E_RUN_ID ?? `local-${process.pid}`;
}
