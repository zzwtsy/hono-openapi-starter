import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// RTL cleanup,保证组件用例隔离。
afterEach(() => {
  cleanup();
});
