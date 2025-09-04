import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Home, HeartPulse, Utensils, Film, Calendar, CheckCheck, Wallet, Notebook, User, Watch, TrendingUp, PieChart, ChevronDown, Heart } from "lucide-react";
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

const itemsBeforeFinance = [
  { title: "Organização", url: "/organizacao", icon: Notebook },
  { title: "Calendário", url: "/calendario", icon: Calendar },
  { title: "Hábitos", url: "/habitos", icon: CheckCheck },
];

const healthItems = [
  { title: "Visão Geral", url: "/saude", icon: Heart },
  { title: "Atividade Física", url: "/atividades", icon: HeartPulse },
  { title: "Alimentação", url: "/alimentacao", icon: Utensils },
  { title: "Garmin", url: "/garmin", icon: Watch },
];

const itemsAfterFinance = [
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
  const [isFinanceOpen, setIsFinanceOpen] = useState(false);
  const [isHealthOpen, setIsHealthOpen] = useState(false);

  const isActive = (path: string) => currentPath === path;
  const isFinanceActive = currentPath.startsWith("/financeiro");
  const isHealthActive = currentPath.startsWith("/saude") || currentPath.startsWith("/atividades") || currentPath.startsWith("/alimentacao") || currentPath.startsWith("/garmin");
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50";

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleFinanceToggle = () => {
    setIsFinanceOpen(!isFinanceOpen);
  };

  const handleHealthToggle = () => {
    setIsHealthOpen(!isHealthOpen);
  };

  // Auto-open finance group when navigating to finance subroutes
  useEffect(() => {
    const isFinanceSubroute = currentPath.startsWith("/financeiro/");
    if (isFinanceSubroute && !isFinanceOpen) {
      setIsFinanceOpen(true);
    }
  }, [currentPath, isFinanceOpen]);

  // Auto-open health group when navigating to health subroutes
  useEffect(() => {
    const isHealthSubroute = currentPath.startsWith("/atividades") || currentPath.startsWith("/alimentacao") || currentPath.startsWith("/garmin");
    if (isHealthSubroute && !isHealthOpen) {
      setIsHealthOpen(true);
    }
  }, [currentPath, isHealthOpen]);

  // Only use manual state for controlling the groups
  const shouldFinanceBeOpen = isFinanceOpen;
  const shouldHealthBeOpen = isHealthOpen;

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Items before Finance */}
              {itemsBeforeFinance.map((item) => (
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
              <Collapsible open={shouldFinanceBeOpen} onOpenChange={handleFinanceToggle} className="group/collapsible">
                <SidebarMenuItem>
                  <div className="flex">
                    <SidebarMenuButton asChild isActive={isFinanceActive} className="flex-1">
                      <NavLink to="/financeiro" className={getNavCls({ isActive: currentPath === "/financeiro" })} onClick={handleNavClick}>
                        <Wallet className="mr-2 h-4 w-4" />
                        {!collapsed && <span>Financeiro</span>}
                      </NavLink>
                    </SidebarMenuButton>
                    {!collapsed && (
                      <CollapsibleTrigger asChild>
                        <button className="p-2 hover:bg-muted/50 rounded-md">
                          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </button>
                      </CollapsibleTrigger>
                    )}
                  </div>
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

              {/* Saúde Collapsible Group */}
              <Collapsible open={shouldHealthBeOpen} onOpenChange={handleHealthToggle} className="group/collapsible">
                <SidebarMenuItem>
                  <div className="flex">
                    <SidebarMenuButton asChild isActive={isHealthActive} className="flex-1">
                      <NavLink to="/saude" className={getNavCls({ isActive: currentPath === "/saude" })} onClick={handleNavClick}>
                        <Heart className="mr-2 h-4 w-4" />
                        {!collapsed && <span>Saúde</span>}
                      </NavLink>
                    </SidebarMenuButton>
                    {!collapsed && (
                      <CollapsibleTrigger asChild>
                        <button className="p-2 hover:bg-muted/50 rounded-md">
                          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </button>
                      </CollapsibleTrigger>
                    )}
                  </div>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {healthItems.map((item) => (
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

              {/* Items after Finance */}
              {itemsAfterFinance.map((item) => (
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
