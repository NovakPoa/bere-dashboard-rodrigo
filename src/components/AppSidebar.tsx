import { NavLink, useLocation } from "react-router-dom";
import { Home, HeartPulse, Utensils, ClipboardList, Film, BookOpenCheck, Calendar, ListChecks, CheckCheck, Wallet } from "lucide-react";
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

const items = [
  { title: "Principal", url: "/", icon: Home },
  { title: "Financeira", url: "/financeira", icon: Wallet },
  { title: "Atividades Físicas", url: "/atividades", icon: HeartPulse },
  { title: "Alimentação", url: "/alimentacao", icon: Utensils },
  { title: "To‑do lists", url: "/todo", icon: ClipboardList },
  { title: "Cultura", url: "/cultura", icon: Film },
  { title: "Estudos", url: "/estudos", icon: BookOpenCheck },
  { title: "Calendário", url: "/calendario", icon: Calendar },
  { title: "Listas inteligentes", url: "/listas", icon: ListChecks },
  { title: "Hábitos", url: "/habitos", icon: CheckCheck },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50";

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
                    <NavLink to={item.url} end className={getNavCls}>
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
