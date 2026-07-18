/**
 * 支持的 locale（en 默认；zh 中文）。新增语言在此扩展 + messages.ts 补字典。
 */
export type Locale = "en" | "zh";

export const SUPPORTED_LOCALES = ["en", "zh"] as const;

export const DEFAULT_LOCALE: Locale = "en";

/**
 * 解析 Accept-Language header，返回支持的 locale。
 *
 * 支持 q 值（对齐 Better Auth i18n）：`fr-CA, fr;q=0.9, en;q=0.8`。
 * 按质量值降序匹配，取首个受支持 locale 的语言主部分（`fr-CA` -> `fr`）。
 * 无匹配或无 header 时回退默认 en。
 */
export function detectLocale(acceptLanguage: string | null | undefined): Locale {
  if (acceptLanguage == null || acceptLanguage === "") {
    return DEFAULT_LOCALE;
  }

  // 解析 `<range>;q=<value>` 片段，按 q 降序（默认 q=1）
  const parsed = acceptLanguage
    .split(",")
    .map((part) => {
      const [range, ...params] = part.trim().split(";");
      const qParam = params.find(p => p.trim().startsWith("q="));
      const q = qParam != null ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return { range: range.trim(), q: Number.isNaN(q) ? 1 : q };
    })
    .filter(item => item.range !== "" && item.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { range } of parsed) {
    // 取语言主部分（`fr-CA` -> `fr`），忽略大小写
    const lang = range.split("-")[0]?.toLowerCase();
    if (lang != null && (SUPPORTED_LOCALES as readonly string[]).includes(lang)) {
      return lang as Locale;
    }
  }

  return DEFAULT_LOCALE;
}
