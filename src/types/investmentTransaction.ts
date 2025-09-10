export type TransactionType = "BUY" | "SELL";

export interface InvestmentTransaction {
  id: string;
  user_id: string;
  investment_id: string;
  transaction_type: TransactionType;
  quantity: number;
  unit_price: number;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface InvestmentTransactionInput {
  investment_id: string;
  transaction_type: TransactionType;
  quantity: number;
  unit_price: number;
  transaction_date: string;
}