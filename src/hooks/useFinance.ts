import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { PaymentMethod, Category, Expense } from "@/types/expense";

interface FinanceRecord {
  id: number;
  valor: number;
  data: string;
  categoria: string;
  forma_pagamento: string;
  origem: string;
  user_id?: string;
  descricao?: string;
}

// Category normalization mapping
const normalizeCategory = (category: string): Category => {
  const normalized = category?.toLowerCase().trim() || "";
  
  // Map old categories to new ones
  const categoryMap: Record<string, Category> = {
    "alimentação": "Alimentação",
    "moradia": "Moradia", 
    "transporte": "Transporte",
    "combustível": "Transporte", // Map combustível to Transporte
    "saúde": "Saúde",
    "educação": "Educação",
    "trabalho": "Trabalho",
    "assinaturas": "Assinaturas",
    "lazer": "Lazer",
    "viagens": "Viagens",
    "vestuário": "Vestuário",
    "família": "Família",
    "impostos": "Impostos",
    "doações & presentes": "Doações & Presentes",
    "outros": "Outros"
  };
  
  return categoryMap[normalized] || "Outros";
};

// Payment method normalization mapping
const normalizePaymentMethod = (method: string): PaymentMethod => {
  const normalized = method?.toLowerCase().trim() || "";
  
  if (normalized.includes("pix")) return "pix";
  if (normalized.includes("boleto")) return "boleto";
  if (normalized.includes("credit") || normalized.includes("crédito") || 
      normalized.includes("credito") || normalized.includes("cartão") || 
      normalized.includes("cartao") || normalized === "cartão de crédito") {
    return "credit";
  }
  
  // Fallback para PIX se não conseguir identificar
  return "pix";
};

// Convert Supabase record to Expense type
const convertToExpense = (record: FinanceRecord): Expense => {
  console.log("Converting record:", record); // Debug log
  
  const expense = {
    id: record.id.toString(),
    amount: record.valor,
    category: normalizeCategory(record.categoria),
    method: normalizePaymentMethod(record.forma_pagamento),
    date: record.data,
    source: record.origem as "whatsapp" | "manual",
    note: record.descricao || undefined,
  };
  
  console.log("Converted expense:", expense); // Debug log
  return expense;
};

// Convert Expense to Supabase record format
const convertFromExpense = (expense: Omit<Expense, "id">) => ({
  valor: expense.amount,
  data: expense.date,
  categoria: expense.category,
  forma_pagamento: expense.method,
  origem: expense.source,
  descricao: expense.note || null,
  tipo: 'financeira',
  user_id: null, // Will be set by RLS automatically when inserting
});

export function useExpenses() {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financeiro")
        .select("*")
        .order("data", { ascending: false });

      if (error) throw error;
      
      return data.map(convertToExpense);
    },
  });
}

export function useAddExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (expense: Omit<Expense, "id" | "date"> & { date?: Date }) => {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Usuário não autenticado");
      }

      // Use provided date or current date
      const expenseDate = expense.date || new Date();
      const localDateStr = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}-${String(expenseDate.getDate()).padStart(2, '0')}`;

      const record = {
        ...convertFromExpense({
          ...expense,
          date: localDateStr,
        }),
        user_id: user.id, // Explicitly set user_id
      };

      const { data, error } = await supabase
        .from("financeiro")
        .insert([record])
        .select()
        .single();

      if (error) throw error;
      
      return convertToExpense(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({
        title: "Despesa adicionada",
        description: "Despesa foi salva com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Falha ao salvar despesa: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}

export function useRemoveExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financeiro")
        .delete()
        .eq("id", parseInt(id));

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({
        title: "Despesa removida",
        description: "Despesa foi removida com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Falha ao remover despesa: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}