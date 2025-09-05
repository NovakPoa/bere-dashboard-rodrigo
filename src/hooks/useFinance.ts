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
  installments_total?: number;
  installment_number?: number;
  original_expense_id?: number;
  is_installment?: boolean;
}

// Category normalization mapping
const normalizeCategory = (category: string): Category => {
  const normalized = category?.toLowerCase().trim() || "";
  
  // Map old categories to new ones
  const categoryMap: Record<string, Category> = {
    "alimentação": "Restaurante",
    "alimentacao": "Restaurante", 
    "restaurante": "Restaurante",
    "comida": "Restaurante",
    "refeição": "Restaurante",
    "refeicao": "Restaurante",
    "mercado": "Mercado",
    "supermercado": "Mercado",
    "feira": "Mercado",
    "compras": "Mercado",
    "moradia": "Moradia", 
    "transporte": "Transporte",
    "combustível": "Transporte", // Map combustível to Transporte
    "combustivel": "Transporte",
    "saúde": "Saúde",
    "saude": "Saúde",
    "educação": "Educação",
    "educacao": "Educação",
    "trabalho": "Trabalho",
    "assinaturas": "Assinaturas",
    "lazer": "Lazer",
    "viagens": "Viagens",
    "vestuário": "Vestuário",
    "vestuario": "Vestuário",
    "família": "Família",
    "familia": "Família",
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
    installmentsTotal: record.installments_total || undefined,
    installmentNumber: record.installment_number || undefined,
    originalExpenseId: record.original_expense_id?.toString() || undefined,
    isInstallment: record.is_installment || undefined,
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
  installments_total: expense.installmentsTotal || null,
  installment_number: expense.installmentNumber || null,
  original_expense_id: expense.originalExpenseId ? parseInt(expense.originalExpenseId) : null,
  is_installment: expense.isInstallment || false,
});

export function useExpenses() {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financeiro")
        .select("*")
        .eq("tipo", "financeira")
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
    mutationFn: async (expense: Omit<Expense, "id" | "date"> & { date?: Date; installments?: number }) => {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Usuário não autenticado");
      }

      // Use provided date or current date
      const expenseDate = expense.date || new Date();
      const localDateStr = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}-${String(expenseDate.getDate()).padStart(2, '0')}`;

      const installments = expense.installments || 1;
      const isInstallmentPurchase = installments > 1 && expense.method === "credit";
      
      if (isInstallmentPurchase) {
        // Create installment expenses
        const installmentAmount = expense.amount / installments;
        const records = [];
        
        for (let i = 0; i < installments; i++) {
          const installmentDate = new Date(expenseDate);
          installmentDate.setMonth(installmentDate.getMonth() + i);
          const installmentDateStr = `${installmentDate.getFullYear()}-${String(installmentDate.getMonth() + 1).padStart(2, '0')}-${String(installmentDate.getDate()).padStart(2, '0')}`;
          
          const installmentExpense = {
            ...expense,
            amount: installmentAmount,
            date: installmentDateStr,
            installmentsTotal: installments,
            installmentNumber: i + 1,
            isInstallment: true,
          };
          
          const record = {
            ...convertFromExpense(installmentExpense),
            user_id: user.id,
          };
          
          records.push(record);
        }

        // Insert first installment to get the original_expense_id
        const { data: firstInstallment, error: firstError } = await supabase
          .from("financeiro")
          .insert([records[0]])
          .select()
          .single();

        if (firstError) throw firstError;

        // Update remaining records with original_expense_id and insert them
        if (records.length > 1) {
          const remainingRecords = records.slice(1).map(record => ({
            ...record,
            original_expense_id: firstInstallment.id,
          }));

          const { error: remainingError } = await supabase
            .from("financeiro")
            .insert(remainingRecords);

          if (remainingError) throw remainingError;

          // Update first installment with its own ID as original_expense_id
          const { error: updateError } = await supabase
            .from("financeiro")
            .update({ original_expense_id: firstInstallment.id })
            .eq("id", firstInstallment.id);

          if (updateError) throw updateError;
        }

        return convertToExpense(firstInstallment);
      } else {
        // Regular single expense
        const record = {
          ...convertFromExpense({
            ...expense,
            date: localDateStr,
          }),
          user_id: user.id,
        };

        const { data, error } = await supabase
          .from("financeiro")
          .insert([record])
          .select()
          .single();

        if (error) throw error;
        
        return convertToExpense(data);
      }
    },
    onSuccess: (newExpense) => {
      // Optimistic update: immediately add the new expense to the cache
      queryClient.setQueryData<Expense[]>(["expenses"], (oldData) => {
        if (!oldData) return [newExpense];
        return [newExpense, ...oldData];
      });
      
      // Then refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
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