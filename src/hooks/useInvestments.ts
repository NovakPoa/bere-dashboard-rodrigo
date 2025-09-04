import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Investment, Currency } from "@/types/investment";
import { fetchUSDToBRLRate } from "@/lib/currency";
import { toast } from "sonner";

interface InvestmentRecord {
  id: string;
  nome_investimento: string;
  tipo_investimento: string;
  corretora: string;
  moeda: string;
  preco_unitario_compra: number;
  preco_unitario_atual: number;
  quantidade: number;
  data_investimento: string;
  data_atualizacao_preco: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

// Conversão de dados com lógica corrigida

const convertToInvestment = (record: InvestmentRecord): Investment => {
  const valorTotalInvestido = record.preco_unitario_compra * record.quantidade;
  const valorAtualTotal = record.preco_unitario_atual * record.quantidade;
  const rentabilidadeAbsoluta = valorAtualTotal - valorTotalInvestido;
  const rentabilidadePercentual = valorTotalInvestido > 0 ? (rentabilidadeAbsoluta / valorTotalInvestido) * 100 : 0;

  return {
    id: record.id,
    nome_investimento: record.nome_investimento,
    tipo_investimento: record.tipo_investimento,
    corretora: record.corretora,
    moeda: (record.moeda as Currency) || "BRL",
    preco_unitario_compra: record.preco_unitario_compra,
    preco_unitario_atual: record.preco_unitario_atual,
    quantidade: record.quantidade,
    data_investimento: record.data_investimento,
    data_atualizacao_preco: record.data_atualizacao_preco,
    created_at: record.created_at,
    updated_at: record.updated_at,
    valor_total_investido: valorTotalInvestido,
    valor_atual_total: valorAtualTotal,
    rentabilidade_absoluta: rentabilidadeAbsoluta,
    rentabilidade_percentual: rentabilidadePercentual,
  };
};

const convertFromInvestment = (investment: Omit<Investment, "id" | "valor_total_investido" | "valor_atual_total" | "rentabilidade_absoluta" | "rentabilidade_percentual" | "created_at" | "updated_at" | "data_atualizacao_preco">) => {
  return {
    nome_investimento: investment.nome_investimento,
    tipo_investimento: investment.tipo_investimento,
    corretora: investment.corretora,
    moeda: investment.moeda,
    preco_unitario_compra: investment.preco_unitario_compra,
    preco_unitario_atual: investment.preco_unitario_atual,
    quantidade: investment.quantidade,
    data_investimento: investment.data_investimento,
    user_id: null, // Será definido pelo trigger
  };
};

// Hook para buscar cotação
export const useExchangeRate = () => {
  return useQuery({
    queryKey: ["exchange-rate"],
    queryFn: fetchUSDToBRLRate,
    staleTime: 60 * 60 * 1000, // 1 hora
    gcTime: 60 * 60 * 1000, // 1 hora
  });
};

// Hooks
export const useInvestments = () => {
  return useQuery({
    queryKey: ["investments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .order("data_investimento", { ascending: false });

      if (error) throw error;
      return data?.map(convertToInvestment) || [];
    },
  });
};

export const useAddInvestment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (investment: {
      nome_investimento: string;
      tipo_investimento: string;
      corretora: string;
      moeda: Currency;
      preco_unitario_compra: number;
      preco_unitario_atual: number;
      quantidade: number;
      data_investimento: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const investmentData = convertFromInvestment(investment);
      
      const { data, error } = await supabase
        .from("investments")
        .insert([{
          ...investmentData,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      toast.success("Investimento adicionado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao adicionar investimento:", error);
      toast.error("Erro ao adicionar investimento");
    },
  });
};

export const useUpdateInvestment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Investment> }) => {
      const { data, error } = await supabase
        .from("investments")
        .update({ 
          preco_unitario_atual: updates.preco_unitario_atual,
          data_atualizacao_preco: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      toast.success("Investimento atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar investimento:", error);
      toast.error("Erro ao atualizar investimento");
    },
  });
};

export const useRemoveInvestment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("investments")
        .delete()
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Nenhum registro encontrado para exclusão.");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      toast.success("Investimento removido com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao remover investimento:", error);
      const message = (error as any)?.message || "Erro ao remover investimento";
      toast.error(message);
    },
  });
};