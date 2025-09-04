import { Investment, InvestmentType, Broker, Currency } from "@/types/investment";
import { convertToReais } from "@/lib/currency";

export const currency = (amount: number, currencyType: Currency = "BRL"): string => {
  const locale = currencyType === "USD" ? "en-US" : "pt-BR";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyType,
  }).format(amount);
};

export const percentage = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
};

export const formatQuantity = (quantity: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(quantity);
};

// Filtragem de investimentos
export const filterInvestments = (
  investments: Investment[],
  filters: {
    type?: InvestmentType[] | InvestmentType | "all";
    broker?: Broker[] | Broker | "all";
  }
): Investment[] => {
  let filtered = investments;

  // Filtro por tipo
  if (filters.type && filters.type !== "all") {
    const types = Array.isArray(filters.type) ? filters.type : [filters.type];
    filtered = filtered.filter((investment) => types.includes(investment.tipo_investimento));
  }

  // Filtro por corretora
  if (filters.broker && filters.broker !== "all") {
    const brokers = Array.isArray(filters.broker) ? filters.broker : [filters.broker];
    filtered = filtered.filter((investment) => brokers.includes(investment.corretora));
  }

  return filtered;
};

// Filtro por período
export const filterInvestmentsByDateRange = (
  investments: Investment[],
  startDate?: Date,
  endDate?: Date
): Investment[] => {
  if (!startDate && !endDate) return investments;

  return investments.filter((investment) => {
    const investmentDate = new Date(investment.data_investimento);
    
    if (startDate && investmentDate < startDate) return false;
    if (endDate && investmentDate > endDate) return false;
    
    return true;
  });
};

// Cálculos de portfolio
export const getPortfolioTotals = (investments: Investment[], cotacaoDolar: number = 5.0) => {
  const totalInvestido = investments.reduce((sum, inv) => 
    sum + convertToReais(inv.valor_investido, inv.moeda, cotacaoDolar), 0
  );
  const valorAtual = investments.reduce((sum, inv) => 
    sum + convertToReais(inv.valor_atual, inv.moeda, cotacaoDolar), 0
  );
  const rentabilidadeAbsoluta = valorAtual - totalInvestido;
  const rentabilidadePercentual = totalInvestido > 0 ? ((valorAtual - totalInvestido) / totalInvestido) * 100 : 0;

  return {
    totalInvestido,
    valorAtual,
    rentabilidadeAbsoluta,
    rentabilidadePercentual,
    quantidadeInvestimentos: investments.length,
  };
};

// Agrupamento por tipo
export const groupByType = (investments: Investment[], cotacaoDolar: number = 5.0): Record<InvestmentType, number> => {
  const groups: Record<InvestmentType, number> = {
    acoes: 0,
    fundos_imobiliarios: 0,
    renda_fixa: 0,
    criptomoedas: 0,
    fundos_investimento: 0,
    tesouro_direto: 0,
    cdb: 0,
    lci_lca: 0,
    debêntures: 0,
    outros: 0,
  };

  investments.forEach((investment) => {
    groups[investment.tipo_investimento] += convertToReais(investment.valor_atual, investment.moeda, cotacaoDolar);
  });

  return groups;
};

// Agrupamento por corretora
export const groupByBroker = (investments: Investment[], cotacaoDolar: number = 5.0): Record<Broker, number> => {
  const groups: Record<Broker, number> = {
    xp: 0,
    rico: 0,
    inter: 0,
    nubank: 0,
    btg: 0,
    itau: 0,
    bradesco: 0,
    santander: 0,
    clear: 0,
    avenue: 0,
    c6: 0,
    modalmais: 0,
    easynvest: 0,
    outros: 0,
  };

  investments.forEach((investment) => {
    groups[investment.corretora] += convertToReais(investment.valor_atual, investment.moeda, cotacaoDolar);
  });

  return groups;
};

// Labels para exibição
export const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  acoes: "Ações",
  fundos_imobiliarios: "Fundos Imobiliários",
  renda_fixa: "Renda Fixa",
  criptomoedas: "Criptomoedas",
  fundos_investimento: "Fundos de Investimento",
  tesouro_direto: "Tesouro Direto",
  cdb: "CDB",
  lci_lca: "LCI/LCA",
  debêntures: "Debêntures",
  outros: "Outros",
};

export const BROKER_LABELS: Record<Broker, string> = {
  xp: "XP Investimentos",
  rico: "Rico",
  inter: "Inter",
  nubank: "Nubank",
  btg: "BTG Pactual",
  itau: "Itaú",
  bradesco: "Bradesco",
  santander: "Santander",
  clear: "Clear",
  avenue: "Avenue",
  c6: "C6 Bank",
  modalmais: "Modal Mais",
  easynvest: "Easynvest",
  outros: "Outros",
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  BRL: "Real (R$)",
  USD: "Dólar (US$)",
};