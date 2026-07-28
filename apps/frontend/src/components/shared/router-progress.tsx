import { useProgress } from "@bprogress/react";
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

// 路由加载进度条:订阅 TanStack Router 的 onBeforeNavigate/onResolved,
// 路径变化时启动进度条,导航 resolve 后收尾。ProgressProvider 在 main.tsx 全局包裹。
// 注意:不用 onBeforeLoad,因为它会为每个匹配 route 都触发一次,导致进度条反复重置。
export function RouterProgress() {
  const { start, stop, set } = useProgress();
  const router = useRouter();

  useEffect(() => {
    // onBeforeNavigate 只在导航真正开始时触发一次(覆盖所有匹配 route 的 beforeLoad)
    const unsubBeforeNavigate = router.subscribe("onBeforeNavigate", () => {
      start();
    });
    const unsubResolved = router.subscribe("onResolved", () => {
      // 用 set(1) 确保进度条平滑走完,再 stop() 收尾;避免 done() 的随机 inc 导致跳跃感
      set(1);
      stop();
    });
    return () => {
      unsubBeforeNavigate();
      unsubResolved();
    };
  }, [router, start, stop, set]);

  return null;
}
