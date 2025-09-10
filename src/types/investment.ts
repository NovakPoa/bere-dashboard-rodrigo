export type Currency = "BRL" | "USD";

export type InvestmentType = string;

export type Broker = string;

export interface Investment {
  id: string;
  nome_investimento: string;
  tipo_investimento: InvestmentType;
  corretora: Broker;
  moeda: Currency;
  preco_unitario_compra: number;
  preco_unitario_atual: number;
  quantidade: number;
  data_investimento: string;
  data_atualizacao_preco: string;
  created_at: string;
  updated_at: string;
  // New fields for transaction tracking
  current_quantity: number;
  average_purchase_price: number;
  realized_profit_loss: number;
  is_closed: boolean;
  // Campos calculados
  valor_total_investido: number;
  valor_atual_total: number;
  rentabilidade_absoluta: number;
  rentabilidade_percentual: number;
}