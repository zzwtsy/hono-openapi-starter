import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, it } from "vitest";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");
const backendRoot = path.join(repoRoot, "apps/backend");

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

it("后端编译契约与 Node.js 24 runtime 保持一致", async () => {
  const [rootPackage, backendPackage, tsconfig, buildConfig] = await Promise.all([
    readJson(path.join(repoRoot, "package.json")),
    readJson(path.join(backendRoot, "package.json")),
    readJson(path.join(backendRoot, "tsconfig.json")),
    readJson(path.join(backendRoot, "tsconfig.build.json")),
  ]);

  expect(tsconfig.compilerOptions).toMatchObject({
    target: "ES2024",
    lib: [
      "ES2024",
      "ESNext.Array",
      "ESNext.Collection",
      "ESNext.Error",
      "ESNext.Iterator",
      "ESNext.Promise",
    ],
    module: "NodeNext",
    verbatimModuleSyntax: true,
  });
  expect(buildConfig.compilerOptions.noEmitOnError).toBe(true);
  expect(backendPackage.engines?.node).toBe(rootPackage.engines?.node);
});
