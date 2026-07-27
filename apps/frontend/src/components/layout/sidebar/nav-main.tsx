import type { NavGroup } from "./nav-config";
import { Link, useMatchRoute } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

interface NavMainProps {
  groups: readonly NavGroup[];
  isCollapsed: boolean;
}

export function NavMain({ groups, isCollapsed }: NavMainProps) {
  const matchRoute = useMatchRoute();

  return (
    <>
      {groups.map((group) => {
        // 单项组:直接渲染叶子按钮,避免标题与唯一子项重复
        if (group.items.length === 1) {
          const item = group.items[0];
          return (
            <SidebarMenuItem key={item.to}>
              <SidebarMenuButton
                isActive={matchRoute({ to: item.to, fuzzy: true }) !== false}
                tooltip={item.title}
                render={<Link to={item.to} />}
              >
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        }

        const groupHasActive = group.items.some(
          item => matchRoute({ to: item.to, fuzzy: true }) !== false,
        );
        const GroupIcon = group.icon;

        // icon 折叠模式:SidebarMenuSub 被 sidebar.tsx 自动 hidden,用 DropdownMenu hover 展开让子项可达
        if (isCollapsed) {
          return (
            <DropdownMenu key={group.label}>
              <SidebarMenuItem>
                <DropdownMenuTrigger openOnHover delay={0} closeDelay={200} render={<SidebarMenuButton />}>
                  {GroupIcon && <GroupIcon />}
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="min-w-40">
                  {group.items.map(item => (
                    <DropdownMenuItem
                      key={item.to}
                      render={<Link to={item.to} />}
                      className={matchRoute({ to: item.to, fuzzy: true }) !== false ? "bg-accent text-accent-foreground" : undefined}
                    >
                      {item.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </SidebarMenuItem>
            </DropdownMenu>
          );
        }

        // 展开模式:Collapsible(官方 sidebar-07 nav-main 写法)
        return (
          <Collapsible
            key={group.label}
            defaultOpen={groupHasActive}
            className="group/collapsible"
            render={<SidebarMenuItem />}
          >
            <CollapsibleTrigger render={<SidebarMenuButton tooltip={group.label} />}>
              {GroupIcon && <GroupIcon />}
              <span>{group.label}</span>
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {group.items.map(item => (
                  <SidebarMenuSubItem key={item.to}>
                    <SidebarMenuSubButton
                      isActive={matchRoute({ to: item.to, fuzzy: true }) !== false}
                      render={<Link to={item.to} />}
                    >
                      <span>{item.title}</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </>
  );
}
