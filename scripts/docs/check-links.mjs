/**
 * 检查受版本控制的项目文档 Markdown 内部链接。
 *
 * 外部 URL、代码节点、本地执行计划和 agent 技能文档不属于本门禁范围；本地
 * Markdown 文件和标题锚点都会被校验，失效链接会输出源文件、行号和目标，并
 * 以非零退出码结束，供 CI 直接判断。
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import GithubSlugger, { slug as githubSlug } from "github-slugger";
import { fromMarkdown } from "mdast-util-from-markdown";

const execFileAsync = promisify(execFile);
const markdownExtensions = new Set([".md", ".mdx"]);

/**
 * 判断链接目标是否是无需访问本地文件系统的 URI。
 *
 * 纯锚点不在这里排除，因为它仍然需要校验当前文档中的标题。
 */
export function isExternalTarget(target) {
  return /^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith("//");
}

function walk(node, callback) {
  callback(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      walk(child, callback);
    }
  }
}

function nodeText(node) {
  if (node.type === "text" || node.type === "inlineCode") {
    return node.value;
  }
  if (node.type === "image") {
    return node.alt ?? "";
  }
  if (node.type === "break") {
    return "\n";
  }
  if (node.type === "html") {
    return node.value.replace(/<[^>]*>/g, "");
  }
  if (Array.isArray(node.children)) {
    return node.children.map(child => nodeText(child)).join("");
  }
  return "";
}

function nodeLine(node) {
  return node.position?.start.line ?? 1;
}

function collectDefinitions(tree) {
  const definitions = new Map();
  walk(tree, (node) => {
    if (node.type === "definition") {
      definitions.set(node.identifier, node.url);
    }
  });
  return definitions;
}

function collectLinks(tree, definitions) {
  const links = [];
  walk(tree, (node) => {
    if (node.type === "link" || node.type === "image") {
      links.push({
        line: nodeLine(node),
        reference: undefined,
        url: node.url ?? "",
      });
      return;
    }

    if (node.type === "linkReference" || node.type === "imageReference") {
      links.push({
        line: nodeLine(node),
        reference: node.label ?? node.identifier,
        url: definitions.get(node.identifier),
      });
    }
  });
  return links;
}

function collectExplicitHtmlAnchors(tree, anchorIds) {
  const attributePattern = /\b(?:id|name)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s"'=<>`]+))/gi;
  walk(tree, (node) => {
    if (node.type !== "html") {
      return;
    }
    for (const match of node.value.matchAll(attributePattern)) {
      anchorIds.add(match[1] ?? match[2] ?? match[3]);
    }
  });
}

/**
 * 解析一个 Markdown 文档，返回链接和可跳转的标题/HTML 锚点。
 */
export function parseMarkdownDocument(text) {
  const tree = fromMarkdown(text);
  const definitions = collectDefinitions(tree);
  const links = collectLinks(tree, definitions);
  const anchorIds = new Set();
  const slugger = new GithubSlugger();

  walk(tree, (node) => {
    if (node.type === "heading") {
      const headingText = nodeText(node).replace(/\s+/g, " ").trim();
      const anchor = slugger.slug(headingText);
      if (anchor.length > 0) {
        anchorIds.add(anchor);
      }
    }
  });
  collectExplicitHtmlAnchors(tree, anchorIds);

  return { anchorIds, links };
}

