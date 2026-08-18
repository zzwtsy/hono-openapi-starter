import path from "node:path";
import process from "node:process";

export interface BackendReleaseCommand {
  args: string[];
  command: string;
  cwd: string;
}

function compiledCommand(releaseRoot: string, entrypoint: string): BackendReleaseCommand {
  return {
    args: ["--enable-source-maps", path.join(releaseRoot, "dist", entrypoint)],
    command: process.execPath,
    cwd: releaseRoot,
  };
}

/** 只返回 release 内的编译入口，用于证明运行时不依赖 workspace 源码或开发工具。 */
export function backendReleaseCommands(releaseRoot: string) {
  return {
    migrate: compiledCommand(releaseRoot, "commands/migrate.js"),
    seed: compiledCommand(releaseRoot, "commands/seed-development.js"),
    server: compiledCommand(releaseRoot, "index.js"),
  };
}
