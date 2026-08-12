import type { Organization } from "@/api/globals";
import { describe, expect, it } from "vitest";
import { buildOrganizationTree } from "./organization-tree";

/** 构造最小 Organization 行(仅树算法需要的字段)。 */
function org(
  id: string,
  name: string,
  parentId: string | null = null,
): Organization {
  return {
    id,
    name,
    parentId,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  };
}

describe("buildOrganizationTree", () => {
  it("扁平列表建索引并列出根节点", () => {
    const tree = buildOrganizationTree([
      org("root", "Root"),
      org("south", "South", "root"),
    ]);

    expect(tree.rootIds).toEqual(["root"]);
    expect(tree.byId.get("south")?.name).toBe("South");
    expect(tree.getChildren("root").map(o => o.id)).toEqual(["south"]);
  });

  it("父节点缺失时提升为根", () => {
    const tree = buildOrganizationTree([
      org("orphan", "Orphan", "missing-parent"),
    ]);

    expect(tree.rootIds).toEqual(["orphan"]);
    expect(tree.getParent("orphan")).toBeUndefined();
  });

  it("打断环后节点仍可达", () => {
    // a -> b -> a
    const tree = buildOrganizationTree([
      org("a", "A", "b"),
      org("b", "B", "a"),
    ]);

    expect(tree.byId.has("a")).toBe(true);
    expect(tree.byId.has("b")).toBe(true);
    // 断环后至少有一个根
    expect(tree.rootIds.length).toBeGreaterThan(0);
    const rootId = tree.rootIds[0];
    expect(rootId).toBeDefined();
    expect(tree.byId.has(rootId)).toBe(true);
  });

  it("按祖先拼显示路径", () => {
    const tree = buildOrganizationTree([
      org("root", "总部"),
      org("prod", "产品", "root"),
      org("team", "平台", "prod"),
    ]);

    expect(tree.getDisplayPath("team")).toBe("总部 / 产品 / 平台");
  });

  it("编辑时父选项排除自身及后代", () => {
    const tree = buildOrganizationTree([
      org("root", "Root"),
      org("child", "Child", "root"),
      org("grand", "Grand", "child"),
    ]);

    const options = tree.getParentOptions("child");
    const values = options.map(o => o.value);

    expect(values).toContain(null);
    expect(values).toContain("root");
    expect(values).not.toContain("child");
    expect(values).not.toContain("grand");
  });
});
