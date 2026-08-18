/**
 * 在打包前只重建被忽略的 `.artifacts/backend` 本地 staging 目录。
 *
 * 仓库外的 portable release 归创建它的调用方管理，本脚本不会删除；固定路径偏离预期时
 * 在递归删除前失败，避免影响其他 artifact 或用户目录。
 */
import { mkdir, rm } from "node:fs/promises";

import { artifactRoot, assertFixedPath, backendRelease } from "./artifact-paths.mjs";

assertFixedPath(backendRelease, `${artifactRoot}/backend`, "backend release staging");
await rm(backendRelease, { force: true, recursive: true });
await mkdir(artifactRoot, { recursive: true });
