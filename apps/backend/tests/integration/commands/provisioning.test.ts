import { spawn } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { app } from "@/app/create-application.js";
import { auth } from "@/core/auth/index.js";
import { db } from "@/db/client.js";
import { account, organizations, user, userRoles } from "@/db/schema/index.js";
import { resetDb } from "../../helpers/db.js";

const backendRoot = resolve(import.meta.dirname, "../../..");

async function runCommand(script: string, env: Record<string, string>) {
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", script], {
      cwd: backendRoot,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", chunk => output += String(chunk));
    child.stderr.on("data", chunk => output += String(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`${script} exited with ${code}\n${output}`));
      }
    });
  });
}

beforeEach(async () => {
  await resetDb();
});

describe("provisioning commands", () => {
  it("bootstrap 创建可登录管理员，session 与 /api/v1/me 正常", async () => {
    await runCommand("src/commands/bootstrap-admin.ts", {
      BOOTSTRAP_ADMIN_EMAIL: "bootstrap@example.com",
      BOOTSTRAP_ADMIN_PASSWORD: "bootstrap-password-123",
      BOOTSTRAP_ROOT_ORG_ID: "org-bootstrap",
    });

    const [created] = await db.select({ id: user.id, orgId: user.orgId }).from(user).where(eq(user.email, "bootstrap@example.com"));
    expect(created?.orgId).toBe("org-bootstrap");
    if (created == null) {
      throw new Error("bootstrap user was not created");
    }
    await expect(db.select().from(account).where(eq(account.userId, created.id))).resolves.toHaveLength(1);

    const signed = await auth.api.signInEmail({
      body: { email: "bootstrap@example.com", password: "bootstrap-password-123" },
    });
    const currentSession = await auth.api.getSession({
      headers: { authorization: `Bearer ${signed.token}` },
    });
    expect(currentSession?.user.orgId).toBe("org-bootstrap");

    const response = await app.request("/api/v1/me", {
      headers: { authorization: `Bearer ${signed.token}` },
    });
    expect(response.status).toBe(200);
    const body = await response.json() as { data: { user: { orgId: string } } };
    expect(body.data.user.orgId).toBe("org-bootstrap");

    const authorizationResponse = await app.request("/api/v1/me/authorization", {
      headers: { authorization: `Bearer ${signed.token}` },
    });
    expect(authorizationResponse.status).toBe(200);
    const authorizationBody = await authorizationResponse.json() as { data: { orgId: string } };
    expect(authorizationBody.data.orgId).toBe("org-bootstrap");
  });

  it("development seed 创建可登录且带 home org 的演示用户", async () => {
    await runCommand("src/commands/seed-development.ts", { NODE_ENV: "test" });

    const [seeded] = await db.select({ orgId: user.orgId }).from(user).where(eq(user.id, "user-dev"));
    expect(seeded?.orgId).toBe("org-dev");
    await expect(db.select().from(organizations).where(eq(organizations.id, "org-dev"))).resolves.toHaveLength(1);
    await expect(db.select().from(userRoles).where(eq(userRoles.userId, "user-dev"))).resolves.toHaveLength(1);

    const signed = await auth.api.signInEmail({
      body: { email: "dev@example.com", password: "dev-password" },
    });
    expect(signed.user.orgId).toBe("org-dev");

    const authorizationResponse = await app.request("/api/v1/me/authorization", {
      headers: { authorization: `Bearer ${signed.token}` },
    });
    expect(authorizationResponse.status).toBe(200);
  });
});
