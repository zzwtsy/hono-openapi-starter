import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import {
  isExternalTarget,
  isProjectMarkdownFile,
  parseMarkdownDocument,
  resolveLocalTarget,
  scanMarkdownFiles,
} from "./check-links.mjs";

it("解析器会跳过代码节点并解析引用式、跨括号链接", () => {
  const document = parseMarkdownDocument([
    "# 文档标题",
    "",
    "[内联](folder/a(b).md \"标题 (带括号)\")",
    "[引用][目标]",
    "",
    "[目标]: README.md",
    "",
    "````md",
    "~~~",
    "[代码示例](missing.md)",
    "````",
  ].join("\n"));

  expect(document.links.map(link => link.url)).toEqual(["folder/a(b).md", "README.md"]);
  expect(document.anchorIds.has("文档标题")).toBe(true);
  expect(document.links.some(link => link.url === "missing.md")).toBe(false);
});

it("标题锚点使用 GitHub slug 并保留显式 HTML 锚点", () => {
  const document = parseMarkdownDocument([
    "# Same Heading",
    "# Same Heading",
    "<a id=\"custom-anchor\"></a>",
  ].join("\n"));

  expect(document.anchorIds.has("same-heading")).toBe(true);
  expect(document.anchorIds.has("same-heading-1")).toBe(true);
  expect(document.anchorIds.has("custom-anchor")).toBe(true);
});

it("本地目标解析区分外部 URL、当前文档和仓库外路径", () => {
  const root = "/tmp/check-links-root";
  const source = "docs/guide.md";

  expect(isExternalTarget("https://example.com/docs")).toBe(true);
  expect(isExternalTarget("#section")).toBe(false);
  expect(resolveLocalTarget(root, source, "#章节")).toEqual({
    fragment: "章节",
    kind: "local",
    resolved: path.join(root, source),
    target: "#章节",
    withinRoot: true,
  });
  expect(resolveLocalTarget(root, source, "../../outside.md").withinRoot).toBe(false);
});

it("扫描门禁校验本地锚点并忽略代码块", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "check-links-"));
  try {
    await mkdir(path.join(root, "docs"), { recursive: true });
    await writeFile(path.join(root, "docs", "guide.md"), [
      "# Guide",
      "",
      "[有效链接](target.md#target)",
      "[失效锚点](target.md#missing)",
      "[引用链接][target]",
      "",
      "[target]: target.md",
      "",
      "```md",
      "[代码示例](missing.md)",
      "```",
    ].join("\n"));
    await writeFile(path.join(root, "docs", "target.md"), "# Target\n");

    const failures = await scanMarkdownFiles(root, ["docs/guide.md", "docs/target.md"]);
    expect(failures).toEqual(["docs/guide.md:4: broken local anchor target.md#missing"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("项目文档范围显式排除计划和 agent 技能内容", () => {
  expect(isProjectMarkdownFile("docs/README.md")).toBe(true);
  expect(isProjectMarkdownFile("docs/plans/example.md")).toBe(false);
  expect(isProjectMarkdownFile(".agents/skills/example/SKILL.md")).toBe(false);
  expect(isProjectMarkdownFile("README.MD")).toBe(true);
});
