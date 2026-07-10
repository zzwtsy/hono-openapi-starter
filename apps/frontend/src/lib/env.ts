import { z } from "zod";

// 前端环境变量校验:启动时 fail-fast,防缺/错。
// VITE_ 变量打包进源码,勿含敏感信息(见 Vite env 文档)。
const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default(""),
});

export const env = envSchema.parse(import.meta.env);
