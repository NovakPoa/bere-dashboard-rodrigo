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
          <header className="h-12 flex items-center border-b px-2">
            {/* Único trigger global */}
            <SidebarTrigger className="mr-2" />
            
          </header>
          <main className="flex-1 p-4">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
