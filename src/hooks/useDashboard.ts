import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, format } from "date-fns";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      // Calcular intervalo dos últimos 7 dias
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Segunda-feira
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Domingo
      
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(weekEnd, 'yyyy-MM-dd');

      // Buscar dados em paralelo
      const [alimentacaoResult, atividadeResult, habitosResult, financeiroResult] = await Promise.all([
        // Calorias consumidas (últimos 7 dias)
        supabase
          .from("alimentacao")
          .select("calorias_kcal")
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
          .gte("data", startDate)
          .lte("data", endDate),
        
        // Calorias gastas (últimos 7 dias)
        supabase
          .from("atividade_fisica")
          .select("calorias")
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
          .gte("data", startDate)
          .lte("data", endDate),
        
        // Hábitos (últimos 7 dias)
        supabase
          .from("habitos")
          .select("*")
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
          .gte("data", startDate)
          .lte("data", endDate),
        
        // Gastos por categoria (últimos 7 dias)
        supabase
          .from("financeiro")
          .select("valor, categoria")
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
          .gte("data", startDate)
          .lte("data", endDate)
      ]);

      // Processar dados
      const caloriasConsumidas = alimentacaoResult.data?.reduce((total, item) => 
        total + (Number(item.calorias_kcal) || 0), 0) || 0;
      
      const caloriasGastas = atividadeResult.data?.reduce((total, item) => 
        total + (Number(item.calorias) || 0), 0) || 0;
      
      // Calcular porcentagem de hábitos completados
      const habitosData = habitosResult.data || [];
      const totalHabitos = habitosData.length;
      const habitosCompletados = habitosData.filter(h => 
        h.quantidade_sessoes && h.quantidade_sessoes > 0).length;
      const percentualHabitos = totalHabitos > 0 ? Math.round((habitosCompletados / totalHabitos) * 100) : 0;
      
      // Agrupar gastos por categoria
      const gastosPorCategoria = (financeiroResult.data || []).reduce((acc: Record<string, number>, item) => {
        const categoria = item.categoria || 'Outros';
        acc[categoria] = (acc[categoria] || 0) + (Number(item.valor) || 0);
        return acc;
      }, {});

      return {
        caloriasConsumidas,
        caloriasGastas,
        percentualHabitos,
        gastosPorCategoria,
        periodoInicio: startDate,
        periodoFim: endDate
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useTopPriorityTodo() {
  return useQuery({
    queryKey: ["top-priority-todo"],
    queryFn: async () => {
      // Buscar primeira página de organização do usuário
      const { data: pages } = await supabase
        .from("org_pages")
        .select("id, title")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (!pages || pages.length === 0) {
        return "Crie sua primeira página de organização";
      }

      // Buscar blocos da página para encontrar todos
      const { data: blocks } = await supabase
        .from("org_blocks")
        .select("content, type")
        .eq("page_id", pages[0].id)
        .eq("type", "todo")
        .order("order_index", { ascending: true })
        .limit(1);

      if (!blocks || blocks.length === 0) {
        return `${pages[0].title} - Adicione alguns todos`;
      }

      return blocks[0].content || "Todo sem descrição";
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}