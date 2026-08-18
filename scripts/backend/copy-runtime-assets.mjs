/**
 * 在 tsc 完成后复制后端运行必需、但不会由 TypeScript 编译器输出的资源。
 *
 * 范围只包含已提交的 Drizzle migration 树，不复制环境文件、日志、测试 fixture 或开发数据；
 * journal、SQL、snapshot 缺失，或复制后的文件集合与源码不一致时终止构建。
 */
import { cp, rm } from "node:fs/promises";
import path from "node:path";

import { backendDist, backendMigrations } from "./artifact-paths.mjs";
import { listRelativeFiles, validateMigrationFiles } from "./artifact-validation.mjs";

const target = path.join(backendDist, "db/migrations");
const sourceFiles = await listRelativeFiles(backendMigrations);
validateMigrationFiles(sourceFiles, "source migrations");

await rm(target, { force: true, recursive: true });
await cp(backendMigrations, target, { recursive: true });

const targetFiles = await listRelativeFiles(target);
if (JSON.stringify(targetFiles) !== JSON.stringify(sourceFiles)) {
  throw new Error("copied backend migrations do not match the source migration tree");
}
