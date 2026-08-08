import type { UserSummary } from "@/api/globals";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useUserSelection } from "./use-user-selection";

const users = [
  { id: "u-1", name: "用户一", email: "u1@example.com", orgId: "org-1", disabled: false, createdAt: "2026-01-01T00:00:00.000Z" },
] satisfies UserSummary[];

describe("useUserSelection", () => {
  it("支持 audit 深链接", () => {
    const { result } = renderHook(() => useUserSelection({
      selectedUserId: "u-1",
      users,
      orgParam: "org-1",
      tab: "audit",
      homeOrgId: "org-1",
    }));

    expect(result.current.activeTab).toBe("audit");
  });

  it("非法 tab 回退 info 且保留用户组织视角", () => {
    const { result } = renderHook(() => useUserSelection({
      users,
      tab: "unknown",
      homeOrgId: "org-1",
    }));

    expect(result.current.selectedUser?.id).toBe("u-1");
    expect(result.current.orgId).toBe("org-1");
    expect(result.current.activeTab).toBe("info");
  });
});
