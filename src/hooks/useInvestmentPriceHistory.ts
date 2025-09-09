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

      // Get current investment data to compare dates
      const { data: investment, error: investmentErr } = await supabase
        .from("investments")
        .select("data_atualizacao_preco, data_investimento")
        .eq("id", payload.investmentId)
        .single();

      if (investmentErr) throw investmentErr;

      // Get the most recent price from history
      const { data: latestPrice, error: latestPriceErr } = await supabase
        .from("investment_prices")
        .select("price, price_date")
        .eq("investment_id", payload.investmentId)
        .order("price_date", { ascending: false })
        .limit(1)
        .single();

      // Only update investment's current price if the historical price is newer
      if (!latestPriceErr && latestPrice && investment) {
        const latestPriceDate = new Date(`${latestPrice.price_date}T00:00:00`);
        
        // Use data_investimento as fallback if data_atualizacao_preco is null
        const currentUpdateRaw = investment.data_atualizacao_preco as unknown as string | null;
        const fallbackDate = investment.data_investimento as unknown as string;
        const parsedCurrent = currentUpdateRaw ? new Date(currentUpdateRaw) : new Date(`${fallbackDate}T00:00:00`);
        const currentUpdateDate = isNaN(parsedCurrent.getTime()) ? new Date(`${fallbackDate}T00:00:00`) : parsedCurrent;
        
        // Only update if the latest price date is strictly newer than current update date
        if (latestPriceDate > currentUpdateDate) {
          const { error: updateErr } = await supabase
            .from("investments")
            .update({
              preco_unitario_atual: latestPrice.price,
              data_atualizacao_preco: new Date(`${latestPrice.price_date}T00:00:00`).toISOString()
            })
            .eq("id", payload.investmentId);
          
          if (updateErr) throw updateErr;
        }
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

export const useInvestmentPricesByRange = (
  investmentIds: string[],
  startDate?: Date,
  endDate?: Date
) => {
  return useQuery({
    queryKey: ["investment_prices_range", investmentIds, startDate, endDate],
    enabled: investmentIds.length > 0 && !!startDate && !!endDate,
    queryFn: async (): Promise<InvestmentPrice[]> => {
      if (investmentIds.length === 0) return [];

      const startDateStr = startDate!.toISOString().split('T')[0];
      const endDateStr = endDate!.toISOString().split('T')[0];

      // Buscar preços dentro do intervalo
      const { data: rangeData, error: rangeError } = await supabase
        .from("investment_prices")
        .select("*")
        .in("investment_id", investmentIds)
        .gte("price_date", startDateStr)
        .lte("price_date", endDateStr)
        .order("price_date", { ascending: true });

      if (rangeError) throw rangeError;

      // Buscar últimos preços antes do startDate para cada investimento
      const baselinePrices: InvestmentPrice[] = [];
      for (const investmentId of investmentIds) {
        const { data: baselineData, error: baselineError } = await supabase
          .from("investment_prices")
          .select("*")
          .eq("investment_id", investmentId)
          .lt("price_date", startDateStr)
          .order("price_date", { ascending: false })
          .limit(1);

        if (baselineError) throw baselineError;
        if (baselineData && baselineData.length > 0) {
          baselinePrices.push(baselineData[0] as InvestmentPrice);
        }
      }

      // Combinar e deduplicar por investment_id + price_date
      const allPrices = [...baselinePrices, ...(rangeData || [])];
      const uniquePrices = allPrices.filter((price, index, array) => 
        array.findIndex(p => 
          p.investment_id === price.investment_id && 
          p.price_date === price.price_date
        ) === index
      );

      // Ordenar por price_date
      return uniquePrices.sort((a, b) => a.price_date.localeCompare(b.price_date));
    },
  });
};
