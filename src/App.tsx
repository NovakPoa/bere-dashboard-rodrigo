import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AppLayout from "./layouts/AppLayout";
import Home from "./pages/Home";
import Atividades from "./pages/Atividades";
import Alimentacao from "./pages/Alimentacao";
import Estudos from "./pages/Estudos";
import Todo from "./pages/Todo";
import Cultura from "./pages/Cultura";
import Calendario from "./pages/Calendario";
import Listas from "./pages/Listas";
import Habitos from "./pages/Habitos";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/financeira" element={<Index />} />
            <Route path="/atividades" element={<Atividades />} />
            <Route path="/alimentacao" element={<Alimentacao />} />
            <Route path="/estudos" element={<Estudos />} />
            <Route path="/todo" element={<Todo />} />
            <Route path="/cultura" element={<Cultura />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/listas" element={<Listas />} />
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
