import { z } from "@hono/zod-openapi";

export const ResponseMetaSchema = z.object({
  requestId: z.string().openapi({
    description: "用于串联响应、日志和排障上下文的请求标识。",
    example: "018f9d0f-fc0b-7f77-b2b7-78ec3efdb7ae",
  }),
}).openapi("ResponseMeta");

export const ErrorDetailSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])).openapi({
    description: "请求中校验失败字段的路径。",
    example: ["body", "email"],
  }),
  message: z.string().openapi({
    description: "校验错误说明。",
    example: "邮箱格式无效",
  }),
}).openapi("ErrorDetail");

export const ErrorSchema = z.object({
  type: z.enum(["business", "internal", "validation"]).openapi({
    description: "错误类型。",
    example: "validation",
  }),
  details: z.array(ErrorDetailSchema).optional().openapi({
    description: "结构化校验错误明细。",
  }),
}).openapi("ErrorBody");

export const ErrorEnvelopeSchema = z.object({
  success: z.literal(false).openapi({
    description: "请求是否成功。",
    example: false,
  }),
  code: z.string().openapi({
    description: "应用错误码。",
    example: "COMMON_VALIDATION_FAILED",
  }),
  message: z.string().openapi({
    description: "面向调用方的错误说明。",
    example: "请求校验失败",
  }),
  data: z.null().openapi({
    description: "失败响应固定为 null。",
  }),
  error: ErrorSchema,
  meta: ResponseMetaSchema,
}).openapi("ErrorEnvelope");

export function createSuccessEnvelopeSchema<TSchema extends z.ZodType>(dataSchema: TSchema) {
  return z.object({
    success: z.literal(true).openapi({
      description: "请求是否成功。",
      example: true,
    }),
    code: z.literal("COMMON_OK").openapi({
      description: "应用成功码。",
      example: "COMMON_OK",
    }),
    message: z.string().openapi({
      description: "面向调用方的成功说明。",
      example: "OK",
    }),
    data: dataSchema,
    error: z.null().openapi({
      description: "成功响应固定为 null。",
    }),
    meta: ResponseMetaSchema,
  });
}
