import { useState } from "react";
import { toast } from "sonner";

interface ToastMutationOptions {
  successMessage?: string;
  errorMessage?: string;
}

/**
 * mutation 包装:统一 try/catch + toast(success/error)+ busy 状态,
 * 消除各 mutation 散落的样板(见 code-style §7)。
 *
 * `mutate` 返回 boolean(成功/失败),调用方据此做后续(清选中 / 刷新列表)。
 * 多个独立 mutation 各自调用一次本 hook,避免共享同一 busy。
 */
export function useToastMutation() {
  const [busy, setBusy] = useState(false);

  const mutate = async (
    fn: () => Promise<unknown>,
    options: ToastMutationOptions = {},
  ): Promise<boolean> => {
    setBusy(true);
    try {
      await fn();
      if (options.successMessage !== undefined) {
        toast.success(options.successMessage);
      }
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (options.errorMessage ?? "操作失败"));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { mutate, busy };
}
