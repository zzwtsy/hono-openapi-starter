import type { UserSummary } from "@/api/globals";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { parseUserAccessView, parseUserDetailTab, useUserSelection } from "./use-user-selection";

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

  it("非法 tab 回退 overview 且保留用户组织视角", () => {
    const { result } = renderHook(() => useUserSelection({
      users,
      tab: "unknown",
      homeOrgId: "org-1",
    }));

    expect(result.current.selectedUser?.id).toBe("u-1");
    expect(result.current.orgId).toBe("org-1");
    expect(result.current.activeTab).toBe("overview");
  });
});

describe("parseUserDetailTab", () => {
  it("将旧授权 Tab 统一映射到访问权限", () => {
    expect(parseUserDetailTab("roles")).toBe("access");
    expect(parseUserDetailTab("direct")).toBe("access");
    expect(parseUserDetailTab("effective")).toBe("access");
    expect(parseUserDetailTab("info")).toBe("overview");
  });
});

describe("parseUserAccessView", () => {
  it("接受合法值并将非法值回退到配置视图", () => {
    expect(parseUserAccessView("config")).toBe("config");
    expect(parseUserAccessView("effective")).toBe("effective");
    expect(parseUserAccessView("unknown")).toBe("config");
  });

  it("仅将旧 effective 深链映射到生效结果", () => {
    expect(parseUserAccessView(undefined, "effective")).toBe("effective");
    expect(parseUserAccessView(undefined, "roles")).toBe("config");
    expect(parseUserAccessView(undefined, "direct")).toBe("config");
  });
});
