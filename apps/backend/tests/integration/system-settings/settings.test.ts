import { beforeEach, describe, expect, it } from "vitest";

import { app } from "@/app.js";
import { db } from "@/db/client.js";
import { systemSettings } from "@/db/schema/index.js";
import { SystemSettingService } from "@/features/system-settings/service.js";
import { resetDb } from "../../helpers/db.js";

/**
 * system-settings 集成测试:真实 PG(testcontainers)。
 * 模板已移除自助注册(ADR-0007 superseded):
 * 1) /api/auth/sign-up/email 任意 body 恒 403(hooks.before 永久拒绝,不查 DB);
 * 2) registry 当前空:SystemSettingService.list 返回空并过滤脏数据。
 *
 * sign-up 走 app.request(真实 HTTP),ctx.request 是真实 Request,hooks.before 用 request.url 判断端点
 * (server-side auth.api.signUpEmail 不构造 Request,ctx.request 为 undefined,无法触发 hook,故测试用 HTTP)。
 */

const SIGNUP_BODY = { email: "new@example.com", password: "password-123", name: "New User" } as const;

describe("system-settings integration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe("sign-up 永久拒绝(不依赖 DB)", () => {
    it("任意 body 注册均 403", async () => {
      const res = await app.request("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(SIGNUP_BODY),
      });

      expect(res.status).toBe(403);
    });

    it("带 query 参数的注册请求仍 403(防 endsWith 整个 url 的绕过)", async () => {
      const res = await app.request("/api/auth/sign-up/email?foo=bar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(SIGNUP_BODY),
      });

      expect(res.status).toBe(403);
    });
  });

  describe("SystemSettingService(registry 空)", () => {
    it("list 返回空(无配置项)", async () => {
      const list = await SystemSettingService.list();
      expect(list).toEqual([]);
    });

    it("list 过滤脏数据(key 不在 registry 的行不返回)", async () => {
      // 直连 DB 写一条 key 不在 registry 的脏数据(registry 空时任何 key 都属脏数据)。
      await db.insert(systemSettings).values({ key: "unknownKey", value: { foo: 1 } });

      const list = await SystemSettingService.list();
      expect(list).toEqual([]);
    });
  });
});
