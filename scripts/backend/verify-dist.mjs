/**
 * 对固定的 backend dist 执行发布前静态校验并输出文件计数。
 *
 * 只允许可执行代码、source map 和完整 migration，不读取环境文件或修改产物；任何契约
 * 不满足时由共享校验器抛错，使 build 以非零状态终止。
 */
import process from "node:process";

import { backendDist } from "./artifact-paths.mjs";
import { verifyDist } from "./artifact-validation.mjs";

const files = await verifyDist(backendDist);
process.stdout.write(`backend dist verified (${files.length} files)\n`);
