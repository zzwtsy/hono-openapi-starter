const POLL_INTERVAL_MS = 500;
const READINESS_TIMEOUT_MS = 120_000;
const REQUEST_TIMEOUT_MS = 2_000;

/** 可参与 readiness 竞速的最小服务生命周期视图。 */
export interface ReadinessService {
  name: string;
  /** 服务运行时保持 pending；正常退出时 resolve，异常退出时以原始错误 reject。 */
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

/**
 * 等待 HTTP 2xx readiness，同时监听服务提前退出与外部取消。
 *
 * @throws 服务正常提前退出时生成包含服务名和 URL 的错误；异常退出与取消分别传播原始错误
 * 和 abort reason；超时时错误包含最后一次探测失败原因。
 */
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
    // 竞速结束后取消并回收轮询 Promise，避免遗留 timer 或未处理 rejection。
    pollingController.abort(new Error(`${service.name} readiness wait finished`));
    await readiness.catch(() => {});
  }
}
