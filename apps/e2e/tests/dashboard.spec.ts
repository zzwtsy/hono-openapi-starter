import { expectPageReady } from "../src/assertions.js";
import { expect, test } from "../src/fixtures/admin.js";

test("管理员登录后 Dashboard 可渲染", async ({ page }) => {
  await page.goto("/dashboard");
  await expectPageReady(page, "Dashboard");
  await expect(page.getByText("概览").first()).toBeVisible();
});
