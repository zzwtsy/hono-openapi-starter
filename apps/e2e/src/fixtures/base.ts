import type { ConsoleMessage, Page, Response } from "@playwright/test";

import { Buffer } from "node:buffer";
import { test as base, expect } from "@playwright/test";

interface BrowserIssue {
  source: "console" | "expectation" | "pageerror" | "response";
  message: string;
  url: string;
}

interface ExpectedHttpErrorInput {
  method: string;
  pathname: string;
  status: number;
  count?: number;
}

interface PendingHttpError {
  method: string;
  pathname: string;
  status: number;
  remaining: number;
}

interface BrowserIssues {
  expectHttpError: (input: ExpectedHttpErrorInput) => void;
}

function isHttpStatusConsoleMessage(message: string): boolean {
  return /Failed to load resource: the server responded with a status of [45]\d\d\b/.test(message);
}

function consumeExpectedHttpError(response: Response, expectedHttpErrors: PendingHttpError[]): boolean {
  const request = response.request();
  const pathname = new URL(response.url()).pathname;
  const match = expectedHttpErrors.find(expected => (
    expected.remaining > 0
    && expected.method === request.method()
    && expected.pathname === pathname
    && expected.status === response.status()
  ));
  if (match == null) {
    return false;
  }
  match.remaining -= 1;
  return true;
}

async function collectBrowserIssues(
  page: Page,
  issues: BrowserIssue[],
  expectedHttpErrors: PendingHttpError[],
  runFixture: () => Promise<void>,
): Promise<void> {
  const onConsole = (message: ConsoleMessage) => {
    if (message.type() === "error" && !isHttpStatusConsoleMessage(message.text())) {
      issues.push({ source: "console", message: message.text(), url: page.url() });
    }
  };
  const onPageError = (error: Error) => {
    issues.push({ source: "pageerror", message: error.stack ?? error.message, url: page.url() });
  };
  const onResponse = (response: Response) => {
    const status = response.status();
    if (status < 400 || consumeExpectedHttpError(response, expectedHttpErrors)) {
      return;
    }
    const request = response.request();
    issues.push({
      source: "response",
      message: `HTTP ${status} ${request.method()} ${new URL(response.url()).pathname}`,
      url: response.url(),
    });
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("response", onResponse);
  try {
    await runFixture();
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("response", onResponse);
  }
}

export const test = base.extend<{ browserIssues: BrowserIssues }>({
  browserIssues: [async ({ page }, runFixture, testInfo) => {
    const issues: BrowserIssue[] = [];
    const expectedHttpErrors: PendingHttpError[] = [];
    const browserIssues: BrowserIssues = {
      expectHttpError: (input) => {
        const count = input.count ?? 1;
        if (!Number.isInteger(count) || count < 1 || !input.pathname.startsWith("/")) {
          throw new Error("Expected HTTP error requires a positive integer count and an absolute pathname");
        }
        expectedHttpErrors.push({
          method: input.method.toUpperCase(),
          pathname: input.pathname,
          status: input.status,
          remaining: count,
        });
      },
    };
    await collectBrowserIssues(page, issues, expectedHttpErrors, async () => {
      await runFixture(browserIssues);
    });

    for (const expected of expectedHttpErrors.filter(item => item.remaining > 0)) {
      issues.push({
        source: "expectation",
        message: `Expected ${expected.remaining} more HTTP ${expected.status} ${expected.method} ${expected.pathname}`,
        url: page.url(),
      });
    }

    if (await page.locator("vite-error-overlay").count() > 0) {
      issues.push({ source: "pageerror", message: "Vite error overlay is visible", url: page.url() });
    }

    if (issues.length > 0) {
      await testInfo.attach("browser-errors", {
        body: Buffer.from(JSON.stringify(issues, null, 2)),
        contentType: "application/json",
      });
      throw new Error(`Browser reported ${issues.length} error(s): ${issues[0]?.message}`);
    }
  }, { auto: true }],
});

export { expect };
