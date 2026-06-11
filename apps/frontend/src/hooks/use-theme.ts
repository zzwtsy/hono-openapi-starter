import * as React from "react";

import { ThemeProviderContext } from "@/components/theme-context";

export function useTheme() {
  const context = React.use(ThemeProviderContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
