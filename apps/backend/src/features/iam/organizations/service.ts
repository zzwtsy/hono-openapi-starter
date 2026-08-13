import type { IamActor } from "../access-policy.js";

import { randomUUID } from "node:crypto";

import { asc, eq, inArray, sql } from "drizzle-orm";
import { AppError } from "@/core/errors/app-error.js";
import { db } from "@/db/client.js";
import { organizations, user } from "@/db/schema/index.js";
import { assertTargetPermission } from "../access-policy.js";
import { getManagedSubtree } from "../org-tree.js";
import { acquireExclusiveTopologyLock } from "../topology-lock.js";

/** IAM 组织树管理子能力。 */
export const OrganizationService = {
  async listOrganizations(actorOrgId: string) {
    const subtree = await getManagedSubtree(actorOrgId);
    return db.select().from(organizations).where(inArray(organizations.id, subtree)).orderBy(asc(organizations.name));
  },

  /** 获取组织详情;不存在抛 NOT_FOUND。 */
  async getOrganizationById(id: string, actorOrgId?: string) {
    if (actorOrgId != null) {
      const subtree = await getManagedSubtree(actorOrgId);
      if (!subtree.includes(id)) {
        throw new AppError("ORG_NOT_FOUND");
      }
    }
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    if (org == null) {
      throw new AppError("ORG_NOT_FOUND");
    }
    return org;
  },

  /** 建组织(name + 可选 parentId);parentId 存在性校验。 */
  async createOrganization(actor: IamActor, input: { name: string; parentId: string }) {
    return db.transaction(async (tx) => {
      await tx.execute(acquireExclusiveTopologyLock());
      await assertTargetPermission(actor, "organizations.create", input.parentId);
      const [org] = await tx
        .insert(organizations)
        .values({ id: randomUUID(), name: input.name, parentId: input.parentId })
        .returning();
      return org;
    });
  },

  /** 改组织(改 parentId 时防环:新 parent 的祖先集含自身则成环,拒绝)。 */
  async updateOrganization(actor: IamActor, id: string, input: { name?: string; parentId?: string }) {
    // 防环 CTE 检查与 update 同事务:避免检查后、update 前的窗口被并发改 parentId 成环(B2 D4)。
    return db.transaction(async (tx) => {
      await tx.execute(acquireExclusiveTopologyLock());
      await assertTargetPermission(actor, "organizations.update", id);
      const [current] = await tx.select().from(organizations).where(eq(organizations.id, id)).for("update");
      if (current == null) {
        throw new AppError("ORG_NOT_FOUND");
      }
      if (input.parentId !== undefined) {
        if (current.parentId == null) {
          throw new AppError("ORG_ROOT_IMMUTABLE");
        }
        await assertTargetPermission(actor, "organizations.update", input.parentId);
        // 防环:新 parent 的祖先集(含自身)若含 id,说明 id 是新 parent 的祖先,挂上去成环
        const [row] = await tx.execute(sql`
          WITH RECURSIVE org_ancestors AS (
            SELECT ${organizations.id} FROM ${organizations} WHERE ${organizations.id} = ${input.parentId}
            UNION ALL
            SELECT ${organizations.parentId} FROM ${organizations}
            JOIN org_ancestors oa ON ${organizations.id} = oa.id
          )
          CYCLE id SET is_cycle USING path
          SELECT EXISTS(SELECT 1 FROM org_ancestors WHERE id = ${id}) AS is_cycle
        `);
        if (row?.is_cycle === true) {
          throw new AppError("ORG_CYCLE");
        }
      }
      const [org] = await tx.update(organizations).set(input).where(eq(organizations.id, id)).returning();
      return org;
    });
  },

  /** 删组织(有子组织或仍有用户拒绝;先锁组织，与创建用户/调岗统一锁顺序)。 */
  async deleteOrganization(actor: IamActor, id: string) {
    await db.transaction(async (tx) => {
      await tx.execute(acquireExclusiveTopologyLock());
      await assertTargetPermission(actor, "organizations.delete", id);
      // FOR UPDATE 先与引用方的 KEY SHARE 锁互斥。拿锁后再检查引用，
      // PostgreSQL READ COMMITTED 会让后续语句看到先完成事务的新用户。
      const [lockedOrg] = await tx
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, id))
        .for("update");
      if (lockedOrg == null) {
        throw new AppError("ORG_NOT_FOUND");
      }
      const [rootState] = await tx.select({ parentId: organizations.parentId }).from(organizations).where(eq(organizations.id, id));
      if (rootState?.parentId == null) {
        throw new AppError("ORG_ROOT_IMMUTABLE");
      }

      const [child] = await tx
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.parentId, id))
        .limit(1);
      if (child != null) {
        throw new AppError("ORG_HAS_CHILDREN");
      }

      const [u] = await tx.select({ id: user.id }).from(user).where(eq(user.orgId, id)).limit(1);
      if (u != null) {
        throw new AppError("ORG_HAS_USERS");
      }

      await tx.delete(organizations).where(eq(organizations.id, id));
    });
  },
};
