export type InvestmentType = 
  | "acoes"
  | "fundos_imobiliarios" 
  | "renda_fixa"
  | "criptomoedas"
  | "fundos_investimento"
  | "tesouro_direto"
  | "cdb"
  | "lci_lca"
  | "debêntures"
  | "outros";

export type Broker = 
  | "xp"
  | "rico"
  | "inter"
  | "nubank"
  | "btg"
  | "itau"
  | "bradesco"
  | "santander"
  | "clear"
  | "avenue"
  | "c6"
  | "modalmais"
  | "easynvest"
  | "outros";

export interface Investment {
  id: string;
  nome_investimento: string;
  tipo_investimento: InvestmentType;
  corretora: Broker;
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