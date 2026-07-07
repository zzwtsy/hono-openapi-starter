import { z } from "@hono/zod-openapi";

/** 项目资源 schema(响应体)。 */
export const ProjectSchema = z.object({
  id: z.string().openapi({
    description: "项目 ID",
    example: "proj-1",
  }),
  name: z.string().openapi({
    description: "项目名称",
    example: "官网改版",
  }),
  description: z.string().nullable().openapi({
    description: "项目描述,可为空",
    example: "2026 年官网改版项目",
  }),
  orgId: z.string().openapi({
    description: "所属组织 ID",
    example: "org-south",
  }),
  createdAt: z.iso.datetime().openapi({
    description: "创建时间(ISO 8601)",
    example: "2026-07-07T00:00:00.000Z",
  }),
  updatedAt: z.iso.datetime().openapi({
    description: "更新时间(ISO 8601)",
    example: "2026-07-07T00:00:00.000Z",
  }),
}).openapi("Project");

/** 项目 ID 路径参数。 */
export const ProjectIdParamSchema = z.object({
  projectId: z.string().openapi({
    description: "项目 ID",
    example: "proj-1",
  }),
});
