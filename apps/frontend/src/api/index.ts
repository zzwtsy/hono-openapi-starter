import { createAlova } from "alova";
import adapterFetch from "alova/fetch";
import reactHook from "alova/react";
import { createApis, mountApis, withConfigType } from "./createApis";

/** 后端统一响应 envelope(见 backend core/http/openapi/components.ts)。 */
interface ApiResponse {
  success: boolean;
  code: string;
  message: string;
  data: unknown;
  error: unknown;
  meta: { requestId: string };
}

// 扩展 method metadata:raw 标记跳过 envelope 剥离。
// 后端规范(docs/conventions/response-envelope.md):业务 API(/api/v1/*)必须 envelope,
// Better Auth /api/auth/* 例外但前端走 Better Auth client 不经 alova;
// 未来若有非 envelope 业务端点走 alova(文件下载/SSE/二进制),用 meta.raw 标记返回原始响应。
declare module "alova" {
  interface AlovaCustomTypes {
    meta: { raw?: boolean };
  }
}

// alova 实例:同源(经 vite proxy)+ react statesHook + envelope 运行时剥离。
// 类型剥离在 alova.config.ts 的 handleApi 完成(生成类型 = data 类型),
// 这里 responded 运行时剥 envelope,两端一致。
export const alovaInstance = createAlova({
  baseURL: "",
  statesHook: reactHook,
  requestAdapter: adapterFetch(),
  responded: {
    onSuccess: async (res, method) => {
      // 非 envelope 端点(如文件下载)用 meta.raw 标记,返回原始 Response 由调用方处理
      if (method.meta?.raw === true) {
        return res;
      }
      const json = (await res.json()) as ApiResponse;
      if (!json.success) {
        throw new Error(json.message || "请求失败");
      }
      return json.data;
    },
  },
});

export const $$userConfigMap = withConfigType({});

const Apis = createApis(alovaInstance, $$userConfigMap);

mountApis(Apis);

export default Apis;
