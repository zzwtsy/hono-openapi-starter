import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function expectPageReady(page: Page, heading: string | RegExp): Promise<void> {
  await expect(page).toHaveTitle("管理控制台");
  await expect(page.locator("#root")).not.toBeEmpty();
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  await expect(page.getByText(heading, { exact: true }).first()).toBeVisible();
}
