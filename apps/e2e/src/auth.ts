import type { APIRequestContext, APIResponse } from "@playwright/test";

import { ADMIN_ROLE_ID, SEED_ADMIN } from "./constants.js";

interface SuccessEnvelope<T> {
  success: true;
  data: T;
}

interface ErrorEnvelope {
  success: false;
  code: string;
}

export interface CreatedUser {
  id: string;
  email: string;
  name: string;
  orgId: string;
}

async function readJson<T>(response: APIResponse): Promise<T> {
  const body = await response.json() as SuccessEnvelope<T> | ErrorEnvelope;
  if (!response.ok() || !body.success) {
    const code = "code" in body ? body.code : "unknown";
    throw new Error(`E2E API request failed (${response.status()}): ${code}`);
  }
  return body.data;
}

export async function signIn(context: APIRequestContext, email: string, password: string): Promise<void> {
  const response = await context.post("/api/auth/sign-in/email", {
    data: { email, password },
  });
  if (!response.ok()) {
    throw new Error(`E2E sign-in failed (${response.status()}) for ${email}`);
  }
}

export async function createUser(
  context: APIRequestContext,
  input: { email: string; password: string; name: string; orgId?: string },
): Promise<CreatedUser> {
  const response = await context.post("/api/v1/users", {
    data: {
      email: input.email,
      password: input.password,
      name: input.name,
      orgId: input.orgId ?? SEED_ADMIN.orgId,
    },
  });
  return readJson<CreatedUser>(response);
}

export async function assignAdminRole(context: APIRequestContext, userId: string): Promise<void> {
  const response = await context.post(`/api/v1/users/${userId}/roles/${ADMIN_ROLE_ID}`, {
    data: { orgId: SEED_ADMIN.orgId },
  });
  await readJson<{ userId: string }>(response);
}
