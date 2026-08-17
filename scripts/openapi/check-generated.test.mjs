import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { compareGeneratedFiles, generatedApiFiles } from "./check-generated.mjs";

async function writeGeneratedSet(directory, suffix = "") {
  await mkdir(directory, { recursive: true });
  await Promise.all(generatedApiFiles.map(file => writeFile(path.join(directory, file), `${file}${suffix}\n`)));
}

it("只比较声明的三个 Wormhole 生成文件", () => {
  expect(generatedApiFiles).toEqual(["createApis.ts", "apiDefinitions.ts", "globals.d.ts"]);
});

it("相同生成文件通过且单文件漂移会指出文件名", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "check-generated-test-"));
  const tracked = path.join(root, "tracked");
  const generated = path.join(root, "generated");
  try {
    await writeGeneratedSet(tracked);
    await writeGeneratedSet(generated);
    expect(await compareGeneratedFiles(tracked, generated)).toEqual([]);

    await writeFile(path.join(generated, "globals.d.ts"), "drift\n");
    expect(await compareGeneratedFiles(tracked, generated)).toEqual([
      "changed generated file: globals.d.ts",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("缺少生成文件时返回可定位失败", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "check-generated-missing-"));
  const tracked = path.join(root, "tracked");
  const generated = path.join(root, "generated");
  try {
    await writeGeneratedSet(tracked);
    await mkdir(generated, { recursive: true });
    const failures = await compareGeneratedFiles(tracked, generated);
    expect(failures).toHaveLength(3);
    expect(failures[0]).toContain("missing generated file");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
