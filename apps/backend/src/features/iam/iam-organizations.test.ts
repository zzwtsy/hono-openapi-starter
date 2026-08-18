import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/core/errors/app-error.js";

import {
  buildIamApp,
  mockOrg,
  mockSession,
  mockUser,
} from "../../../tests/helpers/iam-route-test-helpers.js";

import * as handlers from "./handlers.js";
import * as routes from "./routes.js";

const {
  mockGetSession,
  mockCheck,
  mockListOrganizations,
  mockCreateOrganization,
  mockGetOrganizationById,
  mockUpdateOrganization,
  mockDeleteOrganization,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockCheck: vi.fn(),
  mockListOrganizations: vi.fn(),
  mockCreateOrganization: vi.fn(),
  mockGetOrganizationById: vi.fn(),
  mockUpdateOrganization: vi.fn(),
  mockDeleteOrganization: vi.fn(),
}));

vi.mock("../../core/auth/session.js", () => ({ getSession: mockGetSession }));
vi.mock("../../core/authorization/index.js", () => ({ PermissionService: { check: mockCheck } }));
vi.mock("../../core/audit/index.js", async () => ({
  audit: (await import("../../../tests/helpers/audit-passthrough.js")).auditPassthrough,
}));
vi.mock("./service.js", () => ({
  IamService: {
    listOrganizations: mockListOrganizations,
    createOrganization: (_actor: unknown, input: unknown) => mockCreateOrganization(input) as unknown,
    getOrganizationById: (orgId: string, _actorOrgId?: string) => mockGetOrganizationById(orgId) as unknown,
    updateOrganization: (_actor: unknown, orgId: string, input: unknown) => mockUpdateOrganization(orgId, input) as unknown,
    deleteOrganization: (_actor: unknown, orgId: string) => mockDeleteOrganization(orgId) as unknown,
  },
}));

function buildApp() {
  return buildIamApp((app) => {
    app.openapi(routes.listOrganizationsRoute, handlers.listOrganizationsHandler);
    app.openapi(routes.createOrganizationRoute, handlers.createOrganizationHandler);
    app.openapi(routes.getOrganizationRoute, handlers.getOrganizationHandler);
    app.openapi(routes.updateOrganizationRoute, handlers.updateOrganizationHandler);
    app.openapi(routes.deleteOrganizationRoute, handlers.deleteOrganizationHandler);
  });
}

function authed() {
  mockGetSession.mockResolvedValue({ user: mockUser as never, session: mockSession as never });
  mockCheck.mockResolvedValue(true);
}

describe("IAM organization routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    const requirePermission = async (permissionCode: string) => {
      const allowed = await mockCheck("u-1", permissionCode, "org-1") as boolean;
      if (!allowed) {
        throw new AppError("COMMON_FORBIDDEN");
      }
    };
    mockCreateOrganization.mockImplementation(async () => requirePermission("organizations.create"));
    mockUpdateOrganization.mockImplementation(async () => requirePermission("organizations.update"));
    mockDeleteOrganization.mockImplementation(async () => requirePermission("organizations.delete"));
  });

  // 组织列表。
  it("listOrganizations 无 organizations.read 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/organizations");
    expect(res.status).toBe(403);
  });

  it("listOrganizations 有 organizations.read 调 service 返回 200", async () => {
    authed();
    mockListOrganizations.mockResolvedValue([mockOrg]);

    const res = await buildApp().request("/organizations");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { id: string }[] };
    expect(body.data[0].id).toBe("org-root");
  });

  // 创建组织。
  it("createOrganization 无 organizations.create 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/organizations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "华南", parentId: "org-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("createOrganization 有 organizations.create 调 service 返回 200", async () => {
    authed();
    mockCreateOrganization.mockResolvedValue(mockOrg);

    const res = await buildApp().request("/organizations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Child", parentId: "org-1" }),
    });
    expect(res.status).toBe(200);
    expect(mockCreateOrganization).toHaveBeenCalledWith({ name: "Child", parentId: "org-1" });
  });

  it("createOrganization service 抛 NOT_FOUND(父组织) 返回 404", async () => {
    authed();
    mockCreateOrganization.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/organizations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "华南", parentId: "no-such-org" }),
    });
    expect(res.status).toBe(404);
  });

  // 组织详情。
  it("getOrganization 无 organizations.read 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/organizations/org-root");
    expect(res.status).toBe(403);
  });

  it("getOrganization 有 organizations.read 调 service 返回 200", async () => {
    authed();
    mockGetOrganizationById.mockResolvedValue(mockOrg);

    const res = await buildApp().request("/organizations/org-root");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { id: string } };
    expect(body.data.id).toBe("org-root");
    expect(mockGetOrganizationById).toHaveBeenCalledWith("org-root");
  });

  it("getOrganization service 抛 NOT_FOUND 返回 404", async () => {
    authed();
    mockGetOrganizationById.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/organizations/org-root");
    expect(res.status).toBe(404);
  });

  // 修改组织。
  it("updateOrganization 无 organizations.update 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/organizations/org-root", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Root Org" }),
    });
    expect(res.status).toBe(403);
  });

  it("updateOrganization 有 organizations.update 调 service 返回 200", async () => {
    authed();
    mockUpdateOrganization.mockResolvedValue({ ...mockOrg, name: "Root Org" });

    const res = await buildApp().request("/organizations/org-root", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Root Org" }),
    });
    expect(res.status).toBe(200);
    expect(mockUpdateOrganization).toHaveBeenCalledWith("org-root", { name: "Root Org" });
  });

  it("updateOrganization service 抛 NOT_FOUND 返回 404", async () => {
    authed();
    mockUpdateOrganization.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/organizations/org-root", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Root Org" }),
    });
    expect(res.status).toBe(404);
  });

  it("updateOrganization service 抛 CONFLICT(防环) 返回 409", async () => {
    authed();
    mockUpdateOrganization.mockRejectedValue(new AppError("COMMON_CONFLICT"));

    const res = await buildApp().request("/organizations/org-root", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ parentId: "org-child" }),
    });
    expect(res.status).toBe(409);
  });

  // 删除组织。
  it("deleteOrganization 无 organizations.delete 返回 403", async () => {
    authed();
    mockCheck.mockResolvedValue(false);

    const res = await buildApp().request("/organizations/org-root", { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  it("deleteOrganization 有 organizations.delete 调 service 返回 200", async () => {
    authed();
    mockDeleteOrganization.mockResolvedValue(undefined);

    const res = await buildApp().request("/organizations/org-root", { method: "DELETE" });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { id: string } };
    expect(body.data.id).toBe("org-root");
    expect(mockDeleteOrganization).toHaveBeenCalledWith("org-root");
  });

  it("deleteOrganization service 抛 NOT_FOUND 返回 404", async () => {
    authed();
    mockDeleteOrganization.mockRejectedValue(new AppError("COMMON_NOT_FOUND"));

    const res = await buildApp().request("/organizations/org-root", { method: "DELETE" });
    expect(res.status).toBe(404);
  });

  it("deleteOrganization service 抛 CONFLICT(有子组织) 返回 409", async () => {
    authed();
    mockDeleteOrganization.mockRejectedValue(new AppError("COMMON_CONFLICT"));

    const res = await buildApp().request("/organizations/org-root", { method: "DELETE" });
    expect(res.status).toBe(409);
  });
});
