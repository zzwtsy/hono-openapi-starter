import { eq } from "drizzle-orm";

import { registerAuditRelationResolver, registerAuditResourceResolver } from "@/core/audit/relation-resolvers.js";
import {
  registerAuditActorOrgScopeResolver,
  registerAuditResourceVisibilityPolicy,
} from "@/core/audit/visibility-policies.js";
import { PermissionService } from "@/core/authorization/index.js";
import { AppError } from "@/core/errors/app-error.js";
import { db } from "@/db/client.js";
import { organizations, projects, roles, user } from "@/db/schema/index.js";
import { getManagedSubtree } from "@/features/iam/index.js";
import { ProjectService } from "@/features/projects/index.js";

let registered = false;

async function requirePermission(
  userId: string,
  permission: Parameters<typeof PermissionService.check>[1],
  organizationId: string,
): Promise<void> {
  if (!await PermissionService.check(userId, permission, organizationId)) {
    throw new AppError("COMMON_FORBIDDEN");
  }
}

/**
 * 装配审计名称、关联和资源可见性策略。
 *
 * 这里是允许组合 core、db 与各业务 feature 公开 API 的 application composition root。
 */
export function registerAuditPolicies(): void {
  if (registered) {
    return;
  }
  registered = true;

  registerAuditResourceResolver("org", async (id) => {
    const [row] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, id));
    return row?.name;
  });
  registerAuditResourceResolver("user", async (id) => {
    const [row] = await db.select({ name: user.name }).from(user).where(eq(user.id, id));
    return row?.name;
  });
  registerAuditResourceResolver("role", async (id) => {
    const [row] = await db.select({ name: roles.name }).from(roles).where(eq(roles.id, id));
    return row?.name;
  });
  registerAuditResourceResolver("project", async (id) => {
    const [row] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, id));
    return row?.name;
  });

  registerAuditRelationResolver({ field: "orgId", resourceType: "org" });
  registerAuditRelationResolver({ field: "userId", resourceType: "user" });
  registerAuditRelationResolver({ field: "roleId", resourceType: "role" });

  registerAuditActorOrgScopeResolver(async actor => getManagedSubtree(actor.organizationId));

  registerAuditResourceVisibilityPolicy("project", async (actor, resourceId) => {
    await requirePermission(actor.userId, "projects.read", actor.organizationId);
    await ProjectService.getById(resourceId, actor.organizationId);
  });

  registerAuditResourceVisibilityPolicy("user", async (actor, resourceId) => {
    await requirePermission(actor.userId, "users.read", actor.organizationId);
    const subtree = await getManagedSubtree(actor.organizationId);
    const [target] = await db.select({ orgId: user.orgId }).from(user).where(eq(user.id, resourceId));
    if (target?.orgId == null || !subtree.includes(target.orgId)) {
      throw new AppError("USER_NOT_FOUND");
    }
  });

  for (const [resourceType, permission] of [
    ["role", "roles.read"],
    ["org", "organizations.read"],
    ["setting", "settings.read"],
  ] as const) {
    registerAuditResourceVisibilityPolicy(resourceType, async actor =>
      requirePermission(actor.userId, permission, actor.organizationId));
  }
}
