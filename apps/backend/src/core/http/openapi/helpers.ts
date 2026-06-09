import type { z } from "@hono/zod-openapi";

import { createSuccessEnvelopeSchema, ErrorEnvelopeSchema } from "./components.js";

export function jsonSuccessResponse<TSchema extends z.ZodType>(
  schema: TSchema,
  description: string,
) {
  return {
    description,
    content: {
      "application/json": {
        schema: createSuccessEnvelopeSchema(schema),
      },
    },
  };
}

export function jsonErrorResponse(description: string) {
  return {
    description,
    content: {
      "application/json": {
        schema: ErrorEnvelopeSchema,
      },
    },
  };
}
