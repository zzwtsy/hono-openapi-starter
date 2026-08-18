/**
 * 集中定义后端构建与发布产物的仓库固定路径，并提供删除前使用的路径边界断言。
 *
 * 本模块不接受外部目标、不访问或删除文件；路径偏离预期位置或逃逸父目录时直接抛错，
 * 由调用方停止构建或校验流程。
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(scriptDirectory, "../..");
export const backendRoot = path.join(repoRoot, "apps/backend");
export const backendDist = path.join(backendRoot, "dist");
export const backendMigrations = path.join(backendRoot, "src/db/migrations");
export const artifactRoot = path.join(repoRoot, ".artifacts");
export const backendRelease = path.join(artifactRoot, "backend");

export function assertFixedPath(actual, expected, label) {
  if (path.resolve(actual) !== path.resolve(expected)) {
    throw new Error(`${label} must resolve to ${expected}`);
  }
}

export function assertContainedPath(parent, candidate, label) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  if (relative === "" || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
    throw new Error(`${label} must be a child of ${parent}`);
  }
}
