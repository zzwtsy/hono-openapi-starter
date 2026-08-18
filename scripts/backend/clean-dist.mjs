/**
 * 在编译前只重建 `apps/backend/dist`，避免旧模块或运行时文件混入本次产物。
 *
 * 删除目标由仓库常量固定，脚本不接受路径参数，也不处理 release 或其他 build 目录；
 * 路径解析偏离预期时先失败，调用方无法把递归删除扩展成通用删除命令。
 */
import { mkdir, rm } from "node:fs/promises";

import { assertFixedPath, backendDist, backendRoot } from "./artifact-paths.mjs";

assertFixedPath(backendDist, `${backendRoot}/dist`, "backend dist");
await rm(backendDist, { force: true, recursive: true });
await mkdir(backendDist, { recursive: true });
