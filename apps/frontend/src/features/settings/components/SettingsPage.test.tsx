import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettingsPage } from "./SettingsPage";

describe("SettingsPage", () => {
  it("渲染空态(无配置项)", () => {
    render(<SettingsPage />);

    expect(screen.getByText(/当前暂无可配置项/)).toBeInTheDocument();
  });
});
