import { mkdir } from "node:fs/promises";

import { test as setup } from "@playwright/test";

import { createUser, signIn } from "../src/auth.js";
import {
  ADMIN_STATE,
  AUTH_DIR,
  e2eClientHeaders,
  FRONTEND_URL,
  RESTRICTED_STATE,
  RESTRICTED_USER,
  SEED_ADMIN,
} from "../src/constants.js";

setup("准备 E2E 认证状态", async ({ playwright }) => {
  await mkdir(AUTH_DIR, { recursive: true });
  const extraHTTPHeaders = e2eClientHeaders("setup");
  const adminContext = await playwright.request.newContext({
    baseURL: FRONTEND_URL,
    extraHTTPHeaders,
  });
  try {
    await signIn(adminContext, SEED_ADMIN.email, SEED_ADMIN.password);
    await adminContext.storageState({ path: ADMIN_STATE });

    const restricted = await createUser(adminContext, {
      ...RESTRICTED_USER,
      orgId: SEED_ADMIN.orgId,
    });
    if (restricted.email !== RESTRICTED_USER.email) {
      throw new Error("E2E restricted user provisioning returned an unexpected identity");
    }
  } finally {
    await adminContext.dispose();
  }

  const restrictedContext = await playwright.request.newContext({
    baseURL: FRONTEND_URL,
    extraHTTPHeaders,
  });
  try {
    await signIn(restrictedContext, RESTRICTED_USER.email, RESTRICTED_USER.password);
    await restrictedContext.storageState({ path: RESTRICTED_STATE });
  } finally {
    await restrictedContext.dispose();
  }
});
