import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { format } from "date-fns";
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

// Category normalization - now just cleans and capitalizes
const normalizeCategory = (category: string): Category => {
  if (!category || typeof category !== "string") return "Outros";
  
  // Clean and capitalize
  const cleaned = category.trim();
  if (!cleaned) return "Outros";
  
  // Capitalize first letter
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
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

  const amount = Number(record.valor ?? 0);
  const dateStr = typeof record.data === "string"
    ? record.data
    : new Date(record.data as unknown as string).toISOString().slice(0, 10);
  const source = record.origem === "whatsapp" ? "whatsapp" : "manual";

  const expense: Expense = {
    id: String(record.id),
    amount,
    category: normalizeCategory(record.categoria || ""),
    method: normalizePaymentMethod(record.forma_pagamento || ""),
    date: dateStr,
    source,
    note: record.descricao || undefined,
    installmentsTotal: record.installments_total ?? undefined,
    installmentNumber: record.installment_number ?? undefined,
    originalExpenseId: record.original_expense_id != null ? String(record.original_expense_id) : undefined,
    isInstallment: record.is_installment ?? undefined,
  };
  
  console.log("Converted expense:", expense); // Debug log
  return expense;
};

// Convert Expense to Supabase record format
const convertFromExpense = (expense: Omit<Expense, "id">) => ({
  valor: Number(expense.amount),
  data: typeof expense.date === "string" ? expense.date : new Date(expense.date as unknown as string).toISOString().slice(0, 10),
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
  const queryClient = useQueryClient();
  const query = useQuery({
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

  useEffect(() => {
    const channel = supabase
      .channel("public:financeiro")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "financeiro" },
        (payload) => {
          console.log("[Realtime] financeiro change:", payload);
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
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
      const localDateStr = format(expenseDate, "yyyy-MM-dd");

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
  
  // Ensure consistency and immediate UI update
  queryClient.invalidateQueries({ queryKey: ["expenses"] });
  queryClient.refetchQueries({ queryKey: ["expenses"], type: "active" });
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

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Expense> }) => {
      const updateData: any = {};
      
      if (updates.amount !== undefined) updateData.valor = updates.amount;
      if (updates.category !== undefined) updateData.categoria = updates.category;
      if (updates.method !== undefined) updateData.forma_pagamento = updates.method;
      if (updates.note !== undefined) updateData.descricao = updates.note;
      if (updates.date !== undefined) updateData.data = updates.date;

      const { data, error } = await supabase
        .from("financeiro")
        .update(updateData)
        .eq("id", parseInt(id))
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({
        title: "Despesa atualizada",
        description: "Despesa foi atualizada com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Falha ao atualizar despesa: ${error.message}`,
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