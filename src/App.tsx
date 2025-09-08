import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import React from "react";

// Component to handle recovery redirects
const RecoveryRedirector = () => {
  React.useEffect(() => {
    console.log('[RecoveryRedirector] useEffect triggered', { path: window.location.pathname, hash: window.location.hash });
    const hash = window.location.hash;

    // 1) Redirecionar para /auth se há recovery token ou erro na hash
    if ((hash.includes('type=recovery') || hash.includes('error=')) && window.location.pathname !== '/auth') {
      console.log('[RecoveryRedirector] Redirecting to /auth with hash params');
      window.location.replace(`/auth${hash}`);
      return; // evita processar abaixo neste ciclo
    } else if (hash.includes('type=recovery') || hash.includes('error=')) {
      console.log('[RecoveryRedirector] Already on /auth with hash params');
    }

    // 2) Listener global para PASSWORD_RECOVERY (quando Supabase já consumiu a hash)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[RecoveryRedirector] PASSWORD_RECOVERY detected, redirecting to /auth?recovery=1');
        if (window.location.pathname !== '/auth') {
          window.location.replace('/auth?recovery=1');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);
  return null;
};
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
import { HabitDetailsPage } from "./components/habits/HabitDetailsPage";
import Organizacao from "./pages/Organizacao";
import Profile from "./pages/Profile";
import Garmin from "./pages/Garmin";
import Ganhos from "./pages/Ganhos";
import Investimentos from "./pages/Investimentos";
import InvestmentPriceHistory from "./pages/InvestmentPriceHistory";
import Financeiro from "./pages/Financeiro";
import Saude from "./pages/Saude";

import Auth from "./pages/Auth";


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
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <RecoveryRedirector />
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<Landing />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/app" element={<Home />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/financeiro/despesas" element={<Index />} />
            <Route path="/financeiro/ganhos" element={<Ganhos />} />
            <Route path="/financeiro/investimentos" element={<Investimentos />} />
            <Route path="/financeiro/investimentos/:investmentId/historico-precos" element={<InvestmentPriceHistory />} />
            <Route path="/atividades" element={<Atividades />} />
            <Route path="/alimentacao" element={<Alimentacao />} />
            <Route path="/saude" element={<Saude />} />
            <Route path="/cultura" element={<Cultura />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/organizacao" element={<Organizacao />} />
            <Route path="/organizacao/:id" element={<Organizacao />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/habitos" element={<Habitos />} />
            <Route path="/habitos/:habitId" element={<HabitDetailsPage />} />
            <Route path="/garmin" element={<Garmin />} />
          </Route>
        </Route>
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
    <ReactQueryDevtools initialIsOpen={true} />
  </TooltipProvider>
);

export default App;
