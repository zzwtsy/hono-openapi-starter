import type { APIRequestContext } from "@playwright/test";

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { assignAdminRole, createUser, signIn } from "../auth.js";
import { ADMIN_STATE, AUTH_DIR, e2eClientHeaders, FRONTEND_URL, runId, SEED_ADMIN } from "../constants.js";
import { test as base, expect } from "./base.js";

async function createWorkerStorageState(
  playwright: {
    request: {
      newContext: (options: {
        baseURL: string;
        extraHTTPHeaders: Record<string, string>;
        storageState: string;
      }) => Promise<APIRequestContext>;
    };
  },
  workerIndex: number,
  projectName: string,
): Promise<string> {
  await mkdir(AUTH_DIR, { recursive: true });
  const adminContext = await playwright.request.newContext({
    baseURL: FRONTEND_URL,
    extraHTTPHeaders: e2eClientHeaders(projectName),
    storageState: ADMIN_STATE,
  });
  const suffix = `${runId()}-${projectName}-${workerIndex}`.replace(/[^a-z0-9-]/gi, "-");
  const account = {
    email: `e2e-admin-${suffix}@example.test`,
    password: "e2e-admin-password",
    name: `E2E Admin ${projectName} ${workerIndex}`,
  };

  try {
    const user = await createUser(adminContext, account);
    await assignAdminRole(adminContext, user.id);
    await signIn(adminContext, account.email, account.password);
    const statePath = path.join(AUTH_DIR, `worker-${suffix}.json`);
    await adminContext.storageState({ path: statePath });
    return statePath;
  } finally {
    await adminContext.dispose();
  }
}

export const test = base.extend<Record<never, never>, { workerStorageState: string }>({
  storageState: async ({ workerStorageState }, runFixture) => {
    await runFixture(workerStorageState);
  },
  workerStorageState: [async ({ playwright }, runFixture, workerInfo) => {
    const projectName = workerInfo.project.name;
    const statePath = await createWorkerStorageState(playwright, workerInfo.workerIndex, projectName);
    await runFixture(statePath);
  }, { scope: "worker" }],
});

export { expect, SEED_ADMIN };
