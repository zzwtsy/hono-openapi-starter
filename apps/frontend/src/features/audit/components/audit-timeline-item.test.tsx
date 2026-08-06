import type { AuditTimelineLog } from "@/api/globals";
import { render, screen } from "@testing-library/react";

import { describe, expect, it } from "vitest";

import { AuditTimelineItem } from "./audit-timeline-item";

describe("AuditTimelineItem", () => {
  it("优先展示后端返回的 actionLabel", () => {
    const log = {
      id: "audit-1",
      actorUserId: "user-1",
      actorName: "张三",
      action: "projects.update",
      resourceRefs: [{ type: "project", id: "project-1", name: "项目 A" }],
      beforeState: null,
      afterState: null,
      changedFields: null,
      status: "success",
      errorCode: null,
      occurredAt: "2026-07-10T12:00:00.000Z",
      actionLabel: "修改项目",
    } satisfies AuditTimelineLog;

    render(<AuditTimelineItem log={log} />);

    expect(screen.getByText("修改项目")).toBeInTheDocument();
    expect(screen.queryByText("projects.update")).not.toBeInTheDocument();
  });
});
