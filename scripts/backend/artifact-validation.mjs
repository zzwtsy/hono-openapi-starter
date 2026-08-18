/**
 * 读取并校验 backend dist 与 portable release 的文件、migration、依赖和符号链接边界。
 *
 * 校验不会修改产物，也不读取环境配置或 secret 内容；缺少必需文件、出现禁入文件、
 * 残留路径别名或符号链接逃逸时立即抛错，让构建和发布流程以非零状态终止。
 */
import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";

import { assertContainedPath } from "./artifact-paths.mjs";

export async function listRelativeFiles(root) {
  const files = [];

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else {
        files.push(path.relative(root, absolutePath).split(path.sep).join("/"));
      }
    }
  }

  await visit(root);
  return files.toSorted();
}

export function validateMigrationFiles(files, label) {
  const sqlFiles = files.filter(file => /^\d{4}_.+\.sql$/.test(file));
  const snapshots = files.filter(file => /^meta\/\d{4}_snapshot\.json$/.test(file));

  if (!files.includes("meta/_journal.json")) {
    throw new Error(`${label} is missing meta/_journal.json`);
  }
  if (sqlFiles.length === 0) {
    throw new Error(`${label} does not contain SQL migrations`);
  }
  if (snapshots.length !== sqlFiles.length) {
    throw new Error(`${label} has ${sqlFiles.length} SQL migrations but ${snapshots.length} snapshots`);
  }
}

export async function verifyDist(distRoot) {
  const requiredFiles = [
    "index.js",
    "index.js.map",
    "commands/migrate.js",
    "commands/migrate.js.map",
    "commands/bootstrap-admin.js",
    "commands/bootstrap-admin.js.map",
    "db/migrations/meta/_journal.json",
  ];
  const files = await listRelativeFiles(distRoot);

  for (const requiredFile of requiredFiles) {
    if (!files.includes(requiredFile)) {
      throw new Error(`backend dist is missing ${requiredFile}`);
    }
  }

  const forbidden = files.filter((file) => {
    if (file.startsWith("db/migrations/")) {
      return !(file.endsWith(".sql") || file.endsWith(".json"));
    }
    return !(file.endsWith(".js") || file.endsWith(".js.map"));
  });
  if (forbidden.length > 0) {
    throw new Error(`backend dist contains forbidden files: ${forbidden.join(", ")}`);
  }

  const migrationFiles = files
    .filter(file => file.startsWith("db/migrations/"))
    .map(file => file.slice("db/migrations/".length));
  validateMigrationFiles(migrationFiles, "backend dist migrations");

  for (const file of files.filter(file => file.endsWith(".js"))) {
    const source = await readFile(path.join(distRoot, file), "utf8");
    if (/\b(?:from\s+|import\s*\()["']@\//.test(source)) {
      throw new Error(`backend dist contains unresolved path alias: ${file}`);
    }
  }

  return files;
}

export async function verifySymlinkContainment(releaseRoot, directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    const stats = await lstat(entryPath);
    if (stats.isSymbolicLink()) {
      const resolved = await realpath(entryPath);
      assertContainedPath(releaseRoot, resolved, `release symlink ${entryPath}`);
    } else if (stats.isDirectory()) {
      await verifySymlinkContainment(releaseRoot, entryPath);
    }
  }
}
