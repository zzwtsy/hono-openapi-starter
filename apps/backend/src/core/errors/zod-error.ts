import type { z } from "zod";

export interface ValidationErrorDetail {
  path: Array<number | string>;
  message: string;
}

export function formatZodError(error: z.ZodError): ValidationErrorDetail[] {
  return error.issues.map(issue => ({
    path: issue.path.map(pathSegment => (
      typeof pathSegment === "symbol"
        ? pathSegment.toString()
        : pathSegment
    )),
    message: issue.message,
  }));
}
