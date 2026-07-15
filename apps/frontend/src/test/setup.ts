import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// RTL 文档:框架级 teardown,避免测试间 DOM 泄漏。
afterEach(() => {
  cleanup();
});
