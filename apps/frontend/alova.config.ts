import { defineConfig } from "@alova/wormhole";

// 从后端 OpenAPI spec 自动生成类型安全的 API 函数。
// 生成产物:src/api/index.ts(可编辑,alova 实例)+ createApis.ts/apiDefinitions.ts(生成勿改)。
export default defineConfig({
  generator: [
    {
      input: "http://localhost:3001/openapi.json",
      output: "src/api",
      global: "Apis",
      type: "typescript",
      // 后端 envelope { success, code, message, data, error, meta };
      // 仅当响应是 envelope(同时含 success + data)时剥到 data,使生成类型 = 业务数据类型(与 index.ts responded 运行时剥离一致)。
      // 非 envelope 端点(文件下载/SSE/二进制)原样保留,与 index.ts 的 meta.raw 运行时分支对齐,避免类型变 undefined。
      handleApi: (apiDescriptor) => {
        const props = apiDescriptor.responses?.properties;
        if (props && "success" in props && "data" in props) {
          apiDescriptor.responses = props.data;
        }
        return apiDescriptor;
      },
    },
  ],
  autoUpdate: false,
});
