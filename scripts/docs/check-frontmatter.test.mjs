import { expect, it } from "vitest";
import {
  isAdrDocument,
  isFormalDocumentationFile,
  parseFrontmatter,
  validateFrontmatter,
} from "./check-frontmatter.mjs";

function document(fields) {
  return ["---", ...fields, "---", "", "# Test"].join("\n");
}

it("只把 docs 内受控 Markdown 视为正式文档", () => {
  expect(isFormalDocumentationFile("docs/README.md")).toBe(true);
  expect(isFormalDocumentationFile("docs/features/backend/iam.md")).toBe(true);
  expect(isFormalDocumentationFile("docs/plans/example.md")).toBe(false);
  expect(isFormalDocumentationFile("README.md")).toBe(false);
  expect(isAdrDocument("docs/adr/0013-example.md")).toBe(true);
  expect(isAdrDocument("docs/adr/README.md")).toBe(false);
});

it("解析顶部 frontmatter 且忽略嵌套列表字段", () => {
  const parsed = parseFrontmatter(document([
    "status: Active",
    "owner: platform",
    "relatedCode:",
    "  - apps/backend/src",
    "lastReviewedAt: 2026-08-17",
  ]));
  expect(parsed.fields).toEqual(new Map([
    ["status", "Active"],
    ["owner", "platform"],
    ["relatedCode", ""],
    ["lastReviewedAt", "2026-08-17"],
  ]));
});

it("普通文档拒绝缺字段、非法状态和无效日期", () => {
  const failures = validateFrontmatter("docs/features/example.md", document([
    "status: accepted",
    "lastReviewedAt: 2026-02-30",
  ]), new Set());
  expect(failures).toEqual([
    "docs/features/example.md: frontmatter field 'owner' is required",
    "docs/features/example.md: invalid document status 'accepted'",
    "docs/features/example.md: lastReviewedAt must be a real ISO date (YYYY-MM-DD)",
  ]);

  expect(validateFrontmatter("docs/features/empty-owner.md", document([
    "status: 'Active'",
    "owner: \"\"",
    "lastReviewedAt: '2026-08-17'",
  ]), new Set())).toEqual([
    "docs/features/empty-owner.md: frontmatter field 'owner' is required",
  ]);
});

it("accepted ADR 必须同时是 Active 正式文档", () => {
  const file = "docs/adr/0001-example.md";
  const failures = validateFrontmatter(file, document([
    "status: Review",
    "adrStatus: Accepted",
    "owner: platform",
    "lastReviewedAt: 2026-08-17",
  ]), new Set([file]));
  expect(failures).toEqual([`${file}: Accepted ADR must use document status 'Active'`]);
});

it("superseded ADR 必须指向另一份存在的 ADR", () => {
  const file = "docs/adr/0001-example.md";
  const validTarget = "docs/adr/0002-replacement.md";
  const source = document([
    "status: Deprecated",
    "adrStatus: Superseded",
    "owner: platform",
    "lastReviewedAt: 2026-08-17",
    "supersededBy: docs/adr/9999-missing.md",
  ]);
  expect(validateFrontmatter(file, source, new Set([file, validTarget]))).toEqual([
    `${file}: supersededBy must reference another tracked ADR`,
  ]);
});
