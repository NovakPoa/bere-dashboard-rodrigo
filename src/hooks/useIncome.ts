import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Income, IncomeCategory, PaymentMethod } from "@/types/income";

// Interface for raw financial data from Supabase
interface FinanceRecord {
  id: number;
  user_id?: string;
  data?: string;
  valor?: number;
  categoria?: string;
  forma_pagamento?: string;
  descricao?: string;
  tipo?: string;
  origem?: string;
  texto?: string;
  wa_id?: string;
  ts?: string;
  installments_total?: number;
  installment_number?: number;
  original_expense_id?: number;
  is_installment?: boolean;
}

// Normalization functions
const normalizeCategory = (category: string): IncomeCategory => {
  const categoryMap: Record<string, IncomeCategory> = {
    "salario": "Salário",
    "salário": "Salário", 
    "salary": "Salário",
    "freelance": "Freelance",
    "free": "Freelance",
    "investimentos": "Investimentos",
    "investimento": "Investimentos",
    "investment": "Investimentos",
    "vendas": "Vendas",
    "venda": "Vendas",
    "sales": "Vendas",
    "alugueis": "Aluguéis",
    "aluguel": "Aluguéis",
    "rent": "Aluguéis",
    "premios": "Prêmios",
    "premio": "Prêmios",
    "prize": "Prêmios",
    "restituicoes": "Restituições",
    "restituicao": "Restituições",
    "refund": "Restituições",
    "outros": "Outros",
    "other": "Outros"
  };
  
  const normalized = categoryMap[category?.toLowerCase()] || "Outros";
  return normalized;
};

const normalizePaymentMethod = (method: string): PaymentMethod => {
  const methodMap: Record<string, PaymentMethod> = {
    "pix": "pix",
    "boleto": "boleto", 
    "credit": "credit",
    "credito": "credit",
    "crédito": "credit"
  };
  
  return methodMap[method?.toLowerCase()] || "pix";
};

// Conversion functions
const convertToIncome = (record: FinanceRecord): Income => {
  return {
    id: record.id.toString(),
    amount: record.valor || 0,
    category: normalizeCategory(record.categoria || ""),
    method: normalizePaymentMethod(record.forma_pagamento || ""),
    date: record.data || new Date().toISOString().split('T')[0],
    source: record.origem === "whatsapp" ? "whatsapp" : "manual",
    note: record.descricao || record.texto || "",
    installmentsTotal: record.installments_total || undefined,
    installmentNumber: record.installment_number || undefined,
    originalIncomeId: record.original_expense_id?.toString() || undefined,
    isInstallment: record.is_installment || false
  };
};

const convertFromIncome = (income: Omit<Income, "id">) => {
  return {
    valor: income.amount,
    categoria: income.category,
    forma_pagamento: income.method,
    data: income.date,
    descricao: income.note || "",
    tipo: "ganho", // This is the key difference from expenses
    origem: income.source,
    installments_total: income.installmentsTotal,
    installment_number: income.installmentNumber,
    original_expense_id: income.originalIncomeId ? parseInt(income.originalIncomeId) : undefined,
    is_installment: income.isInstallment
  };
};

// React Query hooks
export const useIncomes = () => {
  return useQuery({
    queryKey: ["incomes"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("financeiro")
        .select("*")
        .eq("tipo", "ganho")
        .order("data", { ascending: false });

      if (error) throw error;

      return (data || []).map(convertToIncome);
    },
  });
};

export const useAddIncome = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (income: Omit<Income, "id"> & { installments?: number }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error("User not authenticated");
      }

      const installments = income.installments || 1;
      const { installments: _, ...incomeData } = income;

      if (installments === 1) {
        // Single income entry
        const record = convertFromIncome(incomeData);
        const { data, error } = await supabase
          .from("financeiro")
          .insert(record)
          .select()
          .single();

        if (error) throw error;
        return convertToIncome(data);
      } else {
        // Multiple installments
        const installmentAmount = incomeData.amount / installments;
        const records = [];

        for (let i = 0; i < installments; i++) {
          const installmentDate = new Date(incomeData.date);
          installmentDate.setMonth(installmentDate.getMonth() + i);

          const installmentIncome: Omit<Income, "id"> = {
            ...incomeData,
            amount: installmentAmount,
            date: installmentDate.toISOString().split('T')[0],
            installmentsTotal: installments,
            installmentNumber: i + 1,
            isInstallment: true
          };

          records.push(convertFromIncome(installmentIncome));
        }

        const { data, error } = await supabase
          .from("financeiro")
          .insert(records)
          .select();

        if (error) throw error;

        // Set originalIncomeId for all installments after creation
        if (data && data.length > 0) {
          const originalId = data[0].id;
          await supabase
            .from("financeiro")
            .update({ original_expense_id: originalId })
            .in("id", data.map(record => record.id));
        }

        return data ? data.map(convertToIncome) : [];
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incomes"] });
      toast({
        title: "Ganho adicionado com sucesso!",
        description: "Seu ganho foi registrado.",
      });
    },
    onError: (error) => {
      console.error("Error adding income:", error);
      toast({
        title: "Erro ao adicionar ganho",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });
};

export const useRemoveIncome = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financeiro")
        .delete()
        .eq("id", parseInt(id));

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incomes"] });
      toast({
        title: "Ganho removido",
        description: "O ganho foi removido com sucesso.",
      });
    },
    onError: (error) => {
      console.error("Error removing income:", error);
      toast({
        title: "Erro ao remover ganho",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });
};