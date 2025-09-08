import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { InvestmentPrice } from "@/types/investmentPrice";

export const useInvestmentPrices = (investmentId: string | undefined) => {
  return useQuery({
    queryKey: ["investment_prices", investmentId],
    enabled: !!investmentId,
    queryFn: async (): Promise<InvestmentPrice[]> => {
      const { data, error } = await supabase
        .from("investment_prices")
        .select("*")
        .eq("investment_id", investmentId!)
        .order("price_date", { ascending: false });

      if (error) throw error;
      return (data as InvestmentPrice[]) ?? [];
    },
  });
};

export const useUpsertInvestmentPrice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { investmentId: string; price: number; priceDate: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;
      if (!user) throw new Error("Usuário não autenticado");

      // Upsert price history (unique by investmentId + priceDate)
      const { error: upsertErr } = await supabase
        .from("investment_prices")
        .upsert(
          [
            {
              investment_id: payload.investmentId,
              price: payload.price,
              price_date: payload.priceDate,
              user_id: user.id,
            },
          ],
          { onConflict: "investment_id,price_date" }
        );
      if (upsertErr) throw upsertErr;

      // Update investment with the most recent price from history
      const { data: latestPrice, error: latestPriceErr } = await supabase
        .from("investment_prices")
        .select("price, price_date")
        .eq("investment_id", payload.investmentId)
        .order("price_date", { ascending: false })
        .limit(1)
        .single();

      if (!latestPriceErr && latestPrice) {
        const { error: updateErr } = await supabase
          .from("investments")
          .update({
            preco_unitario_atual: latestPrice.price,
            data_atualizacao_preco: new Date().toISOString()
          })
          .eq("id", payload.investmentId);
        
        if (updateErr) throw updateErr;
      }

      return true;
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["investments"] }),
        qc.invalidateQueries({ queryKey: ["investment_prices", variables.investmentId] }),
      ]);
    },
  });
};

export const useDeleteInvestmentPrice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; investmentId: string }) => {
      const { error } = await supabase.from("investment_prices").delete().eq("id", payload.id);
      if (error) throw error;
      return payload.investmentId;
    },
    onSuccess: async (investmentId) => {
      await qc.invalidateQueries({ queryKey: ["investment_prices", investmentId] });
    },
  });
};
