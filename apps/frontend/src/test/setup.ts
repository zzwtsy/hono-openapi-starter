import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./msw/server";
import "@testing-library/jest-dom/vitest";

// MSW:Vitest 官方推荐拦截网络(https://vitest.dev/guide/mocking/requests.md)
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

// RTL cleanup + 重置 handlers,保证用例隔离
afterEach(() => {
  server.resetHandlers();
  cleanup();
});

afterAll(() => {
  server.close();
});
