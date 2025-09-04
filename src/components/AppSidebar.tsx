import { NavLink, useLocation } from "react-router-dom";
import { Home, HeartPulse, Utensils, Film, Calendar, CheckCheck, Wallet, Notebook, User, Watch, TrendingUp } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

const items = [
  { title: "Organização", url: "/organizacao", icon: Notebook },
  { title: "Calendário", url: "/calendario", icon: Calendar },
  { title: "Hábitos", url: "/habitos", icon: CheckCheck },
  { title: "Despesas", url: "/financeira", icon: Wallet },
  { title: "Ganhos", url: "/ganhos", icon: TrendingUp },
  { title: "Atividade Física", url: "/atividades", icon: HeartPulse },
  { title: "Garmin", url: "/garmin", icon: Watch },
  { title: "Alimentação", url: "/alimentacao", icon: Utensils },
  { title: "Cultura", url: "/cultura", icon: Film },
  { title: "Visão Geral", url: "/app", icon: Home },
  { title: "Perfil", url: "/profile", icon: User },
];

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const isMobile = useIsMobile();

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50";

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end className={getNavCls} onClick={handleNavClick}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
