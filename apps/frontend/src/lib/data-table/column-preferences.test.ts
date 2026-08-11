import { describe, expect, it } from "vitest";
import {
  createColumnVisibilityState,
  moveColumnPreference,
  normalizeColumnPreferences,
  readColumnPreferences,
  toggleColumnVisibility,
  writeColumnPreferences,
} from "./column-preferences";

const config = {
  columnIds: ["name", "description", "actions"],
  defaultOrder: ["name", "description", "actions"],
  hideableIds: ["name", "description"],
  fixedEndIds: ["actions"],
} as const;

describe("column preferences", () => {
  it("清理未知列、补齐新增列并把固定列放到末尾", () => {
    expect(normalizeColumnPreferences({ order: ["actions", "unknown", "name", "name"], hidden: ["description", "actions", "unknown"] }, config)).toEqual({
      order: ["name", "description", "actions"],
      hidden: ["description"],
    });
  });

  it("不会把最后一个可见字段隐藏掉", () => {
    const state = normalizeColumnPreferences({ hidden: ["name", "description"] }, config);
    expect(state.hidden).toEqual(["description"]);
    expect(toggleColumnVisibility({ order: [...config.defaultOrder], hidden: ["name"] }, "description", config, false)).toEqual({
      order: [...config.defaultOrder],
      hidden: ["name"],
    });
  });

  it("切换显隐并生成 TanStack visibility state", () => {
    const state = { order: [...config.defaultOrder], hidden: [] };
    const next = toggleColumnVisibility(state, "description", config, false);
    expect(next.hidden).toEqual(["description"]);
    expect(createColumnVisibilityState(next.hidden)).toEqual({ description: false });
    expect(toggleColumnVisibility(next, "actions", config, false)).toBe(next);
  });

  it("拖拽排序时保持固定列在末尾", () => {
    expect(moveColumnPreference({ order: ["name", "description", "actions"], hidden: [] }, "name", "description", config)).toEqual({
      order: ["description", "name", "actions"],
      hidden: [],
    });
    expect(moveColumnPreference({ order: ["name", "description", "actions"], hidden: [] }, "description", "name", config)).toEqual({
      order: ["description", "name", "actions"],
      hidden: [],
    });
  });

  it("忽略未知列和原地移动", () => {
    const state = { order: ["name", "description", "actions"], hidden: [] };
    expect(moveColumnPreference(state, "unknown", "name", config)).toBe(state);
    expect(moveColumnPreference(state, "name", "name", config)).toBe(state);
  });

  it("localStorage JSON 损坏或读写异常时回退默认值", () => {
    const storage = {
      getItem: () => "not-json",
      setItem: () => { throw new Error("quota"); },
    } as unknown as Storage;
    expect(readColumnPreferences(storage, "table", config)).toEqual({
      order: [...config.defaultOrder],
      hidden: [],
    });
    expect(() => writeColumnPreferences(storage, "table", { order: [...config.defaultOrder], hidden: [] })).not.toThrow();
  });
});
