import { expectPageReady } from "../src/assertions.js";
import { expect, test } from "../src/fixtures/base.js";

test("未登录访问受保护页面会回到登录页", async ({ page }) => {
  await page.goto("/projects");

  await expect(page).toHaveURL(/\/login\?redirect=/);
  await expectPageReady(page, "登录");
  await expect(page.getByLabel("邮箱")).toBeVisible();
  await expect(page.getByLabel("密码")).toBeVisible();
});

test("错误凭据会显示登录失败", async ({ browserIssues, page }) => {
  browserIssues.expectHttpError({
    method: "POST",
    pathname: "/api/auth/sign-in/email",
    status: 401,
  });
  await page.goto("/login");
  await page.getByLabel("邮箱").fill("wrong@example.test");
  await page.getByLabel("密码").fill("wrong-password");
  await page.getByRole("button", { name: "登录" }).click();

  await expect(page.getByRole("alert")).toContainText("登录失败");
  await expect(page).toHaveURL(/\/login/);
});

test("正常登录后可以访问 Dashboard 并登出", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("邮箱").fill("dev@example.com");
  await page.getByLabel("密码").fill("dev-password");
  await page.getByRole("button", { name: "登录" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expectPageReady(page, "Dashboard");

  await page.getByRole("button", { name: /Dev User/ }).click();
  await page.getByRole("menuitem", { name: "登出" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expectPageReady(page, "登录");
});
