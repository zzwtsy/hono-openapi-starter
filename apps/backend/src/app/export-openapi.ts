/**
 * 将当前应用装配产生的 OpenAPI 文档写入调用方指定的 JSON 文件。
 *
 * 该命令只装配静态契约，不启动服务或连接数据库，也不会覆盖调用方已设置的环境变量。
 * 目标必须显式指定为 `.json` 文件；命令会创建父目录并直接写入目标。失败时输出错误并以
 * 非零状态退出，不负责回滚已创建的目录或目标文件。
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

async function main() {
  const outputArgument = process.argv.slice(2).find(argument => argument !== "--");
  if (outputArgument === undefined) {
    throw new Error("用法: pnpm --filter backend openapi:export -- <output.json>");
  }

  const outputPath = path.resolve(outputArgument);
  if (path.extname(outputPath).toLowerCase() !== ".json") {
    throw new Error("OpenAPI 导出目标必须是 .json 文件");
  }

  // 静态契约只需要完成应用装配；这些非生产占位值仅用于通过配置校验，
  // 不启动 server、不连接数据库，也不覆盖调用方显式提供的环境变量。
  process.env.NODE_ENV ??= "test";
  process.env.LOG_LEVEL ??= "silent";
  process.env.DATABASE_URL ??= "postgres://openapi:openapi@localhost:5432/openapi";
  process.env.BETTER_AUTH_SECRET ??= "openapi-export-secret-at-least-32-characters";
  process.env.BETTER_AUTH_URL ??= "http://localhost:3001";
  process.env.OPENAPI_PUBLIC ??= "true";

  const [{ app }, { openApiDocumentConfig, openApiGeneratorOptions }] = await Promise.all([
    import("./create-application.js"),
    import("../core/app/openapi.js"),
  ]);
  const document = app.getOpenAPIDocument(openApiDocumentConfig, openApiGeneratorOptions);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  process.stdout.write(`OpenAPI exported: ${outputPath}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