function isInsideRoot(root, resolved) {
  const relative = path.relative(root, resolved);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

function decodeUriPart(value) {
  try {
    return { value: decodeURIComponent(value) };
  } catch {
    return { error: true };
  }
}

/**
 * 将 Markdown 链接目标解析为本地路径和可选锚点。
 */
export function resolveLocalTarget(root, source, rawTarget) {
  const target = rawTarget.trim();
  if (isExternalTarget(target)) {
    return { kind: "external", target };
  }

  const anchorIndex = target.indexOf("#");
  const beforeAnchor = anchorIndex === -1 ? target : target.slice(0, anchorIndex);
  const rawAnchor = anchorIndex === -1 ? "" : target.slice(anchorIndex + 1);
  const queryIndex = beforeAnchor.indexOf("?");
  const rawPath = queryIndex === -1 ? beforeAnchor : beforeAnchor.slice(0, queryIndex);
  const decodedPath = decodeUriPart(rawPath);
  if (decodedPath.error) {
    return { kind: "invalid", target };
  }

  const decodedAnchor = decodeUriPart(rawAnchor);
  if (decodedAnchor.error) {
    return { kind: "invalid", target };
  }

  const sourcePath = path.resolve(root, source);
  const resolved = rawPath.length === 0
    ? sourcePath
    : rawPath.startsWith("/")
      ? path.resolve(root, decodedPath.value.slice(1))
      : path.resolve(path.dirname(sourcePath), decodedPath.value);

  return {
    kind: "local",
    fragment: decodedAnchor.value,
    resolved,
    target,
    withinRoot: isInsideRoot(root, resolved),
  };
}

function isMarkdownFile(filePath) {
  return markdownExtensions.has(path.extname(filePath).toLowerCase());
}

function hasAnchor(anchorIds, fragment) {
  if (fragment.length === 0 || /^L\d+(?:-L\d+)?$/i.test(fragment)) {
    return true;
  }
  return anchorIds.has(fragment)
    || anchorIds.has(fragment.toLowerCase())
    || anchorIds.has(githubSlug(fragment));
}

export async function scanMarkdownFiles(root, markdownFiles) {
  const failures = [];
  const documents = new Map();

  const loadDocument = async (source) => {
    const existing = documents.get(source);
    if (existing) {
      return existing;
    }
    const text = await readFile(path.join(root, source), "utf8");
    const document = parseMarkdownDocument(text);
    documents.set(source, document);
    return document;
  };

  for (const source of markdownFiles) {
    const document = await loadDocument(source);
    for (const link of document.links) {
      if (link.url === undefined) {
        failures.push(`${source}:${link.line}: unresolved Markdown reference ${link.reference}`);
        continue;
      }

      const result = resolveLocalTarget(root, source, link.url);
      if (result.kind === "external") {
        continue;
      }
      if (result.kind === "invalid" || !result.withinRoot || !existsSync(result.resolved)) {
        failures.push(`${source}:${link.line}: broken local link ${link.url}`);
        continue;
      }

      if (result.fragment.length > 0 && isMarkdownFile(result.resolved)) {
        const targetSource = path.relative(root, result.resolved);
        const targetDocument = await loadDocument(targetSource);
        if (!hasAnchor(targetDocument.anchorIds, result.fragment)) {
          failures.push(`${source}:${link.line}: broken local anchor ${link.url}`);
        }
      }
    }
  }

  return failures;
}

export function isProjectMarkdownFile(file) {
  return file.length > 0
    && markdownExtensions.has(path.extname(file).toLowerCase())
    && !file.startsWith("docs/plans/")
    && !file.startsWith(".agents/");
}

async function getRoot() {
  const { stdout } = await execFileAsync("git", ["rev-parse", "--show-toplevel"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  return stdout.trim();
}

async function getTrackedMarkdownFiles(root) {
  const { stdout } = await execFileAsync("git", ["ls-files", "-z", "--", "*.md", "*.mdx", "*.MD", "*.MDX"], {
    cwd: root,
    encoding: "utf8",
  });
  return stdout.split("\0").filter(isProjectMarkdownFile);
}

export async function main() {
  // 以 Git 工作区为根目录，确保从仓库子目录运行时相对链接仍按源文件位置解析。
  const root = await getRoot();
  const markdownFiles = await getTrackedMarkdownFiles(root);
  const failures = await scanMarkdownFiles(root, markdownFiles);

  // 输出全部失败项后再统一设置退出码，便于一次修复同一批链接问题。
  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(failure);
    }
    process.exitCode = 1;
  } else {
    console.log(`docs:links passed (${markdownFiles.length} Markdown files)`);
  }
}

const currentModulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentModulePath) {
  await main();
}
