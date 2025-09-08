import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InvestmentSnapshot } from "@/types/investment-snapshot";
import { Investment } from "@/types/investment";
import { convertToReais } from "@/lib/currency";

export const useInvestmentSnapshots = () => {
  return useQuery({
    queryKey: ["investment-snapshots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investment_monthly_snapshots")
        .select("*")
        .order("snapshot_date", { ascending: false });

      if (error) throw error;
      return data as InvestmentSnapshot[];
    },
  });
};

export const useCreateSnapshot = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      investment: Investment;
      snapshotDate: string;
      exchangeRate: number;
    }) => {
      const { investment, snapshotDate, exchangeRate } = data;
      
      const valorTotalBrl = convertToReais(
        investment.preco_unitario_atual * investment.quantidade, 
        investment.moeda, 
        exchangeRate
      );

      const snapshotData = {
        user_id: (await supabase.auth.getUser()).data.user?.id,
        investment_id: investment.id,
        snapshot_date: snapshotDate,
        preco_unitario: investment.preco_unitario_atual,
        quantidade: investment.quantidade,
        valor_total_brl: valorTotalBrl,
        cotacao_dolar: investment.moeda === "USD" ? exchangeRate : null,
      };

      const { data: result, error } = await supabase
        .from("investment_monthly_snapshots")
        .insert(snapshotData)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investment-snapshots"] });
      toast({
        title: "Snapshot criado",
        description: "Snapshot mensal criado com sucesso!",
      });
    },
    onError: (error) => {
      console.error("Erro ao criar snapshot:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar snapshot. Tente novamente.",
        variant: "destructive",
      });
    },
  });
};

export const useCreateBatchSnapshots = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      investments: Investment[];
      snapshotDate: string;
      exchangeRate: number;
    }) => {
      const { investments, snapshotDate, exchangeRate } = data;
      
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;

      const snapshotsData = investments.map(investment => {
        const valorTotalBrl = convertToReais(
          investment.preco_unitario_atual * investment.quantidade, 
          investment.moeda, 
          exchangeRate
        );

        return {
          user_id: userId,
          investment_id: investment.id,
          snapshot_date: snapshotDate,
          preco_unitario: investment.preco_unitario_atual,
          quantidade: investment.quantidade,
          valor_total_brl: valorTotalBrl,
          cotacao_dolar: investment.moeda === "USD" ? exchangeRate : null,
        };
      });

      const { data: result, error } = await supabase
        .from("investment_monthly_snapshots")
        .insert(snapshotsData)
        .select();

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["investment-snapshots"] });
      toast({
        title: "Snapshots criados",
        description: `${data.length} snapshots criados com sucesso!`,
      });
    },
    onError: (error) => {
      console.error("Erro ao criar snapshots:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar snapshots. Tente novamente.",
        variant: "destructive",
      });
    },
  });
};