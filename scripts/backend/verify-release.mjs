/**
 * 对 pnpm deploy 生成的 backend release 执行只读发布校验。
 *
 * 输入可以是固定的本地 staging，也可以是调用方持有的临时目录；范围包括顶层白名单、
 * dist 契约、直接依赖安装状态和全部 node_modules 符号链接。脚本不读取环境配置或 secret
 * 内容，也不修改或清理 release；发现缺失、禁入项或链接逃逸时抛错并阻止发布。
 */
import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertContainedPath, backendRelease, repoRoot } from "./artifact-paths.mjs";
import { verifyDist, verifySymlinkContainment } from "./artifact-validation.mjs";

const forbiddenProductionPackages = new Set([
  "@esbuild/linux-x64",
  "@rolldown/binding-linux-x64-gnu",
  "@vitest/mocker",
  "drizzle-kit",
  "esbuild",
  "happy-dom",
  "lightningcss",
  "msw",
  "typescript",
  "vite",
  "vitest",
]);
const maximumProductionPackageInstances = 80;

async function pathExists(candidate) {
  try {
    await lstat(candidate);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function dependencyPath(nodeModules, dependency) {
  return path.join(nodeModules, ...dependency.split("/"));
}

async function readRequiredNodeEngine() {
  const rootPackageJson = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
  const nodeEngine = rootPackageJson.engines?.node;
  if (typeof nodeEngine !== "string" || nodeEngine.length === 0) {
    throw new Error("root package is missing the required Node.js engine");
  }
  return nodeEngine;
}

async function inspectVirtualStore(nodeModules) {
  const virtualStore = path.join(nodeModules, ".pnpm");
  const packageInstances = (await readdir(virtualStore, { withFileTypes: true }))
    .filter(entry => entry.isDirectory() && entry.name !== "node_modules");
  const packageNames = new Set();

  for (const instance of packageInstances) {
    const instanceNodeModules = path.join(virtualStore, instance.name, "node_modules");
    if (!(await pathExists(instanceNodeModules))) {
      continue;
    }

    for (const entry of await readdir(instanceNodeModules, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      if (entry.name.startsWith("@")) {
        const scope = path.join(instanceNodeModules, entry.name);
        for (const scopedEntry of await readdir(scope, { withFileTypes: true })) {
          if (scopedEntry.isDirectory()) {
            packageNames.add(`${entry.name}/${scopedEntry.name}`);
          }
        }
      } else {
        packageNames.add(entry.name);
      }
    }
  }

  return { packageInstances: packageInstances.length, packageNames };
}

export async function verifyRelease(releaseRoot) {
  const root = path.resolve(releaseRoot);
  const topLevelEntries = (await readdir(root)).toSorted();
  const requiredEntries = new Set(["dist", "node_modules", "package.json"]);
  const allowedEntries = new Set([
    ...requiredEntries,
    "README.md",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
  ]);
  const forbiddenEntries = topLevelEntries.filter(entry => !allowedEntries.has(entry));
  if (forbiddenEntries.length > 0) {
    throw new Error(`backend release contains forbidden top-level entries: ${forbiddenEntries.join(", ")}`);
  }
  for (const requiredEntry of requiredEntries) {
    if (!topLevelEntries.includes(requiredEntry)) {
      throw new Error(`backend release is missing ${requiredEntry}`);
    }
  }

  await verifyDist(path.join(root, "dist"));

  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const requiredNodeEngine = await readRequiredNodeEngine();
  if (packageJson.engines?.node !== requiredNodeEngine) {
    throw new Error(
      `backend release Node.js engine must be ${requiredNodeEngine}; received ${packageJson.engines?.node ?? "missing"}`,
    );
  }
  const dependencies = Object.keys(packageJson.dependencies ?? {});
  const devDependencies = Object.keys(packageJson.devDependencies ?? {});
  const nodeModules = path.join(root, "node_modules");

  for (const dependency of dependencies) {
    const installedPath = dependencyPath(nodeModules, dependency);
    if (!(await pathExists(installedPath))) {
      throw new Error(`backend release is missing runtime dependency ${dependency}`);
    }
    const resolved = await realpath(installedPath);
    assertContainedPath(root, resolved, `runtime dependency ${dependency}`);
  }

  const runtimeDependencies = new Set(dependencies);
  for (const dependency of devDependencies.filter(dependency => !runtimeDependencies.has(dependency))) {
    if (await pathExists(dependencyPath(nodeModules, dependency))) {
      throw new Error(`backend release installs dev-only dependency ${dependency}`);
    }
  }

  const productionPackages = await inspectVirtualStore(nodeModules);
  const forbiddenPackages = [...productionPackages.packageNames]
    .filter(packageName => forbiddenProductionPackages.has(packageName))
    .toSorted();
  if (forbiddenPackages.length > 0) {
    throw new Error(`backend release contains forbidden production packages: ${forbiddenPackages.join(", ")}`);
  }
  if (productionPackages.packageInstances > maximumProductionPackageInstances) {
    throw new Error(
      `backend release contains ${productionPackages.packageInstances} package instances; maximum is ${maximumProductionPackageInstances}`,
    );
  }

  await verifySymlinkContainment(root, nodeModules);
  return {
    dependencies: dependencies.length,
    files: topLevelEntries,
    packageInstances: productionPackages.packageInstances,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const releaseRoot = process.argv[2] == null ? backendRelease : path.resolve(process.argv[2]);
  const result = await verifyRelease(releaseRoot);
  process.stdout.write(
    `backend release verified (${result.dependencies} runtime dependencies, ${result.packageInstances} package instances)\n`,
  );
}
