import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative overflow-hidden transition-colors hover:bg-accent"
        >
          <Sun
            className="theme-toggle-icon absolute left-1/2 top-1/2 size-[1.2rem] -translate-x-1/2 -translate-y-1/2 scale-100 rotate-0 opacity-100 transition-all duration-500 ease-in-out dark:translate-y-[-150%] dark:scale-75 dark:-rotate-90 dark:opacity-0"
          />

          <Moon
            className="theme-toggle-icon absolute left-1/2 top-1/2 size-[1.2rem] -translate-x-1/2 translate-y-[150%] scale-75 rotate-90 opacity-0 transition-all duration-500 ease-in-out dark:-translate-y-1/2 dark:scale-100 dark:rotate-0 dark:opacity-100"
          />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
