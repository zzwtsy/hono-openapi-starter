import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { DatePicker } from "./date-picker";

function ControlledDatePicker() {
  const [value, setValue] = useState<string | null>("2030-01-02T00:00:00.000Z");

  return <DatePicker value={value} onChange={setValue} />;
}

function EmptyControlledDatePicker() {
  const [value, setValue] = useState<string | null>(null);

  return <DatePicker value={value} onChange={setValue} />;
}

describe("DatePicker", () => {
  it("点击清除按钮后恢复为永不过期", () => {
    render(<ControlledDatePicker />);

    const clearButton = screen.getByRole("button", { name: "清除日期" });
    expect(clearButton).toHaveClass("my-auto");
    expect(clearButton).not.toHaveClass("-translate-y-1/2");
    fireEvent.click(clearButton);

    expect(screen.getByRole("button", { name: /永不过期/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "清除日期" })).not.toBeInTheDocument();
  });

  it("从日历选择日期后可以立即清除", () => {
    render(<EmptyControlledDatePicker />);

    fireEvent.click(screen.getByRole("button", { name: /永不过期/ }));
    const availableDay = document.querySelector<HTMLButtonElement>("button[data-day]:not([disabled])");
    expect(availableDay).not.toBeNull();
    fireEvent.click(availableDay!);
    fireEvent.click(screen.getByRole("button", { name: "清除日期" }));

    expect(screen.getByRole("button", { name: /永不过期/ })).toBeInTheDocument();
  });
});
