export type Currency = "BRL" | "USD";

export type InvestmentType = string;

export type Broker = string;

export interface Investment {
  id: string;
  nome_investimento: string;
  tipo_investimento: InvestmentType;
  corretora: Broker;
  moeda: Currency;
  valor_investido: number;
  preco_atual: number;
  quantidade: number;
  data_investimento: string;
  data_atualizacao_preco: string;
  created_at: string;
  updated_at: string;
  // Campos calculados
  valor_atual: number;
  rentabilidade_absoluta: number;
  rentabilidade_percentual: number;
}