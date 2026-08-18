import { createServer } from "node:http";

import { expect, it } from "vitest";

import { waitForService } from "./runner-lifecycle.js";

async function pendingExit(): Promise<void> {
  await new Promise<void>(() => {});
}

it("服务地址就绪后结束等待", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200).end("ready");
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    const address = server.address();
    if (address == null || typeof address === "string") {
      throw new Error("test server did not expose a TCP address");
    }

    await waitForService(
      { name: "test-service", exit: pendingExit() },
      `http://127.0.0.1:${address.port}`,
      new AbortController().signal,
    );
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(error => error == null ? resolve() : reject(error));
    });
  }
});

it("服务非零退出时传播原始错误", async () => {
  const exitError = new Error("backend exited with code 1; log: backend.log");

  await expect(
    waitForService(
      { name: "backend", exit: Promise.reject(exitError) },
      "http://127.0.0.1:1/readyz",
      new AbortController().signal,
    ),
  ).rejects.toBe(exitError);
});

it("服务正常提前退出时报告未就绪", async () => {
  await expect(
    waitForService(
      { name: "frontend", exit: Promise.resolve() },
      "http://127.0.0.1:1",
      new AbortController().signal,
    ),
  ).rejects.toThrow("frontend exited before ready");
});

it("abort signal 立即中断等待", async () => {
  const controller = new AbortController();
  const abortError = new Error("test shutdown");
  controller.abort(abortError);

  await expect(
    waitForService(
      { name: "backend", exit: pendingExit() },
      "http://127.0.0.1:1/readyz",
      controller.signal,
    ),
  ).rejects.toBe(abortError);
});
