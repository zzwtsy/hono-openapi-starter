import { describe, expect, it } from "vitest";

import { formatActorName, formatAuditSummary, formatAuditTime, formatResourceRefs } from "./format-diff";

describe("formatAuditTime", () => {
  it("输出绝对时间(Intl zh-CN,含年份;宽松断言避免时区/实现差异)", () => {
    const text = formatAuditTime("2026-07-01T06:30:45.000Z");
    expect(text).toContain("2026");
    expect(text).toMatch(/\d{1,2}[:：]\d{2}/); // 时分
    expect(text).toMatch(/30|45/); // 秒级精度
  });

  it("无效日期不崩溃", () => {
    expect(() => formatAuditTime("not-a-date")).not.toThrow();
  });
});

describe("formatResourceRefs", () => {
  it("资源类型中文化 + 名称快照", () => {
    expect(formatResourceRefs([{ type: "user", id: "u1", name: "张三" }])).toBe("用户 张三");
    expect(formatResourceRefs([
      { type: "user", id: "u1", name: "张三" },
      { type: "role", id: "r1", name: "admin" },
    ])).toBe("用户 张三 / 角色 admin");
  });

  it("无名称快照时回退 ID", () => {
    expect(formatResourceRefs([{ type: "project", id: "p1" }])).toBe("项目 p1");
  });

  it("未知资源类型回退原文", () => {
    expect(formatResourceRefs([{ type: "widget", id: "w1", name: "组件" }])).toBe("widget 组件");
  });

  it("null/空数组返回空串", () => {
    expect(formatResourceRefs(null)).toBe("");
    expect(formatResourceRefs([])).toBe("");
    expect(formatResourceRefs(undefined)).toBe("");
  });
});

describe("formatActorName", () => {
  it("写时快照优先", () => {
    expect(formatActorName({ actorName: "张三", actorUserId: "u1" })).toBe("张三");
  });

  it("快照缺失回退 ID", () => {
    expect(formatActorName({ actorName: null, actorUserId: "u1" })).toBe("u1");
  });

  it("两者皆无回退占位", () => {
    expect(formatActorName({ actorName: null, actorUserId: null })).toBe("-");
  });
});

describe("formatAuditSummary", () => {
  it("失败优先于变更字段", () => {
    expect(formatAuditSummary({
      status: "failure",
      errorCode: "PROJECT_NAME_CONFLICT",
      changedFields: ["name"],
    } as never)).toBe("失败：PROJECT_NAME_CONFLICT");
  });

  it("成功显示变更字段", () => {
    expect(formatAuditSummary({
      status: "success",
      errorCode: null,
      changedFields: ["name", "orgId"],
    } as never)).toBe("变更：name, orgId");
  });

  it("无变更无失败返回空串", () => {
    expect(formatAuditSummary({
      status: "success",
      errorCode: null,
      changedFields: null,
    } as never)).toBe("");
  });
});
