import { eq } from "drizzle-orm";
import {
  registerAuditRelationResolver,
  registerAuditResourceResolver,
} from "@/core/audit/index.js";
import { db } from "@/db/client.js";
import { organizations, projects, roles, user } from "@/db/schema/index.js";

let registered = false;

/**
 * 应用层装配审计名称 resolver。
 *
 * 业务表依赖留在 app assembly,core/audit 只依赖 resolver port。
 * 重复调用是幂等的,便于测试和开发环境热重载。
 */
export function registerAuditResolvers(): void {
  if (registered) {
    return;
  }
  registered = true;

  registerAuditResourceResolver("org", async (id) => {
    const [row] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, id));
    return row?.name;
  });

  registerAuditResourceResolver("user", async (id) => {
    const [row] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, id));
    return row?.name;
  });

  registerAuditResourceResolver("role", async (id) => {
    const [row] = await db
      .select({ name: roles.name })
      .from(roles)
      .where(eq(roles.id, id));
    return row?.name;
  });

  registerAuditResourceResolver("project", async (id) => {
    const [row] = await db
      .select({ name: projects.name })
      .from(projects)
      .where(eq(projects.id, id));
    return row?.name;
  });

  registerAuditRelationResolver({ field: "orgId", resourceType: "org" });
  registerAuditRelationResolver({ field: "userId", resourceType: "user" });
  registerAuditRelationResolver({ field: "roleId", resourceType: "role" });
}
