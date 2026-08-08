import type { PermissionRef } from "@/api/globals";
import type { PermissionCode } from "@/types/permissions";
import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { groupByResource } from "../lib/group-by-resource";

interface PermissionComboboxProps {
  value: string | null;
  onChange: (permissionCode: PermissionCode) => void;
  permissions: PermissionRef[];
  placeholder?: string;
  disabled?: boolean;
}

/**
 * 权限选择 Combobox:搜索 + 按 resource 分组 + 显示权限名称。
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
  const selected = permissions.find(p => p.code === value);
  const groups = useMemo(() => groupByResource(permissions, p => p.resourceCode), [permissions]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" role="combobox" disabled={disabled} className="w-full justify-between font-normal" />}>
        <span className={cn("truncate", selected === undefined && "text-muted-foreground")}>
          {selected !== undefined ? selected.label : placeholder}
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
                heading={perms[0]?.resourceLabel ?? "其他资源"}
              >
                {perms.map(p => (
                  <CommandItem
                    key={p.code}
                    value={`${p.label} ${p.resourceLabel} ${p.code} ${p.resourceCode}`}
                    onSelect={() => {
                      onChange(p.code);
                      setOpen(false);
                    }}
                  >
                    {p.label}
                    <Check className={cn("ml-auto", value === p.code ? "opacity-100" : "opacity-0")} />
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
