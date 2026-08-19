/**
 * 读取并校验 backend dist 与 portable release 的文件、migration、依赖和符号链接边界。
 *
 * 校验不会修改产物，也不读取环境配置或 secret 内容；缺少必需文件、出现禁入文件、
 * 残留路径别名、本地 import 缺失或符号链接逃逸时立即抛错，让构建和发布流程以非零状态终止。
 */
import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

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

function listRuntimeModuleSpecifiers(source, file) {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const specifiers = [];

  function addStringLiteral(node) {
    if (node != null && ts.isStringLiteralLike(node)) {
      specifiers.push(node.text);
    }
  }

  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      addStringLiteral(node.moduleSpecifier);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      addStringLiteral(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

function resolveLocalImport(distRoot, sourceFile, specifier) {
  const sourcePath = path.join(distRoot, sourceFile);
  let target;
  try {
    target = fileURLToPath(new URL(specifier, pathToFileURL(sourcePath)));
  } catch (error) {
    throw new Error(`backend dist contains invalid local import: ${sourceFile} -> ${specifier}`, { cause: error });
  }

  const relative = path.relative(path.resolve(distRoot), path.resolve(target));
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`backend dist import escapes dist: ${sourceFile} -> ${specifier}`);
  }
  return relative.split(path.sep).join("/");
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

  const fileSet = new Set(files);
  for (const file of files.filter(file => file.endsWith(".js"))) {
    const source = await readFile(path.join(distRoot, file), "utf8");
    for (const specifier of listRuntimeModuleSpecifiers(source, file)) {
      if (specifier.startsWith("@/")) {
        throw new Error(`backend dist contains unresolved path alias: ${file} -> ${specifier}`);
      }
      if (specifier.startsWith("./") || specifier.startsWith("../")) {
        const target = resolveLocalImport(distRoot, file, specifier);
        if (!fileSet.has(target)) {
          throw new Error(`backend dist import target is missing: ${file} -> ${specifier}`);
        }
      }
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
