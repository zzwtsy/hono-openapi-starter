import type { TimeRangePreset } from "./date-range-picker";
import { fireEvent, render, screen } from "@testing-library/react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { describe, expect, it, vi } from "vitest";
import { DateRangePicker } from "./date-range-picker";

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => false,
}));

// 本地时区构造(测试无论 TZ 都断言本地日期,避免 UTC 偏移漂一天)
const atLocal = (y: number, m: number, d: number) => new Date(y, m - 1, d).toISOString();

const presetFroms = [atLocal(2026, 7, 9), atLocal(2026, 6, 15)] as const;
const presets: TimeRangePreset[] = [
  { key: "7d", label: "近 7 天", resolveFrom: () => presetFroms[0] },
  { key: "30d", label: "近 30 天", resolveFrom: () => presetFroms[1] },
];

describe("DateRangePicker", () => {
  it("无值显示「全部时间」占位", () => {
    render(<DateRangePicker presets={presets} onRangeChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /选择时间范围/ })).toHaveTextContent("全部时间");
  });

  it("同年区间显示 MM-dd ~ MM-dd", () => {
    render(<DateRangePicker from={atLocal(2026, 7, 1)} to={atLocal(2026, 7, 31)} presets={presets} onRangeChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /选择时间范围/ })).toHaveTextContent("07-01 ~ 07-31");
  });

  it("半选态(仅 from)显示 MM-dd 起", () => {
    render(<DateRangePicker from={atLocal(2026, 7, 8)} presets={presets} onRangeChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /选择时间范围/ })).toHaveTextContent("07-08 起");
  });

  it("同一天显示单日", () => {
    render(<DateRangePicker from={atLocal(2026, 7, 9)} to={atLocal(2026, 7, 9)} presets={presets} onRangeChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /选择时间范围/ })).toHaveTextContent("07-09");
    expect(screen.getByRole("button", { name: /选择时间范围/ })).not.toHaveTextContent("~");
  });

  it("跨年区间显示带年格式", () => {
    render(<DateRangePicker from={atLocal(2025, 12, 28)} to={atLocal(2026, 1, 2)} presets={presets} onRangeChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /选择时间范围/ })).toHaveTextContent("2025-12-28 ~ 2026-01-02");
  });

  it("点预设写入预设的 from 并清空 to", async () => {
    const onRangeChange = vi.fn();
    render(<DateRangePicker presets={presets} onRangeChange={onRangeChange} />);
    fireEvent.click(screen.getByRole("button", { name: /选择时间范围/ }));
    fireEvent.click(await screen.findByRole("button", { name: "近 7 天" }));
    expect(onRangeChange).toHaveBeenCalledWith(presetFroms[0], undefined);
  });

  it("每次打开时重新解析相对时间预设", async () => {
    const onRangeChange = vi.fn();
    let currentFrom = presetFroms[0];
    const dynamicPresets: TimeRangePreset[] = [
      { key: "7d", label: "近 7 天", resolveFrom: () => currentFrom },
    ];
    render(<DateRangePicker presets={dynamicPresets} onRangeChange={onRangeChange} />);

    fireEvent.click(screen.getByRole("button", { name: /选择时间范围/ }));
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    currentFrom = presetFroms[1];
    fireEvent.click(screen.getByRole("button", { name: /选择时间范围/ }));
    fireEvent.click(await screen.findByRole("button", { name: "近 7 天" }));

    expect(onRangeChange).toHaveBeenCalledWith(presetFroms[1], undefined);
  });

  it("点「全部时间」清除范围", async () => {
    const onRangeChange = vi.fn();
    render(<DateRangePicker from={atLocal(2026, 7, 1)} to={atLocal(2026, 7, 31)} presets={presets} onRangeChange={onRangeChange} />);
    fireEvent.click(screen.getByRole("button", { name: /选择时间范围/ }));
    fireEvent.click(await screen.findByRole("button", { name: "全部" }));
    expect(onRangeChange).toHaveBeenCalledWith(undefined, undefined);
  });

  it("日历范围只在点击应用后提交一次当天边界", async () => {
    const onRangeChange = vi.fn();
    render(<DateRangePicker presets={presets} onRangeChange={onRangeChange} />);
    fireEvent.click(screen.getByRole("button", { name: /选择时间范围/ }));

    // zhCN 日历的 day 按钮 aria-label = date-fns PPPP(今天带「今天,」前缀,用 regex 匹配)。
    // v10 addToRange：空范围点击默认 to=同一天，未来日期被禁用，故用今天。
    const day = new Date();
    const dayName = format(day, "PPPP", { locale: zhCN });
    fireEvent.click((await screen.findAllByRole("button", { name: new RegExp(dayName) }))[0]);

    expect(onRangeChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "应用" }));

    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
    expect(onRangeChange).toHaveBeenCalledTimes(1);
    expect(onRangeChange).toHaveBeenCalledWith(start.toISOString(), end.toISOString());
  });

  it("取消会丢弃日历草稿", async () => {
    const onRangeChange = vi.fn();
    render(<DateRangePicker presets={presets} onRangeChange={onRangeChange} />);
    fireEvent.click(screen.getByRole("button", { name: /选择时间范围/ }));
    const day = new Date();
    const dayName = format(day, "PPPP", { locale: zhCN });
    fireEvent.click((await screen.findAllByRole("button", { name: new RegExp(dayName) }))[0]);
    fireEvent.click(screen.getByRole("button", { name: "取消" }));

    expect(onRangeChange).not.toHaveBeenCalled();
  });

  it("预设选中态：触发器显示预设名且快捷项保持按下", async () => {
    render(<DateRangePicker from={presetFroms[0]} presets={presets} onRangeChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /选择时间范围/ })).toHaveTextContent("近 7 天");
    fireEvent.click(screen.getByRole("button", { name: /选择时间范围/ }));
    expect(await screen.findByRole("button", { name: "近 7 天" })).toHaveAttribute("aria-pressed", "true");
  });
});
