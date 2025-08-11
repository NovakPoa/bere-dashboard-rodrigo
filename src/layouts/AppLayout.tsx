import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <aside>
          <AppSidebar />
        </aside>
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-40 h-14 flex items-center border-b px-4 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            {/* Único trigger global */}
            <SidebarTrigger className="mr-2" />
            
          </header>
          <main className="flex-1 p-6 md:p-8 container">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
