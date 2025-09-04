import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Investment, InvestmentType, Broker, Currency } from "@/types/investment";
import { toast } from "sonner";

interface InvestmentRecord {
  id: string;
  nome_investimento: string;
  tipo_investimento: string;
  corretora: string;
  moeda: string;
  valor_investido: number;
  preco_atual: number;
  quantidade: number;
  data_investimento: string;
  data_atualizacao_preco: string;
  created_at: string;
  updated_at: string;
}

// Normalização de tipos
const normalizeInvestmentType = (type: string): InvestmentType => {
  const typeMap: Record<string, InvestmentType> = {
    "ações": "acoes",
    "acoes": "acoes",
    "acao": "acoes",
    "fundos imobiliários": "fundos_imobiliarios",
    "fundos_imobiliarios": "fundos_imobiliarios",
    "fii": "fundos_imobiliarios",
    "renda fixa": "renda_fixa",
    "renda_fixa": "renda_fixa",
    "criptomoedas": "criptomoedas",
    "crypto": "criptomoedas",
    "fundos de investimento": "fundos_investimento",
    "fundos_investimento": "fundos_investimento",
    "tesouro direto": "tesouro_direto",
    "tesouro_direto": "tesouro_direto",
    "cdb": "cdb",
    "lci/lca": "lci_lca",
    "lci_lca": "lci_lca",
    "debentures": "debêntures",
    "debêntures": "debêntures",
  };
  
  return typeMap[type.toLowerCase()] || "outros";
};

const normalizeBroker = (broker: string): Broker => {
  const brokerMap: Record<string, Broker> = {
    "xp": "xp",
    "rico": "rico",
    "inter": "inter",
    "nubank": "nubank",
    "btg": "btg",
    "itaú": "itau",
    "itau": "itau",
    "bradesco": "bradesco",
    "santander": "santander",
    "clear": "clear",
    "avenue": "avenue",
    "c6": "c6",
    "modal": "modalmais",
    "modal mais": "modalmais",
    "easynvest": "easynvest",
  };
  
  return brokerMap[broker.toLowerCase()] || "outros";
};

// Conversão de dados
const convertToInvestment = (record: InvestmentRecord): Investment => {
  const valor_atual = record.quantidade * record.preco_atual;
  const rentabilidade_absoluta = valor_atual - record.valor_investido;
  const rentabilidade_percentual = ((valor_atual - record.valor_investido) / record.valor_investido) * 100;

  return {
    id: record.id,
    nome_investimento: record.nome_investimento,
    tipo_investimento: normalizeInvestmentType(record.tipo_investimento),
    corretora: normalizeBroker(record.corretora),
    moeda: (record.moeda as Currency) || "BRL",
    valor_investido: record.valor_investido,
    preco_atual: record.preco_atual,
    quantidade: record.quantidade,
    data_investimento: record.data_investimento,
    data_atualizacao_preco: record.data_atualizacao_preco,
    created_at: record.created_at,
    updated_at: record.updated_at,
    valor_atual,
    rentabilidade_absoluta,
    rentabilidade_percentual,
  };
};

const convertFromInvestment = (investment: Omit<Investment, "id" | "valor_atual" | "rentabilidade_absoluta" | "rentabilidade_percentual" | "created_at" | "updated_at" | "data_atualizacao_preco">) => {
  return {
    nome_investimento: investment.nome_investimento,
    tipo_investimento: investment.tipo_investimento,
    corretora: investment.corretora,
    moeda: investment.moeda,
    valor_investido: investment.valor_investido,
    preco_atual: investment.preco_atual,
    quantidade: investment.quantidade,
    data_investimento: investment.data_investimento,
    user_id: null, // Será definido pelo trigger
  };
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
      tipo_investimento: InvestmentType;
      corretora: Broker;
      moeda: Currency;
      valor_investido: number;
      preco_atual: number;
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
          ...updates,
          data_atualizacao_preco: new Date().toISOString(),
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
      const { error } = await supabase
        .from("investments")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      toast.success("Investimento removido com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao remover investimento:", error);
      toast.error("Erro ao remover investimento");
    },
  });
};