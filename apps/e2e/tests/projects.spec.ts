import { expectPageReady } from "../src/assertions.js";
import { expect, test } from "../src/fixtures/admin.js";

test("管理员可以完成项目创建、编辑和删除", async ({ page }, testInfo) => {
  const projectName = `E2E 项目 ${testInfo.project.name}-${testInfo.workerIndex}-${Date.now()}`;
  const updatedName = `${projectName} 已更新`;

  await page.goto("/projects");
  await expectPageReady(page, "项目");
  await page.getByRole("button", { name: "新建项目" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "新建项目" })).toBeVisible();
  await page.getByLabel("名称").fill(projectName);
  await page.getByLabel("描述").fill("Playwright E2E project");
  await page.getByRole("button", { name: "创建" }).click();

  await expect(page.getByText("项目已创建")).toBeVisible();
  let row = page.getByRole("row").filter({ hasText: projectName });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "操作" }).click();
  await page.getByRole("menuitem", { name: "编辑" }).click();
  await expect(page.getByRole("heading", { name: "编辑项目" })).toBeVisible();
  await page.getByLabel("名称").fill(updatedName);
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page.getByText("项目已更新")).toBeVisible();
  row = page.getByRole("row").filter({ hasText: updatedName });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "操作" }).click();
  await page.getByRole("menuitem", { name: "删除" }).click();
  const confirmation = page.getByRole("alertdialog");
  await expect(confirmation).toContainText(updatedName);
  await confirmation.getByRole("button", { name: "删除" }).click();

  await expect(page.getByText("项目已删除")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: updatedName })).toHaveCount(0);
});
