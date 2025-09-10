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
  current_quantity?: number;
  average_purchase_price?: number;
  realized_profit_loss?: number;
  is_closed?: boolean;
}

// Conversão de dados com lógica corrigida

const convertToInvestment = (record: InvestmentRecord, baselinePrice?: number): Investment => {
  // Use baseline price if available, otherwise fallback to purchase price
  const actualBaselinePrice = baselinePrice ?? record.preco_unitario_compra;
  const valorTotalInvestido = actualBaselinePrice * record.quantidade;
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
    current_quantity: record.current_quantity || record.quantidade,
    average_purchase_price: record.average_purchase_price || record.preco_unitario_compra,
    realized_profit_loss: record.realized_profit_loss || 0,
    is_closed: record.is_closed || false,
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
    current_quantity: investment.current_quantity,
    average_purchase_price: investment.average_purchase_price,
    realized_profit_loss: investment.realized_profit_loss,
    is_closed: investment.is_closed,
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
      const { data: investments, error } = await supabase
        .from("investments")
        .select("*")
        .order("data_investimento", { ascending: false });

      if (error) throw error;
      if (!investments) return [];

      // Fetch baseline prices for all investments
      const investmentIds = investments.map(inv => inv.id);
      const { data: priceHistory } = await supabase
        .from("investment_prices")
        .select("investment_id, price, price_date")
        .in("investment_id", investmentIds)
        .order("price_date", { ascending: true });

      // Create map of baseline prices (earliest price for each investment)
      const baselinePrices = new Map<string, number>();
      
      if (priceHistory) {
        // Group by investment_id and get the earliest price for each
        const groupedHistory = priceHistory.reduce((acc, item) => {
          if (!acc[item.investment_id]) {
            acc[item.investment_id] = [];
          }
          acc[item.investment_id].push(item);
          return acc;
        }, {} as Record<string, typeof priceHistory>);

        Object.entries(groupedHistory).forEach(([investmentId, prices]) => {
          // Sort by date ascending to get earliest price
          const sortedPrices = prices.sort((a, b) => a.price_date.localeCompare(b.price_date));
          if (sortedPrices.length > 0) {
            baselinePrices.set(investmentId, Number(sortedPrices[0].price));
          }
        });
      }

      // Convert investments using baseline prices
      return investments.map(investment => 
        convertToInvestment(investment, baselinePrices.get(investment.id))
      );
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

      const investmentData = {
        nome_investimento: investment.nome_investimento,
        tipo_investimento: investment.tipo_investimento,
        corretora: investment.corretora,
        moeda: investment.moeda,
        preco_unitario_compra: investment.preco_unitario_compra,
        preco_unitario_atual: investment.preco_unitario_atual,
        quantidade: investment.quantidade,
        data_investimento: investment.data_investimento,
        current_quantity: investment.quantidade,
        average_purchase_price: investment.preco_unitario_compra,
        realized_profit_loss: 0,
        is_closed: false,
        user_id: user.id,
      };
      
      const { data, error } = await supabase
        .from("investments")
        .insert([investmentData])
        .select()
        .single();

      if (error) throw error;

      // Create initial price history record
      const { error: priceHistoryError } = await supabase
        .from("investment_prices")
        .insert([{
          investment_id: data.id,
          price: investment.preco_unitario_compra,
          price_date: investment.data_investimento,
          user_id: user.id,
        }]);

      if (priceHistoryError) {
        console.warn("Failed to create initial price history:", priceHistoryError);
      }

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
    mutationFn: async ({ id, updates }: { id: string; updates: { preco_unitario_atual?: number; data_atualizacao_preco?: string } }) => {
      const updateData: any = {};
      
      if (updates.preco_unitario_atual !== undefined) {
        updateData.preco_unitario_atual = updates.preco_unitario_atual;
      }
      
      if (updates.data_atualizacao_preco !== undefined) {
        updateData.data_atualizacao_preco = updates.data_atualizacao_preco;
      } else {
        updateData.data_atualizacao_preco = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("investments")
        .update(updateData)
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

export const useEditInvestment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (investment: Omit<Investment, 'valor_total_investido' | 'valor_atual_total' | 'rentabilidade_absoluta' | 'rentabilidade_percentual' | 'created_at' | 'updated_at' | 'data_atualizacao_preco'>) => {
      const { data, error } = await supabase
        .from("investments")
        .update({
          nome_investimento: investment.nome_investimento,
          tipo_investimento: investment.tipo_investimento,
          corretora: investment.corretora,
          moeda: investment.moeda,
          preco_unitario_compra: investment.preco_unitario_compra,
          quantidade: investment.quantidade,
          data_investimento: investment.data_investimento,
          current_quantity: investment.current_quantity,
          average_purchase_price: investment.average_purchase_price,
          realized_profit_loss: investment.realized_profit_loss,
          is_closed: investment.is_closed,
        })
        .eq("id", investment.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      toast.success("Investimento editado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao editar investimento:", error);
      toast.error("Erro ao editar investimento");
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