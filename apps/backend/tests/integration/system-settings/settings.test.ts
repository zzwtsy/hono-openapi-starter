import { beforeEach, describe, expect, it } from "vitest";

import { app } from "@/app.js";
import { db } from "@/db/client.js";
import { systemSettings, user } from "@/db/schema/index.js";
import { SystemSettingService } from "@/features/system-settings/service.js";
import { resetDb } from "../../helpers/db.js";

/**
 * system-settings 集成测试:真实 PG(testcontainers)验证
 * 1) SystemSettingService 真实 DB 读写(upsert onConflict / get / list 脏数据过滤);
 * 2) sign-up hooks.before 三态:经真实 HTTP(/api/auth/sign-up/email)触发,与生产一致。
 *
 * 用全局 `db`:integration worker 里 `DATABASE_URL` 已被 globalSetup 指向容器。
 * sign-up 走 `app.request`(真实 HTTP),ctx.request 是真实 Request,hooks.before 用 request.url 判断端点
 * (server-side `auth.api.signUpEmail` 不构造 Request,ctx.request 为 undefined,无法触发 hook,故测试用 HTTP)。
 */

const SIGNUP_BODY = { email: "new@example.com", password: "password-123", name: "New User" } as const;

async function signUpRequest() {
  return app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(SIGNUP_BODY),
  });
}

describe("system-settings integration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe("SystemSettingService 真实 DB", () => {
    beforeEach(async () => {
      // upsert 的 updatedByUserId 是 FK -> user.id,需先有 user 记录。
      await db.insert(user).values({ id: "u-1", name: "U1", email: "u1@example.com" });
    });

    it("upsert 创建并按 key 读取", async () => {
      const row = await SystemSettingService.upsert("signUp", { enabled: true }, "u-1");
      expect(row.value).toEqual({ enabled: true });
      expect(row.updatedByUserId).toBe("u-1");

      const got = await SystemSettingService.get("signUp");
      expect(got?.value).toEqual({ enabled: true });
    });

    it("upsert 更新已存在记录(onConflictDoUpdate 覆盖 value)", async () => {
      await SystemSettingService.upsert("signUp", { enabled: true }, "u-1");
      await SystemSettingService.upsert("signUp", { enabled: false }, "u-1");

      const got = await SystemSettingService.get("signUp");
      expect(got?.value).toEqual({ enabled: false });
    });

    it("list 过滤脏数据(key 不在 registry 的行不返回)", async () => {
      await SystemSettingService.upsert("signUp", { enabled: true }, "u-1");
      // 直连 DB 写一条 key 不在 registry 的脏数据。
      await db.insert(systemSettings).values({ key: "unknownKey", value: { foo: 1 } });

      const list = await SystemSettingService.list();
      expect(list).toHaveLength(1);
      expect(list[0].key).toBe("signUp");
    });
  });

  describe("sign-up hooks.before(HTTP 触发,与生产一致)", () => {
    it("signUp.enabled=true 时注册放行(2xx)", async () => {
      await db.insert(systemSettings).values({ key: "signUp", value: { enabled: true } });

      const res = await signUpRequest();

      expect(res.status).toBe(200);
    });

    it("signUp.enabled=false 时注册被拒 403", async () => {
      await db.insert(systemSettings).values({ key: "signUp", value: { enabled: false } });

      const res = await signUpRequest();

      expect(res.status).toBe(403);
    });

    it("signUp 记录缺失时注册被拒 403(未配置即禁,安全默认)", async () => {
      // resetDb 后无 signUp 记录。
      const res = await signUpRequest();

      expect(res.status).toBe(403);
    });

    it("signUp.enabled=false 时带 query 参数的注册请求仍被拒 403(防 endsWith 整个 url 的绕过)", async () => {
      await db.insert(systemSettings).values({ key: "signUp", value: { enabled: false } });

      const res = await app.request("/api/auth/sign-up/email?foo=bar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(SIGNUP_BODY),
      });

      expect(res.status).toBe(403);
    });
  });
});
