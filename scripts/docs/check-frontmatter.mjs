/**
 * 校验受版本控制的正式工程文档 frontmatter。
 *
 * 普通文档使用 status 表达文档生命周期；ADR 额外使用 adrStatus 表达
 * 决策生命周期。执行计划和 agent 技能不属于正式文档门禁范围。
 */
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const documentStatuses = new Set(["Draft", "Review", "Active", "Deprecated", "Archived"]);
const adrStatuses = new Set(["Proposed", "Accepted", "Superseded"]);
const adrPathPattern = /^docs\/adr\/\d{4}-.+\.md$/;

export function isFormalDocumentationFile(file) {
  return file === "docs/README.md"
    || (file.startsWith("docs/")
      && file.endsWith(".md")
      && !file.startsWith("docs/plans/"));
}

export function isAdrDocument(file) {
  return adrPathPattern.test(file);
}

export function parseFrontmatter(source) {
  const lines = source.split(/\r?\n/);
  if (lines[0] !== "---") {
    return { error: "missing opening frontmatter delimiter" };
  }

  const end = lines.indexOf("---", 1);
  if (end === -1) {
    return { error: "missing closing frontmatter delimiter" };
  }

  const fields = new Map();
  for (const line of lines.slice(1, end)) {
    if (/^\s/.test(line) || line.trim().length === 0) {
      continue;
    }
    const separator = line.indexOf(":");
    const key = separator === -1 ? "" : line.slice(0, separator);
    if (/^[a-z][\w-]*$/i.test(key)) {
      const rawValue = line.slice(separator + 1).trim();
      const quote = rawValue[0];
      const value = (quote === "\"" || quote === "'") && rawValue.at(-1) === quote
        ? rawValue.slice(1, -1)
        : rawValue;
      fields.set(key, value);
    }
  }
  return { fields };
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
}

function requireField(file, fields, name, failures) {
  const value = fields.get(name);
  if (!value) {
    failures.push(`${file}: frontmatter field '${name}' is required`);
  }
  return value;
}

export function validateFrontmatter(file, source, knownFiles) {
  const failures = [];
  const parsed = parseFrontmatter(source);
  if (parsed.error) {
    return [`${file}: ${parsed.error}`];
  }

  const { fields } = parsed;
  const status = requireField(file, fields, "status", failures);
  requireField(file, fields, "owner", failures);
  const reviewedAt = requireField(file, fields, "lastReviewedAt", failures);

  if (status && !documentStatuses.has(status)) {
    failures.push(`${file}: invalid document status '${status}'`);
  }
  if (reviewedAt && !isIsoDate(reviewedAt)) {
    failures.push(`${file}: lastReviewedAt must be a real ISO date (YYYY-MM-DD)`);
  }

  if (!isAdrDocument(file)) {
    return failures;
  }

  const adrStatus = requireField(file, fields, "adrStatus", failures);
  if (adrStatus && !adrStatuses.has(adrStatus)) {
    failures.push(`${file}: invalid ADR status '${adrStatus}'`);
  }
  if (adrStatus === "Accepted" && status !== "Active") {
    failures.push(`${file}: Accepted ADR must use document status 'Active'`);
  }
  if (adrStatus === "Proposed" && !new Set(["Draft", "Review"]).has(status)) {
    failures.push(`${file}: Proposed ADR must use document status 'Draft' or 'Review'`);
  }
  if (adrStatus === "Superseded") {
    if (!new Set(["Deprecated", "Archived"]).has(status)) {
      failures.push(`${file}: Superseded ADR must use document status 'Deprecated' or 'Archived'`);
    }
    const target = requireField(file, fields, "supersededBy", failures);
    if (target && (!isAdrDocument(target) || target === file || !knownFiles.has(target))) {
      failures.push(`${file}: supersededBy must reference another tracked ADR`);
    }
  }

  return failures;
}

export async function scanFrontmatter(root, files) {
  const knownFiles = new Set(files);
  const failures = [];
  for (const file of files) {
    const source = await readFile(path.join(root, file), "utf8");
    failures.push(...validateFrontmatter(file, source, knownFiles));
  }
  return failures;
}

async function getRoot() {
  const { stdout } = await execFileAsync("git", ["rev-parse", "--show-toplevel"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  return stdout.trim();
}

async function getFormalDocumentationFiles(root) {
  const { stdout } = await execFileAsync("git", ["ls-files", "-z", "--", "docs/*.md", "docs/**/*.md"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout.split("\0").filter(isFormalDocumentationFile).sort();
}

async function main() {
  const root = await getRoot();
  const files = await getFormalDocumentationFiles(root);
  const failures = await scanFrontmatter(root, files);
  if (failures.length > 0) {
    process.stderr.write(`${failures.join("\n")}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`docs:frontmatter passed (${files.length} formal documents)\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
