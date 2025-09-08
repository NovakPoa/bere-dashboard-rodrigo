import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Standard category suggestions
export const EXPENSE_SUGGESTIONS = [
  "Restaurante",
  "Mercado",
  "Moradia",
  "Transporte",
  "Saúde",
  "Educação",
  "Trabalho",
  "Assinaturas",
  "Lazer",
  "Viagens",
  "Vestuário",
  "Família",
  "Impostos",
  "Doações & Presentes",
  "Outros"
];

export const INCOME_SUGGESTIONS = [
  "Salário",
  "Freelance",
  "Investimentos",
  "Vendas",
  "Aluguéis",
  "Prêmios",
  "Restituições",
  "Outros"
];

// Hook to get user's unique expense categories
export const useExpenseCategories = () => {
  return useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("financeiro")
        .select("categoria")
        .eq("user_id", user.id)
        .eq("tipo", "despesa")
        .not("categoria", "is", null);

      if (error) throw error;

      // Get unique categories and filter out nulls
      const unique = [...new Set(data.map(item => item.categoria).filter(Boolean))];
      return unique as string[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to get user's unique income categories
export const useIncomeCategories = () => {
  return useQuery({
    queryKey: ["income-categories"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("financeiro")
        .select("categoria")
        .eq("user_id", user.id)
        .eq("tipo", "ganho")
        .not("categoria", "is", null);

      if (error) throw error;

      // Get unique categories and filter out nulls
      const unique = [...new Set(data.map(item => item.categoria).filter(Boolean))];
      return unique as string[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};