// 防御 open-redirect:仅接受内部路径(以 / 开头且非 //),否则回退默认页。
// 用于登录回跳等用户可控的跳转目标(/login?redirect=...)。
export function safeRedirect(target: string | undefined, fallback = "/dashboard"): string {
  if (target !== undefined && target.startsWith("/") && !target.startsWith("//")) {
    return target;
  }
  return fallback;
}
