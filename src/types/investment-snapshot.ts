export interface InvestmentSnapshot {
  id: string;
  user_id: string;
  investment_id: string;
  snapshot_date: string;
  preco_unitario: number;
  quantidade: number;
  valor_total_brl: number;
  cotacao_dolar?: number;
  created_at: string;
  updated_at: string;
}