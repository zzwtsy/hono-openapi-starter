import type { Permission } from "@/shared/api/globals";
import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { groupByResource } from "../lib/group-by-resource";
import { formatPermission } from "../model/permission-format";

interface PermissionComboboxProps {
  value: string | null;
  onChange: (name: string) => void;
  permissions: Permission[];
  placeholder?: string;
  disabled?: boolean;
}

/**
 * 权限选择 Combobox:搜索 + 按 resource 分组 + 显「描述(代码)」。
 * resource 分组标题用权限自带的 `resourceLabel`(后端 listPermissions 返回),前端零映射。
 */
export function PermissionCombobox({
  value,
  onChange,
  permissions,
  placeholder = "选择权限...",
  disabled = false,
}: PermissionComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = permissions.find(p => p.name === value);
  const groups = useMemo(() => groupByResource(permissions, p => p.name), [permissions]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" role="combobox" disabled={disabled} className="w-full justify-between font-normal" />}>
        <span className={cn("truncate", selected === undefined && "text-muted-foreground")}>
          {selected !== undefined ? formatPermission(selected) : placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索权限..." />
          <CommandList>
            <CommandEmpty>无匹配权限。</CommandEmpty>
            {[...groups.entries()].map(([resource, perms]) => (
              <CommandGroup
                key={resource}
                heading={`${perms[0]?.resourceLabel ?? resource}（${resource}）`}
              >
                {perms.map(p => (
                  <CommandItem
                    key={p.name}
                    value={formatPermission(p)}
                    onSelect={() => {
                      onChange(p.name);
                      setOpen(false);
                    }}
                  >
                    {formatPermission(p)}
                    <Check className={cn("ml-auto", value === p.name ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
