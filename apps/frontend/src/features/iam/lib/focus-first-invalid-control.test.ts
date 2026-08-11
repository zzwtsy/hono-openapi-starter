import { describe, expect, it } from "vitest";
import { focusFirstInvalidControl } from "./focus-first-invalid-control";

describe("focusFirstInvalidControl", () => {
  it("只在当前表单内聚焦第一个无效控件", () => {
    const outside = document.createElement("input");
    outside.setAttribute("aria-invalid", "true");
    const form = document.createElement("form");
    const first = document.createElement("input");
    const second = document.createElement("button");
    first.setAttribute("aria-invalid", "true");
    second.setAttribute("aria-invalid", "true");
    form.append(first, second);
    document.body.append(outside, form);

    focusFirstInvalidControl(form);

    expect(document.activeElement).toBe(first);
  });
});
