import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./server";

// MSW:Vitest 官方推荐拦截网络(https://vitest.dev/guide/mocking/requests.md)
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

// 每个网络测试文件结束后恢复默认 handlers,保证用例隔离。
afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
