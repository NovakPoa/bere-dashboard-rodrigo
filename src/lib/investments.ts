import { Investment, Currency } from "@/types/investment";
import { convertToReais } from "@/lib/currency";
import { parseDateFromDatabase } from "@/lib/utils";

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
    name?: string[] | string | "all";
    type?: string[] | string | "all";
    broker?: string[] | string | "all";
  }
): Investment[] => {
  let filtered = investments;

  // Filtro por nome
  if (filters.name && filters.name !== "all") {
    const names = Array.isArray(filters.name) ? filters.name : [filters.name];
    filtered = filtered.filter((investment) => 
      names.some(name => 
        investment.nome_investimento.toLowerCase().includes(name.toLowerCase())
      )
    );
  }

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
    const investmentDate = parseDateFromDatabase(investment.data_investimento);
    
    if (startDate && investmentDate < startDate) return false;
    if (endDate && investmentDate > endDate) return false;
    
    return true;
  });
};

// Cálculos de portfolio com lógica corrigida
export const getPortfolioTotals = (investments: Investment[], cotacaoDolar: number = 5.0) => {
  const totalInvestido = investments.reduce((sum, inv) => {
    const valorEmReais = convertToReais(inv.valor_total_investido, inv.moeda, cotacaoDolar);
    return sum + valorEmReais;
  }, 0);

  const valorAtual = investments.reduce((sum, inv) => {
    const valorEmReais = convertToReais(inv.valor_atual_total, inv.moeda, cotacaoDolar);
    return sum + valorEmReais;
  }, 0);

  const rentabilidadeAbsoluta = valorAtual - totalInvestido;
  const rentabilidadePercentual = totalInvestido > 0 ? (rentabilidadeAbsoluta / totalInvestido) * 100 : 0;

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
  return investments.reduce((acc, investment) => {
    const valorEmReais = convertToReais(investment.valor_atual_total, investment.moeda, cotacaoDolar);
    acc[investment.tipo_investimento] = (acc[investment.tipo_investimento] || 0) + valorEmReais;
    return acc;
  }, {} as Record<string, number>);
};

export const groupByBroker = (investments: Investment[], cotacaoDolar: number = 5.0): Record<string, number> => {
  return investments.reduce((acc, investment) => {
    const valorEmReais = convertToReais(investment.valor_atual_total, investment.moeda, cotacaoDolar);
    acc[investment.corretora] = (acc[investment.corretora] || 0) + valorEmReais;
    return acc;
  }, {} as Record<string, number>);
};

export const groupByCurrency = (investments: Investment[], cotacaoDolar: number = 5.0): Record<Currency, number> => {
  return investments.reduce((acc, investment) => {
    const valorEmReais = convertToReais(investment.valor_atual_total, investment.moeda, cotacaoDolar);
    acc[investment.moeda] = (acc[investment.moeda] || 0) + valorEmReais;
    return acc;
  }, {} as Record<Currency, number>);
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

// Geração de dados para gráfico de rentabilidade temporal
export const generateRentabilityData = (
  investments: Investment[],
  period: "7days" | "month" | "year"
) => {
  const now = new Date();
  const startDate = new Date();

  // Definir período
  switch (period) {
    case "7days":
      startDate.setDate(now.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(now.getMonth() - 1);
      break;
    case "year":
      startDate.setFullYear(now.getFullYear() - 1);
      break;
  }

  // Gerar pontos de data
  const dataPoints: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= now) {
    dataPoints.push(new Date(current));
    
    if (period === "7days") {
      current.setDate(current.getDate() + 1);
    } else if (period === "month") {
      current.setDate(current.getDate() + 2);
    } else {
      current.setDate(current.getDate() + 7);
    }
  }

  // Se não incluir hoje, adicionar
  if (dataPoints[dataPoints.length - 1].getTime() !== now.getTime()) {
    dataPoints.push(new Date(now));
  }

  return dataPoints.map((date) => {
    const formattedDate = date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      ...(period === "year" && { year: "2-digit" }),
    });

    const dataPoint: any = { date: formattedDate };

    investments.forEach((investment) => {
      const investmentDate = parseDateFromDatabase(investment.data_investimento);
      const updateDate = parseDateFromDatabase(investment.data_atualizacao_preco);

      // Se a data é anterior ao investimento, rentabilidade é null
      if (date < investmentDate) {
        dataPoint[investment.id] = null;
        return;
      }

      // Se a data é igual ou posterior à data de investimento
      let profitability: number;

      if (date >= updateDate) {
        // Usar rentabilidade atual
        profitability = investment.rentabilidade_absoluta;
      } else {
        // Interpolar linearmente entre data de investimento (0) e data de atualização (atual)
        const totalDays = (updateDate.getTime() - investmentDate.getTime()) / (1000 * 60 * 60 * 24);
        const daysSinceInvestment = (date.getTime() - investmentDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (totalDays === 0) {
          profitability = 0;
        } else {
          const ratio = daysSinceInvestment / totalDays;
          profitability = investment.rentabilidade_absoluta * ratio;
        }
      }

      dataPoint[investment.id] = profitability;
    });

    return dataPoint;
  });
};