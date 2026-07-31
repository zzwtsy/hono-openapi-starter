import type { TimeRangePreset } from "./date-range-picker";
import { fireEvent, render, screen } from "@testing-library/react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { DateRangePicker } from "./date-range-picker";

// 本地时区构造(测试无论 TZ 都断言本地日期,避免 UTC 偏移漂一天)
const atLocal = (y: number, m: number, d: number) => new Date(y, m - 1, d).toISOString();

const presets: TimeRangePreset[] = [
  { key: "7d", label: "近 7 天", from: atLocal(2026, 7, 9) },
  { key: "30d", label: "近 30 天", from: atLocal(2026, 6, 15) },
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
    render(<DateRangePicker from={atLocal(2026, 7, 9)} presets={presets} onRangeChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /选择时间范围/ })).toHaveTextContent("07-09 起");
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
    fireEvent.click(await screen.findByRole("combobox"));
    // Base UI SelectItem 的 virtual click(无 pointerType)需要 pointerDown 预置选择许可
    const presetOption = await screen.findByRole("option", { name: "近 7 天" });
    fireEvent.pointerDown(presetOption, { pointerType: "mouse" });
    fireEvent.click(presetOption);
    expect(onRangeChange).toHaveBeenCalledWith(presets[0].from, undefined);
  });

  it("点「全部时间」清除范围", async () => {
    const onRangeChange = vi.fn();
    render(<DateRangePicker from={atLocal(2026, 7, 1)} to={atLocal(2026, 7, 31)} presets={presets} onRangeChange={onRangeChange} />);
    fireEvent.click(screen.getByRole("button", { name: /选择时间范围/ }));
    fireEvent.click(await screen.findByRole("combobox"));
    const allOption = await screen.findByRole("option", { name: "全部时间" });
    fireEvent.pointerDown(allOption, { pointerType: "mouse" });
    fireEvent.click(allOption);
    expect(onRangeChange).toHaveBeenCalledWith(undefined, undefined);
  });

  it("日历选择输出当天 00:00 / 23:59:59.999 边界,再点同日清除", async () => {
    // 受控流模拟:onRangeChange 回写 state(与 URL search 驱动一致),否则第二次点击时
    // react-day-picker 的 selected 仍是空,addToRange 会重复产出同日 range 而非清除
    const calls: [string | undefined, string | undefined][] = [];
    function Harness() {
      const [range, setRange] = React.useState<{ from?: string; to?: string }>({});
      return (
        <DateRangePicker
          from={range.from}
          to={range.to}
          presets={presets}
          onRangeChange={(from, to) => {
            calls.push([from, to]);
            setRange({ from, to });
          }}
        />
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /选择时间范围/ }));

    // zhCN 日历的 day 按钮 aria-label = date-fns PPPP(今天带「今天,」前缀,用 regex 匹配)。
    // v10 addToRange:空范围点击默认 to=同一天(单日完整 range,无半选态);
    // 单日 range 再点同一天 → 清除。未来日期被禁用,故用今天。
    const day = new Date();
    const dayName = format(day, "PPPP", { locale: zhCN });
    // 今天在双月视图(第二月 outside day)可能出现两次,取第一月视图
    const dayButtons = () => screen.getAllByRole("button", { name: new RegExp(dayName) });
    fireEvent.click((await screen.findAllByRole("button", { name: new RegExp(dayName) }))[0]);

    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
    expect(calls).toEqual([[start.toISOString(), end.toISOString()]]);

    fireEvent.click(dayButtons()[0]);
    expect(calls).toEqual([[start.toISOString(), end.toISOString()], [undefined, undefined]]);
  });

  it("预设选中态:from 匹配预设时预设 Select 显示预设名", async () => {
    render(<DateRangePicker from={presets[0].from} presets={presets} onRangeChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /选择时间范围/ }));
    expect(await screen.findByRole("combobox", { name: "" })).toHaveTextContent("近 7 天");
  });
});
