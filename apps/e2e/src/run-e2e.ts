import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { Buffer } from "node:buffer";

import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import process from "node:process";
import { finished } from "node:stream/promises";

import { PostgreSqlContainer } from "@testcontainers/postgresql";

import {
  BACKEND_URL,
  E2E_ROOT,
  FRONTEND_URL,
  REPO_ROOT,
  runId,
  SERVICE_LOG_DIR,
  TEST_RESULTS_DIR,
} from "./constants.js";
import { waitForService } from "./runner-lifecycle.js";

const CHILD_STOP_TIMEOUT_MS = 8_000;

const children = new Set<ChildProcess>();
const services = new Set<ManagedService>();
let container: StartedPostgreSqlContainer | undefined;
let shuttingDown = false;
let requestedExitCode: number | undefined;
const shutdownController = new AbortController();

interface ManagedService {
  name: string;
  child: ChildProcess;
  exit: Promise<void>;
  stop: () => Promise<void>;
}

function trackChild(child: ChildProcess): void {
  children.add(child);
  child.once("close", () => children.delete(child));
}

function spawnCommand(
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; captureOutput?: boolean },
): ChildProcess {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: options.captureOutput === true ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  trackChild(child);
  child.once("error", (error) => {
    process.stderr.write(`[e2e] ${command} failed to spawn: ${error.message}\n`);
  });
  return child;
}

