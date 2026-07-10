import { Link } from "@tanstack/react-router";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { useLogout } from "@/features/auth/hooks";
import { useSession } from "@/lib/auth-client";

interface NavBarProps {
  auth: { permissions?: string[] };
}

// 全局导航:导航项按 permissions 显示(前端 UX,后端 PermissionChecker 才是授权边界);
// 用户菜单显示登录态,登出走 useLogout(signOut + router.invalidate)。
export function NavBar({ auth }: NavBarProps) {
  const { data: session } = useSession();
  const { logout } = useLogout();

  return (
    <nav className="border-b">
      <div className="flex items-center justify-between p-4">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link className={navigationMenuTriggerStyle()} to="/dashboard">
                概览
              </Link>
            </NavigationMenuItem>
            {auth.permissions?.includes("iam.read") === true && (
              <NavigationMenuItem>
                <Link className={navigationMenuTriggerStyle()} to="/iam/roles">
                  角色
                </Link>
              </NavigationMenuItem>
            )}
            {auth.permissions?.includes("projects.read") === true && (
              <NavigationMenuItem>
                <Link className={navigationMenuTriggerStyle()} to="/projects">
                  项目
                </Link>
              </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>
        {session
          ? (
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Avatar>
                    <AvatarFallback>
                      {session.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>{session.user.name}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { void logout(); }}>
                    登出
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          : (
              <Button render={<Link to="/login" />}>登录</Button>
            )}
      </div>
    </nav>
  );
}
