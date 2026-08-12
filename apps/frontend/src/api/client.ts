import { createAlova } from "alova";
import adapterFetch from "alova/fetch";
import reactHook from "alova/react";
import { env } from "@/lib/env";

/** 后端统一响应 envelope（见 backend core/http/openapi/components.ts）。 */
interface ApiResponse {
  success: boolean;
  code: string;
  message: string;
  data: unknown;
  error: unknown;
  meta: { requestId: string };
}

// 扩展 method metadata：raw 标记跳过 envelope 剥离。
// 后端业务 API（/api/v1/*）必须 envelope；Better Auth /api/auth/* 不经 alova。
declare module "alova" {
  interface AlovaCustomTypes {
    meta: { raw?: boolean };
  }
}

/** 同源 fetch + React statesHook + envelope 运行时剥离。 */
export const alovaInstance = createAlova({
  baseURL: env.VITE_API_BASE_URL,
  statesHook: reactHook,
  requestAdapter: adapterFetch(),
  responded: {
    onSuccess: async (res, method) => {
      if (method.meta?.raw === true) {
        return res;
      }
      if (res.status === 401) {
        const back = window.location.pathname + window.location.search;
        window.location.assign(`/login?redirect=${encodeURIComponent(back)}`);
        throw new Error("登录已过期");
      }
      const json = (await res.json()) as ApiResponse;
      if (!json.success) {
        throw new Error(json.message || "请求失败");
      }
      return json.data;
    },
  },
});