async function runCommand(
  label: string,
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  abortSignal: AbortSignal,
): Promise<void> {
  abortSignal.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const child = spawnCommand(command, args, { cwd, env });
    let stopTimer: NodeJS.Timeout | undefined;
    const handleAbort = (): void => {
      if (stopTimer != null) {
        return;
      }
      child.kill("SIGTERM");
      stopTimer = setTimeout(() => child.kill("SIGKILL"), CHILD_STOP_TIMEOUT_MS);
    };
    const finish = (): void => {
      abortSignal.removeEventListener("abort", handleAbort);
      if (stopTimer != null) {
        clearTimeout(stopTimer);
      }
    };
    abortSignal.addEventListener("abort", handleAbort, { once: true });
    if (abortSignal.aborted) {
      handleAbort();
    }
    child.once("error", (error) => {
      finish();
      reject(error);
    });
    child.once("close", (code, exitSignal) => {
      finish();
      if (abortSignal.aborted) {
        const reason: unknown = abortSignal.reason;
        reject(new Error(`${label} cancelled: ${reason instanceof Error ? reason.message : String(reason)}`, {
          cause: reason,
        }));
        return;
      }
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} exited with ${exitSignal ?? `code ${code ?? "unknown"}`}`));
    });
  });
}

function startService(
  name: string,
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  signal: AbortSignal,
): ManagedService {
  signal.throwIfAborted();
  const logPath = path.join(SERVICE_LOG_DIR, `${name}.log`);
  const log = createWriteStream(logPath, { flags: "w" });
  const child = spawnCommand(command, args, { cwd, env, captureOutput: true });
  child.stdout?.on("data", (data: Buffer) => {
    log.write(data);
    process.stdout.write(data);
  });
  child.stderr?.on("data", (data: Buffer) => {
    log.write(data);
    process.stderr.write(data);
  });

  let settled = false;
  let spawnError: Error | undefined;
  const exit = new Promise<void>((resolve, reject) => {
    child.once("error", (error) => {
      spawnError = error;
    });
    child.once("close", (code, signal) => {
      log.end();
      void finished(log).then(() => {
        settled = true;
        if (spawnError != null) {
          reject(spawnError);
          return;
        }
        if (code === 0 || signal === "SIGTERM" || signal === "SIGINT") {
          resolve();
          return;
        }
        reject(new Error(`${name} exited with ${signal ?? `code ${code ?? "unknown"}`}; log: ${logPath}`));
      }, (error) => {
        settled = true;
        reject(new Error(`${name} failed to flush log ${logPath}: ${error instanceof Error ? error.message : String(error)}`));
      });
    });
  });

  const service: ManagedService = {
    name,
    child,
    exit,
    stop: async () => {
      if (settled) {
        return;
      }
      child.kill("SIGTERM");
      await Promise.race([exit.catch(() => {}), delay(CHILD_STOP_TIMEOUT_MS)]);
      if (!settled) {
        child.kill("SIGKILL");
        await exit.catch(() => {});
      }
    },
  };
  services.add(service);
  void exit.catch((error) => {
    if (!shuttingDown) {
      process.stderr.write(`[e2e] ${error instanceof Error ? error.message : String(error)}\n`);
    }
  });
  return service;
}

async function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function assertPortAvailable(port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const server = createServer();
    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        reject(new Error(`E2E port ${port} is already in use; stop the existing service before running E2E`));
        return;
      }
      reject(error);
    });
    server.listen(port, "127.0.0.1", () => {
      server.close((error) => {
        if (error != null) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });
}

async function assertRequiredPortsAvailable(): Promise<void> {
  const ports = [new URL(BACKEND_URL).port, new URL(FRONTEND_URL).port]
    .map(port => Number(port));
  await Promise.all(ports.map(async port => assertPortAvailable(port)));
}

function baseEnvironment(databaseUrl: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: "test",
    PORT: "3001",
    DATABASE_URL: databaseUrl,
    LOG_LEVEL: "info",
    BETTER_AUTH_SECRET: "e2e-test-secret-at-least-32-characters-long",
    BETTER_AUTH_URL: BACKEND_URL,
    BETTER_AUTH_TRUSTED_ORIGINS: FRONTEND_URL,
    CORS_ORIGINS: FRONTEND_URL,
    VITE_API_BASE_URL: "",
    OPENAPI_PUBLIC: "false",
    AUDIT_LOG_RETENTION_DAYS: "90",
    BOOTSTRAP_ROOT_ORG_ID: "org-dev",
    E2E_RUN_ID: runId(),
  };
}

async function stopAll(): Promise<void> {
  shuttingDown = true;
  await Promise.all([...services].reverse().map(async service => service.stop()));
  if (container != null) {
    await container.stop().catch((error) => {
      process.stderr.write(`[e2e] failed to stop PostgreSQL: ${error instanceof Error ? error.message : String(error)}\n`);
    });
    container = undefined;
  }
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGKILL");
    }
  }
}

async function prepareDirectories(): Promise<void> {
  await rm(path.join(E2E_ROOT, ".auth"), { recursive: true, force: true });
  await rm(TEST_RESULTS_DIR, { recursive: true, force: true });
  await rm(SERVICE_LOG_DIR, { recursive: true, force: true });
  await mkdir(SERVICE_LOG_DIR, { recursive: true });
}

async function main(signal: AbortSignal): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const playwrightArgs = rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs;
  await assertRequiredPortsAvailable();
  signal.throwIfAborted();
  await prepareDirectories();
  signal.throwIfAborted();

  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("e2e")
    .withUsername("e2e")
    .withPassword("e2e")
    .start();
  signal.throwIfAborted();
  const env = baseEnvironment(container.getConnectionUri());

  await runCommand("backend build", "pnpm", ["--filter", "backend", "build"], REPO_ROOT, env, signal);
  await runCommand("frontend build", "pnpm", ["--filter", "frontend", "build"], REPO_ROOT, env, signal);
  await runCommand("database migration", "pnpm", ["--filter", "backend", "db:migrate"], REPO_ROOT, env, signal);
  await runCommand(
    "development seed",
    "pnpm",
    ["--filter", "backend", "db:seed"],
    REPO_ROOT,
    { ...env, LOG_LEVEL: "silent" },
    signal,
  );

  const backend = startService("backend", "pnpm", ["--filter", "backend", "start"], REPO_ROOT, env, signal);
  await waitForService(backend, `${BACKEND_URL}/readyz`, signal);
  const frontend = startService(
    "frontend",
    "pnpm",
    ["--filter", "frontend", "exec", "vite", "preview", "--host", "127.0.0.1", "--port", "5173", "--strictPort"],
    REPO_ROOT,
    env,
    signal,
  );
  await waitForService(frontend, FRONTEND_URL, signal);

  process.stdout.write(`[e2e] services ready; running Playwright (${playwrightArgs.join(" ") || "all projects"})\n`);
  await runCommand(
    "Playwright",
    "pnpm",
    ["exec", "playwright", "test", "--config", "playwright.config.ts", ...playwrightArgs],
    E2E_ROOT,
    env,
    signal,
  );
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    if (requestedExitCode == null) {
      requestedExitCode = signal === "SIGINT" ? 130 : 143;
      shutdownController.abort(new Error(`received ${signal}`));
    }
  });
}

async function run(): Promise<void> {
  try {
    await main(shutdownController.signal);
  } catch (error) {
    if (requestedExitCode == null) {
      process.exitCode = 1;
      process.stderr.write(`[e2e] ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    }
  } finally {
    await stopAll();
    if (requestedExitCode != null) {
      process.exitCode = requestedExitCode;
    }
  }
}

void run();
