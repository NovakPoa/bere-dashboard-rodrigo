import type { Income, IncomeCategory, PaymentMethod } from "@/types/income";

// Date parsing
const parseDateOnly = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Category and Payment Method Synonyms for income parsing
const CATEGORY_SYNONYMS: Record<string, IncomeCategory> = {
  // Salário
  "salário": "Salário",
  "salario": "Salário", 
  "salary": "Salário",
  "ordenado": "Salário",
  "vencimento": "Salário",
  
  // Freelance
  "freelance": "Freelance",
  "free": "Freelance",
  "freela": "Freelance",
  "trabalho": "Freelance",
  "projeto": "Freelance",
  "consultoria": "Freelance",
  
  // Investimentos
  "investimento": "Investimentos",
  "investimentos": "Investimentos",
  "dividendos": "Investimentos",
  "renda": "Investimentos",
  "juros": "Investimentos",
  "rendimento": "Investimentos",
  
  // Vendas
  "venda": "Vendas",
  "vendas": "Vendas",
  "produto": "Vendas",
  "mercadoria": "Vendas",
  
  // Aluguéis
  "aluguel": "Aluguéis",
  "alugueis": "Aluguéis",
  "locação": "Aluguéis",
  "rent": "Aluguéis",
  
  // Prêmios
  "prêmio": "Prêmios",
  "premio": "Prêmios",
  "premiação": "Prêmios",
  "concurso": "Prêmios",
  "sorteio": "Prêmios",
  
  // Restituições
  "restituição": "Restituições",
  "restituicao": "Restituições",
  "devolução": "Restituições",
  "reembolso": "Restituições",
  "estorno": "Restituições",
  
  // Outros
  "outros": "Outros",
  "extra": "Outros",
  "bônus": "Outros",
  "bonus": "Outros"
};

const METHOD_SYNONYMS: Record<string, PaymentMethod> = {
  "pix": "pix",
  "transferência": "pix",
  "transferencia": "pix",
  "ted": "pix",
  "doc": "pix",
  
  "boleto": "boleto",
  "slip": "boleto",
  "bancário": "boleto",
  "bancario": "boleto",
  
  "cartão": "credit",
  "cartao": "credit",
  "crédito": "credit",
  "credito": "credit",
  "credit": "credit"
};

// Income message parsing
export const parseIncomeMessage = (message: string): Omit<Income, "id" | "date"> | null => {
  const lowerMessage = message.toLowerCase();
  
  // Extract amount using various patterns
  const amountPatterns = [
    /(?:r\$|rs|reais?)\s*(\d+(?:[.,]\d{2})?)/i,
    /(\d+(?:[.,]\d{2})?)\s*(?:r\$|rs|reais?)/i,
    /(\d+(?:[.,]\d{2})?)/
  ];
  
  let amount = 0;
  for (const pattern of amountPatterns) {
    const match = message.match(pattern);
    if (match) {
      amount = parseFloat(match[1].replace(',', '.'));
      break;
    }
  }
  
  if (amount <= 0) return null;
  
  // Find category
  let category: IncomeCategory = "Outros";
  for (const [synonym, cat] of Object.entries(CATEGORY_SYNONYMS)) {
    if (lowerMessage.includes(synonym)) {
      category = cat;
      break;
    }
  }
  
  // Find payment method
  let method: PaymentMethod = "pix";
  for (const [synonym, meth] of Object.entries(METHOD_SYNONYMS)) {
    if (lowerMessage.includes(synonym)) {
      method = meth;
      break;
    }
  }
  
  return {
    amount,
    category,
    method,
    source: "manual",
    note: message.trim()
  };
};

// Filtering utilities
export const filterIncomes = (
  incomes: Income[], 
  opts: { 
    category?: IncomeCategory[] | IncomeCategory | "all"; 
    method?: PaymentMethod[] | PaymentMethod | "all";
    description?: string;
  }
): Income[] => {
  return incomes.filter(income => {
    // Description filter
    if (opts.description && opts.description.trim()) {
      const searchTerm = opts.description.toLowerCase().trim();
      const note = income.note?.toLowerCase() || "";
      if (!note.includes(searchTerm)) {
        return false;
      }
    }

    // Category filter
    if (opts.category && opts.category !== "all") {
      const categories = Array.isArray(opts.category) ? opts.category : [opts.category];
      if (!categories.includes(income.category)) {
        return false;
      }
    }
    
    // Method filter
    if (opts.method && opts.method !== "all") {
      const methods = Array.isArray(opts.method) ? opts.method : [opts.method];
      if (!methods.includes(income.method)) {
        return false;
      }
    }
    
    return true;
  });
};

export const filterIncomesByDateRange = (
  incomes: Income[], 
  startDate?: Date, 
  endDate?: Date
): Income[] => {
  if (!startDate && !endDate) return incomes;
  
  return incomes.filter(income => {
    const incomeDate = parseDateOnly(income.date);
    
    if (startDate && incomeDate < startDate) return false;
    if (endDate && incomeDate > endDate) return false;
    
    return true;
  });
};

// Aggregation utilities
export const getMonthlyIncomeTotal = (incomes: Income[], date = new Date()): number => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  return incomes
    .filter(income => {
      const incomeDate = parseDateOnly(income.date);
      return incomeDate.getFullYear() === year && 
             incomeDate.getMonth() + 1 === month;
    })
    .reduce((sum, income) => sum + income.amount, 0);
};

export const groupByCategory = (incomes: Income[]): Record<IncomeCategory, number> => {
  const groups: Record<IncomeCategory, number> = {
    "Salário": 0,
    "Freelance": 0,
    "Investimentos": 0,
    "Vendas": 0,
    "Aluguéis": 0,
    "Prêmios": 0,
    "Restituições": 0,
    "Outros": 0
  };
  
  incomes.forEach(income => {
    groups[income.category] = (groups[income.category] || 0) + income.amount;
  });
  
  // Return only categories with values > 0
  return Object.fromEntries(
    Object.entries(groups).filter(([_, value]) => value > 0)
  ) as Record<IncomeCategory, number>;
};

export const groupByMethod = (incomes: Income[]): Record<PaymentMethod, number> => {
  const groups: Record<PaymentMethod, number> = {
    "pix": 0,
    "credit": 0,
    "boleto": 0
  };
  
  incomes.forEach(income => {
    groups[income.method] = (groups[income.method] || 0) + income.amount;
  });
  
  // Return only methods with values > 0
  return Object.fromEntries(
    Object.entries(groups).filter(([_, value]) => value > 0)
  ) as Record<PaymentMethod, number>;
};