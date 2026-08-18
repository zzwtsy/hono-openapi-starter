import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { expect, it } from "vitest";

import { assertContainedPath, assertFixedPath } from "./artifact-paths.mjs";
import { validateMigrationFiles, verifyDist } from "./artifact-validation.mjs";
import { verifyRelease } from "./verify-release.mjs";

const validMigrations = ["0000_initial.sql", "meta/0000_snapshot.json", "meta/_journal.json"];

async function writeFixtureFile(root, relativePath, contents = "") {
  const target = path.join(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents);
}

async function writeValidDist(root) {
  const required = [
    "index.js",
    "index.js.map",
    "commands/migrate.js",
    "commands/migrate.js.map",
    "commands/bootstrap-admin.js",
    "commands/bootstrap-admin.js.map",
  ];
  await Promise.all(required.map(file => writeFixtureFile(root, file)));
  await Promise.all(validMigrations.map(file => writeFixtureFile(path.join(root, "db/migrations"), file)));
}

async function writeVirtualStorePackage(root, name, version = "1.0.0") {
  const virtualStoreName = `${name.replace("/", "+")}@${version}`;
  const packageRoot = path.join(root, "node_modules/.pnpm", virtualStoreName, "node_modules", ...name.split("/"));
  await writeFixtureFile(packageRoot, "package.json", JSON.stringify({ name, version }));
  return path.join(root, "node_modules/.pnpm", virtualStoreName);
}

it("固定路径和子路径校验拒绝漂移或越界", () => {
  expect(() => assertFixedPath("/repo/apps/backend/dist", "/repo/apps/backend/dist", "dist")).not.toThrow();
  expect(() => assertFixedPath("/repo", "/repo/apps/backend/dist", "dist")).toThrow("must resolve");
  expect(() => assertContainedPath("/repo/release", "/repo/release/node_modules/hono", "dependency")).not.toThrow();
  expect(() => assertContainedPath("/repo/release", "/repo/node_modules/hono", "dependency")).toThrow("must be a child");
});

it("migration 校验要求 SQL、对应 snapshot 和 journal", () => {
  expect(() => validateMigrationFiles(validMigrations, "migrations")).not.toThrow();
  expect(() => validateMigrationFiles(["0000_initial.sql"], "migrations")).toThrow("_journal.json");
  expect(() => validateMigrationFiles(["0000_initial.sql", "meta/_journal.json"], "migrations")).toThrow("snapshots");
});

it("dist 校验拒绝禁入文件和未重写 alias", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "backend-dist-test-"));
  try {
    await writeValidDist(root);
    await expect(verifyDist(root)).resolves.toContain("index.js");

    await writeFixtureFile(root, ".env", "SECRET=not-read");
    await expect(verifyDist(root)).rejects.toThrow("forbidden files");
    await rm(path.join(root, ".env"));

    await writeFile(path.join(root, "index.js"), "import x from '@/config.js';\n");
    await expect(verifyDist(root)).rejects.toThrow("unresolved path alias");
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

it("release 校验拒绝顶层杂项和逃逸 symlink", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "backend-release-test-"));
  const release = path.join(temporaryRoot, "release");
  try {
    await mkdir(path.join(release, "node_modules"), { recursive: true });
    await writeValidDist(path.join(release, "dist"));
    await writeVirtualStorePackage(release, "hono");
    await writeFixtureFile(release, "package.json", JSON.stringify({ dependencies: {}, devDependencies: {} }));
    await expect(verifyRelease(release)).resolves.toMatchObject({ dependencies: 0, packageInstances: 1 });

    await writeFixtureFile(release, ".env", "SECRET=not-read");
    await expect(verifyRelease(release)).rejects.toThrow("forbidden top-level entries");
    await rm(path.join(release, ".env"));

    await symlink(temporaryRoot, path.join(release, "node_modules/escape"));
    await expect(verifyRelease(release)).rejects.toThrow("must be a child");
    await rm(path.join(release, "node_modules/escape"));

    const forbiddenPackage = await writeVirtualStorePackage(release, "vitest");
    await expect(verifyRelease(release)).rejects.toThrow("forbidden production packages: vitest");
    await rm(forbiddenPackage, { force: true, recursive: true });

    await Promise.all(Array.from({ length: 80 }, (_, index) => {
      return writeVirtualStorePackage(release, `fixture-${index}`);
    }));
    await expect(verifyRelease(release)).rejects.toThrow("package instances; maximum is 80");
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
});
