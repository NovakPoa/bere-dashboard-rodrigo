import { Investment, Currency } from "@/types/investment";
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
    type?: string[] | string | "all";
    broker?: string[] | string | "all";
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
export const groupByType = (investments: Investment[], cotacaoDolar: number = 5.0): Record<string, number> => {
  const groups: Record<string, number> = {};

  investments.forEach((investment) => {
    const tipo = investment.tipo_investimento || "Outros";
    if (!groups[tipo]) {
      groups[tipo] = 0;
    }
    groups[tipo] += convertToReais(investment.valor_atual, investment.moeda, cotacaoDolar);
  });

  return groups;
};

// Agrupamento por corretora
export const groupByBroker = (investments: Investment[], cotacaoDolar: number = 5.0): Record<string, number> => {
  const groups: Record<string, number> = {};

  investments.forEach((investment) => {
    const corretora = investment.corretora || "Outras";
    if (!groups[corretora]) {
      groups[corretora] = 0;
    }
    groups[corretora] += convertToReais(investment.valor_atual, investment.moeda, cotacaoDolar);
  });

  return groups;
};

// Agrupamento por moeda
export const groupByCurrency = (investments: Investment[], cotacaoDolar: number = 5.0): Record<Currency, number> => {
  const groups: Record<Currency, number> = {
    BRL: 0,
    USD: 0,
  };

  investments.forEach((investment) => {
    const valorEmReais = convertToReais(investment.valor_atual, investment.moeda, cotacaoDolar);
    groups[investment.moeda] += valorEmReais;
  });

  return groups;
};

// Função helper para formatação de labels
export const formatLabel = (text: string): string => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  BRL: "Real (R$)",
  USD: "Dólar (US$)",
};