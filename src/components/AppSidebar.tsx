import { NavLink, useLocation } from "react-router-dom";
import { Home, HeartPulse, Utensils, Film, Calendar, CheckCheck, Wallet, Notebook, User, Watch, TrendingUp, PieChart, ChevronDown } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";

const items = [
  { title: "Organização", url: "/organizacao", icon: Notebook },
  { title: "Calendário", url: "/calendario", icon: Calendar },
  { title: "Hábitos", url: "/habitos", icon: CheckCheck },
  { title: "Atividade Física", url: "/atividades", icon: HeartPulse },
  { title: "Garmin", url: "/garmin", icon: Watch },
  { title: "Alimentação", url: "/alimentacao", icon: Utensils },
  { title: "Cultura", url: "/cultura", icon: Film },
  { title: "Visão Geral", url: "/app", icon: Home },
  { title: "Perfil", url: "/profile", icon: User },
];

const financeItems = [
  { title: "Despesas", url: "/financeiro/despesas", icon: Wallet },
  { title: "Ganhos", url: "/financeiro/ganhos", icon: TrendingUp },
  { title: "Investimentos", url: "/financeiro/investimentos", icon: PieChart },
];

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const isMobile = useIsMobile();

  const isActive = (path: string) => currentPath === path;
  const isFinanceActive = currentPath.startsWith("/financeiro");
  const isFinanceGroupOpen = isFinanceActive;
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
              
              {/* Financeiro Collapsible Group */}
              <Collapsible open={isFinanceGroupOpen} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton asChild isActive={isFinanceActive}>
                      <NavLink to="/financeiro" className={getNavCls({ isActive: isFinanceActive })} onClick={handleNavClick}>
                        <Wallet className="mr-2 h-4 w-4" />
                        {!collapsed && (
                          <>
                            <span>Financeiro</span>
                            <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                          </>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {financeItems.map((item) => (
                        <SidebarMenuSubItem key={item.url}>
                          <SidebarMenuSubButton asChild isActive={isActive(item.url)}>
                            <NavLink to={item.url} end className={getNavCls} onClick={handleNavClick}>
                              <item.icon className="mr-2 h-3 w-3" />
                              <span>{item.title}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
