import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { InvestmentTransaction, InvestmentTransactionInput } from "@/types/investmentTransaction";
import { toast } from "sonner";

export const useInvestmentTransactions = (investmentId?: string) => {
  return useQuery({
    queryKey: ["investment-transactions", investmentId],
    queryFn: async () => {
      let query = supabase
        .from("investment_transactions")
        .select("*")
        .order("transaction_date", { ascending: false });

      if (investmentId) {
        query = query.eq("investment_id", investmentId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data as InvestmentTransaction[];
    },
    enabled: !!investmentId,
  });
};

export const useAddTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transaction: InvestmentTransactionInput) => {
      // Add the transaction
      const { data: transactionData, error: transactionError } = await supabase
        .from("investment_transactions")
        .insert([{
          ...transaction,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        }])
        .select()
        .single();

      if (transactionError) {
        throw transactionError;
      }

      // Recalculate investment position
      await recalculateInvestmentPosition(transaction.investment_id);

      return transactionData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      toast.success("Transação adicionada com sucesso!");
    },
    onError: (error) => {
      console.error("Error adding transaction:", error);
      toast.error("Erro ao adicionar transação");
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      // Get transaction details before deletion
      const { data: transaction, error: getError } = await supabase
        .from("investment_transactions")
        .select("investment_id")
        .eq("id", transactionId)
        .single();

      if (getError) {
        throw getError;
      }

      // Delete the transaction
      const { error: deleteError } = await supabase
        .from("investment_transactions")
        .delete()
        .eq("id", transactionId);

      if (deleteError) {
        throw deleteError;
      }

      // Recalculate investment position
      await recalculateInvestmentPosition(transaction.investment_id);

      return transactionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      toast.success("Transação removida com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting transaction:", error);
      toast.error("Erro ao remover transação");
    },
  });
};

// Helper function to recalculate investment position
async function recalculateInvestmentPosition(investmentId: string) {
  // Get all transactions for this investment
  const { data: transactions, error: transError } = await supabase
    .from("investment_transactions")
    .select("*")
    .eq("investment_id", investmentId)
    .order("transaction_date", { ascending: true });

  if (transError) {
    throw transError;
  }

  let currentQuantity = 0;
  let totalInvested = 0;
  let totalSoldValue = 0;
  let totalSoldQuantity = 0;
  let realizedProfitLoss = 0;

  // Calculate position using FIFO
  const buyTransactions: Array<{ quantity: number; price: number }> = [];
  
  for (const transaction of transactions) {
    if (transaction.transaction_type === "BUY") {
      currentQuantity += transaction.quantity;
      totalInvested += transaction.quantity * transaction.unit_price;
      buyTransactions.push({
        quantity: transaction.quantity,
        price: transaction.unit_price,
      });
    } else if (transaction.transaction_type === "SELL") {
      let remainingToSell = transaction.quantity;
      totalSoldQuantity += transaction.quantity;
      totalSoldValue += transaction.quantity * transaction.unit_price;
      
      // FIFO: Sell from earliest purchases first
      while (remainingToSell > 0 && buyTransactions.length > 0) {
        const oldestBuy = buyTransactions[0];
        const soldFromThisBuy = Math.min(remainingToSell, oldestBuy.quantity);
        
        // Calculate realized profit/loss for this portion
        realizedProfitLoss += soldFromThisBuy * (transaction.unit_price - oldestBuy.price);
        
        oldestBuy.quantity -= soldFromThisBuy;
        remainingToSell -= soldFromThisBuy;
        
        if (oldestBuy.quantity === 0) {
          buyTransactions.shift();
        }
      }
      
      currentQuantity -= transaction.quantity;
    }
  }

  // Calculate average purchase price of remaining shares
  let averagePurchasePrice = 0;
  if (currentQuantity > 0 && buyTransactions.length > 0) {
    const remainingValue = buyTransactions.reduce((sum, buy) => sum + (buy.quantity * buy.price), 0);
    averagePurchasePrice = remainingValue / currentQuantity;
  }

  // Update the investment record
  const { error: updateError } = await supabase
    .from("investments")
    .update({
      current_quantity: currentQuantity,
      average_purchase_price: averagePurchasePrice,
      realized_profit_loss: realizedProfitLoss,
      is_closed: currentQuantity === 0,
    })
    .eq("id", investmentId);

  if (updateError) {
    throw updateError;
  }
}