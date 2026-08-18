/**
 * 在 pnpm 解析阶段收窄 Better Auth 根包对生产后端无关的 optional peer。
 *
 * 仅修正 1.6.23 的 `vitest` 与 `drizzle-kit` 元数据；保留 React、Drizzle ORM 等真实消费端
 * peer。版本变化时不静默套用旧假设，release 校验会因禁入包重新出现而阻止发布。
 */
function readPackage(pkg) {
  if (pkg.name !== "better-auth" || pkg.version !== "1.6.23") {
    return pkg;
  }

  delete pkg.peerDependencies?.["drizzle-kit"];
  delete pkg.peerDependenciesMeta?.["drizzle-kit"];
  delete pkg.peerDependencies?.vitest;
  delete pkg.peerDependenciesMeta?.vitest;

  return pkg;
}

module.exports = { hooks: { readPackage } };
