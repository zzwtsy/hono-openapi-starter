const POLL_INTERVAL_MS = 500;
const READINESS_TIMEOUT_MS = 120_000;
const REQUEST_TIMEOUT_MS = 2_000;

export interface ReadinessService {
  name: string;
  exit: Promise<void>;
}

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new Error("E2E shutdown requested");
}

async function abortableDelay(milliseconds: number, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    let timer: NodeJS.Timeout;
    const handleAbort = (): void => {
      clearTimeout(timer);
      reject(abortReason(signal));
    };
    timer = setTimeout(() => {
      signal.removeEventListener("abort", handleAbort);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", handleAbort, { once: true });
  });
}

async function waitForUrl(url: string, signal: AbortSignal): Promise<void> {
  const deadline = Date.now() + READINESS_TIMEOUT_MS;
  let lastError = "no response";

  while (Date.now() < deadline) {
    signal.throwIfAborted();
    const remaining = deadline - Date.now();
    const requestTimeout = Math.max(1, Math.min(REQUEST_TIMEOUT_MS, remaining));
    const requestController = new AbortController();
    const requestTimer = setTimeout(() => {
      requestController.abort(new Error(`request timed out after ${requestTimeout}ms`));
    }, requestTimeout);

    try {
      const response = await fetch(url, {
        signal: AbortSignal.any([signal, requestController.signal]),
      });
      if (response.ok) {
        return;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      if (signal.aborted) {
        throw abortReason(signal);
      }
      lastError = error instanceof Error ? error.message : String(error);
    } finally {
      clearTimeout(requestTimer);
    }

    const delayMilliseconds = Math.min(POLL_INTERVAL_MS, deadline - Date.now());
    if (delayMilliseconds > 0) {
      await abortableDelay(delayMilliseconds, signal);
    }
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError}`);
}

export async function waitForService(
  service: ReadinessService,
  url: string,
  signal: AbortSignal,
): Promise<void> {
  signal.throwIfAborted();
  const pollingController = new AbortController();
  const readiness = waitForUrl(
    url,
    AbortSignal.any([signal, pollingController.signal]),
  );
  const prematureExit = service.exit.then(
    () => {
      throw new Error(`${service.name} exited before ready; url: ${url}`);
    },
    (error: unknown) => {
      throw error;
    },
  );

  try {
    await Promise.race([readiness, prematureExit]);
  } finally {
    pollingController.abort(new Error(`${service.name} readiness wait finished`));
    await readiness.catch(() => {});
  }
}
