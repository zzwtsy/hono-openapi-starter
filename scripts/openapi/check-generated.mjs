/** 静态导出 OpenAPI，在临时目录生成 Wormhole 客户端并与提交产物比较。 */
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
export const generatedApiFiles = ["createApis.ts", "apiDefinitions.ts", "globals.d.ts"];

async function readComparedFile(filePath, label, failures) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      failures.push(`missing ${label}: ${filePath}`);
      return undefined;
    }
    throw error;
  }
}

export async function compareGeneratedFiles(trackedDirectory, generatedDirectory) {
  const failures = [];
  for (const file of generatedApiFiles) {
    const tracked = await readComparedFile(path.join(trackedDirectory, file), "tracked file", failures);
    const generated = await readComparedFile(path.join(generatedDirectory, file), "generated file", failures);
    if (tracked !== undefined && generated !== undefined && tracked !== generated) {
      failures.push(`changed generated file: ${file}`);
    }
  }
  return failures;
}

async function run(root, executable, args, options = {}) {
  const result = await execFileAsync(executable, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    env: { ...process.env, ...options.env },
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.stdout)
    process.stdout.write(result.stdout);
  if (result.stderr)
    process.stderr.write(result.stderr);
}

async function getRoot() {
  const { stdout } = await execFileAsync("git", ["rev-parse", "--show-toplevel"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  return stdout.trim();
}

async function main() {
  const root = await getRoot();
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "hono-openapi-generated-"));
  const specPath = path.join(temporaryRoot, "openapi.json");
  const outputPath = path.join(temporaryRoot, "api");

  try {
    await run(root, "pnpm", ["--filter", "backend", "openapi:export", specPath]);
    await run(root, "pnpm", ["--filter", "frontend", "gen:api"], {
      env: {
        OPENAPI_INPUT: specPath,
        OPENAPI_OUTPUT: outputPath,
      },
    });

    const failures = await compareGeneratedFiles(
      path.join(root, "apps/frontend/src/api"),
      outputPath,
    );
    if (failures.length > 0) {
      process.stderr.write(`${failures.join("\n")}\n`);
      process.stderr.write("运行 pnpm --filter frontend gen:api 更新并 review 生成物。\n");
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`openapi:generated passed (${generatedApiFiles.length} files)\n`);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
