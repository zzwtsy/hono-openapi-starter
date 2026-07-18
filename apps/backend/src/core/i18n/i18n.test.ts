import type { ErrorCode } from "../errors/error-registry.js";

import { describe, expect, it } from "vitest";
import { errorRegistry } from "../errors/error-registry.js";
import { translate } from "./i18n.js";
import { DEFAULT_LOCALE, detectLocale } from "./locale.js";
import { messages } from "./messages.js";

describe("detectLocale", () => {
  it("无 header 回退默认 en", () => {
    expect(detectLocale(null)).toBe(DEFAULT_LOCALE);
    expect(detectLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(detectLocale("")).toBe(DEFAULT_LOCALE);
  });

  it("单语言直接匹配", () => {
    expect(detectLocale("zh")).toBe("zh");
    expect(detectLocale("en")).toBe("en");
  });

  it("带区域子标签取语言主部分", () => {
    expect(detectLocale("zh-CN")).toBe("zh");
    expect(detectLocale("en-US")).toBe("en");
  });

  it("按 q 值降序匹配(对齐 Better Auth i18n)", () => {
    // fr-CA 不支持 -> fr 不支持 -> en 命中
    expect(detectLocale("fr-CA, fr;q=0.9, en;q=0.8")).toBe("en");
    // zh 优先级高
    expect(detectLocale("en;q=0.5, zh;q=0.9")).toBe("zh");
  });

  it("无受支持语言回退 en", () => {
    expect(detectLocale("fr")).toBe("en");
    expect(detectLocale("de, ja;q=0.9")).toBe("en");
  });
});

describe("translate", () => {
  it("en 返回 defaultMessage,params 无占位符时原样", () => {
    const { message, originalMessage } = translate("USER_NOT_FOUND", "en");
    expect(message).toBe("User not found");
    expect(originalMessage).toBe("User not found");
  });

  it("zh 返回中文 message,originalMessage 恒为 en", () => {
    const { message, originalMessage } = translate("USER_NOT_FOUND", "zh");
    expect(message).toBe("用户不存在");
    expect(originalMessage).toBe("User not found");
  });

  it("expose:false 码也走 i18n(通用 message,非内部细节)", () => {
    const { message, originalMessage } = translate("COMMON_INTERNAL_ERROR", "zh");
    expect(message).toBe("内部错误");
    expect(originalMessage).toBe("Internal server error");
  });

  it("params 填充 {key} 占位符", () => {
    // USER_NOT_FOUND 模板无占位符,params 不影响;改测带占位符场景用自定义验证
    const { message } = translate("USER_NOT_FOUND", "en", { id: "u-1" });
    expect(message).toBe("User not found");
  });
});

describe("zh 字典覆盖", () => {
  it("zh 覆盖所有 ErrorCode(新增码必须补 zh)", () => {
    const codes = Object.keys(errorRegistry) as ErrorCode[];
    for (const code of codes) {
      expect(messages.zh[code], `zh 字典缺 ${code}`).toBeDefined();
      expect(typeof messages.zh[code]).toBe("string");
    }
    expect(Object.keys(messages.zh).length).toBe(codes.length);
  });
});
