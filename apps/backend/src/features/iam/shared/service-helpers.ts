import { eq } from "drizzle-orm";

import { getPermissionRef } from "@/catalogs/permissions.js";
import { AppError } from "@/core/errors/app-error.js";
import { db } from "@/db/client.js";
import { organizations, permissions, roles, user } from "@/db/schema/index.js";
import { assertOrgInSubtree } from "../org-tree.js";

export async function getRole(id: string) {
  const [role] = await db.select().from(roles).where(eq(roles.id, id));
  if (role == null) {
    throw new AppError("ROLE_NOT_FOUND");
  }
  return role;
}

export async function requireInstanceRole(id: string) {
  const [role] = await db.select({ source: roles.source }).from(roles).where(eq(roles.id, id));
  if (role == null || role.source !== "instance") {
    throw new AppError("ROLE_NOT_FOUND");
  }
}

export function assertNotSelf(
  actorUserId: string,
  targetUserId: string,
  code: "USER_CANNOT_DISABLE_SELF" | "USER_CANNOT_REVOKE_OWN_AUTH" | "USER_CANNOT_TRANSFER_SELF",
): void {
  if (targetUserId === actorUserId) {
    throw new AppError(code);
  }
}

export async function requireExistingRole(id: string) {
  const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.id, id));
  if (role == null) {
    throw new AppError("ROLE_NOT_FOUND");
  }
}

export async function requireExistingOrg(id: string) {
  const [org] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, id));
  if (org == null) {
    throw new AppError("ORG_NOT_FOUND");
  }
}

export function assertPermissionCodeInCatalog(permissionCode: string): void {
  try {
    getPermissionRef(permissionCode);
  } catch {
    throw new AppError("PERMISSION_NOT_FOUND", { params: { permissionCode } });
  }
}

export async function requireExistingPermission(permissionCode: string) {
  assertPermissionCodeInCatalog(permissionCode);
  const [permission] = await db
    .select({ code: permissions.code })
    .from(permissions)
    .where(eq(permissions.code, permissionCode));
  if (permission == null) {
    throw new AppError("PERMISSION_NOT_FOUND", { params: { permissionCode } });
  }
}

export async function requireUserInSubtree(actorOrgId: string, userId: string) {
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      orgId: user.orgId,
      disabled: user.disabled,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, userId));
  if (row == null || row.orgId == null) {
    throw new AppError("USER_NOT_FOUND");
  }

  try {
    await assertOrgInSubtree(actorOrgId, row.orgId);
  } catch (error) {
    if (error instanceof AppError) {
      throw new AppError("USER_NOT_FOUND");
    }
    throw error;
  }
  return row;
}
