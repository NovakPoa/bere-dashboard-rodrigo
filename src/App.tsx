import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import React from "react";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AppLayout from "./layouts/AppLayout";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Atividades from "./pages/Atividades";
import Alimentacao from "./pages/Alimentacao";
import Cultura from "./pages/Cultura";
import Calendario from "./pages/Calendario";
import Habitos from "./pages/Habitos";
import Organizacao from "./pages/Organizacao";
import Organizacao2 from "./pages/Organizacao2";
import Organizacao3 from "./pages/Organizacao3";
import Organizacao4 from "./pages/Organizacao4";
import Organizacao5 from "./pages/Organizacao5";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

const RequireAuth = () => {
  const [ready, setReady] = React.useState(false);
  const [hasSession, setHasSession] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
      setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="flex items-center justify-center h-screen text-muted-foreground">Carregando…</div>;
  return hasSession ? <Outlet /> : <Navigate to="/auth" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Landing />} />
          <Route element={<AppLayout />}>
            <Route path="/app" element={<Home />} />
            <Route path="/financeira" element={<Index />} />
            <Route path="/atividades" element={<Atividades />} />
            <Route path="/alimentacao" element={<Alimentacao />} />
            <Route path="/cultura" element={<Cultura />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/organizacao" element={<Organizacao />} />
            <Route path="/organizacao/:id" element={<Organizacao />} />
            <Route path="/organizacao2" element={<Organizacao2 />} />
            <Route path="/organizacao3" element={<Organizacao3 />} />
            <Route path="/organizacao4" element={<Organizacao4 />} />
            <Route path="/organizacao5" element={<Organizacao5 />} />
            <Route path="/habitos" element={<Habitos />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={true} />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
