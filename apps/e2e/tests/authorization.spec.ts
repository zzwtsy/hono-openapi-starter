import { expectPageReady } from "../src/assertions.js";
import { FRONTEND_URL, RESTRICTED_STATE } from "../src/constants.js";
import { expect, test } from "../src/fixtures/base.js";

test.use({ storageState: RESTRICTED_STATE });

test("无业务权限用户看见空 Dashboard 且不能访问项目", async ({ page }) => {
  await page.goto("/dashboard");
  await expectPageReady(page, "Dashboard");
  await expect(page.getByText("暂无可用功能")).toBeVisible();
  await expect(page.getByRole("link", { name: "项目" })).toHaveCount(0);

  const response = await page.request.get(`${FRONTEND_URL}/api/v1/projects`);
  expect(response.status()).toBe(403);
  const body = await response.json() as { code?: string; success?: boolean };
  expect(body).toMatchObject({ success: false, code: "COMMON_FORBIDDEN" });

  await page.goto("/projects");
  await expect(page).toHaveURL(/\/403$/);
  await expectPageReady(page, "403");
  await expect(page.getByText("无权限访问此页面")).toBeVisible();
});
