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
      // 剥到 data,使生成类型 = 业务数据类型(与 index.ts responded 运行时剥离一致)
      handleApi: (apiDescriptor) => {
        apiDescriptor.responses = apiDescriptor.responses?.properties?.data;
        return apiDescriptor;
      },
    },
  ],
  autoUpdate: true,
});
