import { http, HttpResponse } from "msw";

/**
 * 业务 envelope 成功响应(与后端 core/http envelope + alova responded 剥离一致)。
 * MSW 返回完整 envelope,alova 运行时剥 data。
 */
export function okEnvelope<T>(data: T) {
  return HttpResponse.json({
    success: true,
    code: "COMMON_OK",
    message: "OK",
    data,
    error: null,
    meta: { requestId: "test-req" },
  });
}

/** 业务 envelope 失败(success:false → alova throw Error(message))。 */
export function failEnvelope(message: string, code = "COMMON_INTERNAL_ERROR") {
  return HttpResponse.json({
    success: false,
    code,
    message,
    data: null,
    error: { code, message },
    meta: { requestId: "test-req" },
  });
}

/**
 * 默认 handlers 为空:各测试用 server.use 注册,避免串扰。
 * 路径用 * 前缀兼容 baseURL 为空或绝对 URL。
 */
export const handlers: ReturnType<typeof http.get>[] = [];

// re-export 便于测试写 handler
export { http, HttpResponse };
