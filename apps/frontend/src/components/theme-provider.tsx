import * as React from "react";

export type Theme = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  disableTransitionOnChange?: boolean;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";
const THEME_VALUES: Theme[] = ["dark", "light", "system"];

const ThemeProviderContext = React.createContext<
  ThemeProviderState | undefined
>(undefined);

function isTheme(value: string | null): value is Theme {
  if (value === null) {
    return false;
  }

  return THEME_VALUES.includes(value as Theme);
}

function getSystemTheme(): ResolvedTheme {
  if (window.matchMedia(COLOR_SCHEME_QUERY).matches) {
    return "dark";
  }

  return "light";
}

function disableTransitionsTemporarily() {
  const style = document.createElement("style");

  style.appendChild(
    document.createTextNode(`
      *:not(.theme-toggle-icon),
      *:not(.theme-toggle-icon)::before,
      *:not(.theme-toggle-icon)::after {
        -webkit-transition: none !important;
        transition: none !important;
      }
    `),
  );

  document.head.appendChild(style);

  return () => {
    window.getComputedStyle(document.body);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        style.remove();
      });
    });
  };
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  disableTransitionOnChange = true,
  ...props
}: ThemeProviderProps) {
  const [themeInternal, setThemeInternal] = React.useState<Theme>(() => {
    const storedTheme = localStorage.getItem(storageKey);
    if (isTheme(storedTheme)) {
      return storedTheme;
    }

    return defaultTheme;
  });

  const setTheme = React.useCallback(
    (nextTheme: Theme) => {
      localStorage.setItem(storageKey, nextTheme);
      setThemeInternal(nextTheme);
    },
    [storageKey],
  );

  const applyTheme = React.useCallback(
    (nextTheme: Theme) => {
      const root = document.documentElement;
      const resolvedTheme
        = nextTheme === "system" ? getSystemTheme() : nextTheme;
      const restoreTransitions = disableTransitionOnChange
        ? disableTransitionsTemporarily()
        : null;

      root.classList.remove("light", "dark");
      root.classList.add(resolvedTheme);

      if (restoreTransitions) {
        restoreTransitions();
      }
    },
    [disableTransitionOnChange],
  );

  React.useEffect(() => {
    applyTheme(themeInternal);

    if (themeInternal !== "system") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(COLOR_SCHEME_QUERY);
    const handleChange = () => {
      applyTheme("system");
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [themeInternal, applyTheme]);

  React.useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) {
        return;
      }

      if (event.key !== storageKey) {
        return;
      }

      if (isTheme(event.newValue)) {
        setThemeInternal(event.newValue);
        return;
      }

      setThemeInternal(defaultTheme);
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [defaultTheme, storageKey]);

  const value = React.useMemo(
    () => ({
      theme: themeInternal,
      setTheme,
    }),
    [themeInternal, setTheme],
  );

  return (
    <ThemeProviderContext {...props} value={value}>
      {children}
    </ThemeProviderContext>
  );
}

export function useTheme() {
  const context = React.use(ThemeProviderContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
