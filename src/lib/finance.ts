import { Expense, Category, PaymentMethod } from "@/types/expense";

const STORAGE_KEY = "finance_expenses_v1";

// Parse date string as local date without timezone shift
export function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0); // Set to noon to avoid DST issues
}

const CATEGORY_SYNONYMS: Record<string, string> = {
  // Restaurante / Food
  alimentacao: "Restaurante",
  "alimentação": "Restaurante",
  comida: "Restaurante",
  refeicao: "Restaurante",
  "refeição": "Restaurante",
  restaurante: "Restaurante",
  lanchonete: "Restaurante",
  fast: "Restaurante",
  food: "Restaurante",
  delivery: "Restaurante",
  pizza: "Restaurante",
  hamburguer: "Restaurante",
  "hambúrguer": "Restaurante",

  // Mercado / Groceries
  mercado: "Mercado",
  supermercado: "Mercado",
  supermarket: "Mercado",
  compras: "Mercado",
  feira: "Mercado",
  padaria: "Mercado",
  acougue: "Mercado",
  "açougue": "Mercado",
  hortifruti: "Mercado",
  atacadao: "Mercado",
  "atacadão": "Mercado",

  // Moradia / Housing
  casa: "Moradia",
  moradia: "Moradia",
  aluguel: "Moradia",
  renting: "Moradia",
  condominio: "Moradia",
  "condomínio": "Moradia",
  utilidades: "Moradia",
  conta: "Moradia",
  luz: "Moradia",
  energia: "Moradia",
  agua: "Moradia",
  "água": "Moradia",
  internet: "Moradia",
  telefone: "Moradia",

  // Transporte / Transport
  transporte: "Transporte",
  gas: "Transporte",
  gasolina: "Transporte",
  combustivel: "Transporte",
  "combustível": "Transporte",
  uber: "Transporte",
  taxi: "Transporte",

  // Saúde / Health
  saude: "Saúde",
  "saúde": "Saúde",
  farmacia: "Saúde",
  "farmácia": "Saúde",
  medico: "Saúde",
  "médico": "Saúde",

  // Educação / Education
  educacao: "Educação",
  "educação": "Educação",
  escola: "Educação",
  curso: "Educação",

  // Trabalho / Work
  trabalho: "Trabalho",
  office: "Trabalho",
  escritorio: "Trabalho",

  // Assinaturas / Subscriptions
  assinaturas: "Assinaturas",
  assinatura: "Assinaturas",
  streaming: "Assinaturas",
  netflix: "Assinaturas",
  spotify: "Assinaturas",

  // Lazer / Entertainment
  lazer: "Lazer",
  cinema: "Lazer",
  bar: "Lazer",
  show: "Lazer",

  // Viagens / Travel
  viagens: "Viagens",
  viagem: "Viagens",
  turismo: "Viagens",

  // Vestuário / Clothing
  vestuario: "Vestuário",
  "vestuário": "Vestuário",
  roupa: "Vestuário",
  roupas: "Vestuário",

  // Família / Family
  familia: "Família",
  "família": "Família",

  // Impostos / Taxes
  impostos: "Impostos",
  imposto: "Impostos",
  taxa: "Impostos",

  // Doações & Presentes / Gifts & Donations
  presentes: "Doações & Presentes",
  presente: "Doações & Presentes",
  gift: "Doações & Presentes",
  doacoes: "Doações & Presentes",
  "doações": "Doações & Presentes",
};

const METHOD_SYNONYMS: Record<string, PaymentMethod> = {
  pix: "pix",
  boleto: "boleto",
  credit: "credit",
  crédito: "credit",
  credito: "credit",
  cartao: "credit",
  cartão: "credit",
};

export function parseExpenseMessage(message: string): Omit<Expense, "id" | "date"> | null {
  if (!message) return null;
  const lower = message.toLowerCase();

  // amount: accept formats like "r$ 45,90" or "45.90"
  const currencyMatch = lower.match(/(?:r\$\s*)?(-?[0-9]+[\.,]?[0-9]{0,2})/i);
  const rawAmount = currencyMatch?.[1]?.replace(".", "").replace(",", ".");
  const amount = rawAmount ? parseFloat(rawAmount) : NaN;

  // method
  let method: PaymentMethod | undefined;
  let matchedMethodKey: string | undefined;
  for (const key of Object.keys(METHOD_SYNONYMS)) {
    if (lower.includes(key)) {
      method = METHOD_SYNONYMS[key];
      matchedMethodKey = key;
      break;
    }
  }

  // category from synonyms first
  let category: string | undefined;
  let matchedCategoryKey: string | undefined;
  for (const key of Object.keys(CATEGORY_SYNONYMS)) {
    if (lower.includes(key)) {
      category = CATEGORY_SYNONYMS[key];
      matchedCategoryKey = key;
      break;
    }
  }

  // fallback: any remaining words (custom category)
  if (!category) {
    let remaining = lower;
    if (currencyMatch?.[0]) remaining = remaining.replace(currencyMatch[0], " ");
    if (matchedMethodKey) remaining = remaining.replace(new RegExp(matchedMethodKey, "g"), " ");
    remaining = remaining.replace(/r\$/g, " ");
    const maybeCat = remaining.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
    if (maybeCat) {
      // Capitalize first letter for custom categories
      category = maybeCat.charAt(0).toUpperCase() + maybeCat.slice(1);
    }
  }

  if (!isFinite(amount) || amount <= 0 || !method || !category) {
    return null;
  }

  // Extract a cleaner description from the original message
  let description = message.trim();
  // Remove the amount part
  if (currencyMatch?.[0]) {
    description = description.replace(new RegExp(currencyMatch[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
  }
  // Remove the method part
  if (matchedMethodKey) {
    description = description.replace(new RegExp(matchedMethodKey, 'gi'), '');
  }
  // Remove the category part if it was matched from synonyms
  if (matchedCategoryKey) {
    description = description.replace(new RegExp(matchedCategoryKey, 'gi'), '');
  }
  // Clean up extra spaces and trim
  description = description.replace(/\s+/g, ' ').trim();

  return {
    amount,
    category,
    method,
    source: "whatsapp",
    note: description || message.trim(),
  };
}

export function getExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as any[];

    const mapOldToNew: Record<string, Category> = {
      // Migrar antigos "Alimentação" para "Restaurante"
      "alimentação": "Restaurante",
      alimentacao: "Restaurante",
      comida: "Restaurante",
      refeicao: "Restaurante",
      "refeição": "Restaurante",
      restaurante: "Restaurante",
      restaurant: "Restaurante",
      
      // Migrar mercado/supermercado para "Mercado"
      mercado: "Mercado",
      supermercado: "Mercado",
      supermarket: "Mercado",
      compras: "Mercado",
      feira: "Mercado",
      
      // Outras categorias mantidas
      gas: "Transporte",
      gasolina: "Transporte",
      combustivel: "Transporte",
      "combustível": "Transporte",
      renting: "Moradia",
      aluguel: "Moradia",
      rent: "Moradia",
      casa: "Moradia",
      presents: "Doações & Presentes",
      presentes: "Doações & Presentes",
      gift: "Doações & Presentes",
      assinaturas: "Assinaturas",
      assinatura: "Assinaturas",
      lazer: "Lazer",
      saude: "Saúde",
      "saúde": "Saúde",
      transporte: "Transporte",
      utilidades: "Moradia",
      outros: "Outros",
    };

    const normalized: Expense[] = (Array.isArray(parsed) ? parsed : []).map((e: any) => {
      const key = typeof e?.category === "string" ? e.category.toLowerCase() : "";
      const mapped = mapOldToNew[key];
      const finalCategory: Category = (mapped ?? (typeof e?.category === "string" && e.category.trim() ? (e.category as Category) : ("Outros" as Category))) as Category;
      return { ...e, category: finalCategory } as Expense;
    });

    return normalized;
  } catch {
    return [];
  }
}

export function saveExpenses(expenses: Expense[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

export function addExpense(expense: Omit<Expense, "id" | "date">) {
  const all = getExpenses();
  const withId: Expense = {
    ...expense,
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
  };
  all.unshift(withId);
  saveExpenses(all);
  return withId;
}

export function removeExpense(id: string) {
  const filtered = getExpenses().filter((e) => e.id !== id);
  saveExpenses(filtered);
  return filtered;
}

export function filterExpenses(
  expenses: Expense[],
  opts: { 
    category?: Category[] | Category | "all"; 
    method?: PaymentMethod[] | PaymentMethod | "all";
    description?: string;
  }
) {
  return expenses.filter((e) => {
    // Handle category filtering
    let okCat = true;
    if (opts.category && opts.category !== "all") {
      if (Array.isArray(opts.category)) {
        okCat = opts.category.length === 0 || opts.category.includes(e.category);
      } else {
        okCat = e.category === opts.category;
      }
    }

    // Handle method filtering  
    let okMet = true;
    if (opts.method && opts.method !== "all") {
      if (Array.isArray(opts.method)) {
        okMet = opts.method.length === 0 || opts.method.includes(e.method);
      } else {
        okMet = e.method === opts.method;
      }
    }

    // Handle description filtering
    let okDesc = true;
    if (opts.description && opts.description.trim()) {
      okDesc = e.note.toLowerCase().includes(opts.description.toLowerCase().trim());
    }

    return okCat && okMet && okDesc;
  });
}

export function filterExpensesByDateRange(
  expenses: Expense[],
  startDate?: Date,
  endDate?: Date
) {
  // Normalize boundaries to include the full selected days
  const start = startDate
    ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0)
    : undefined;
  const end = endDate
    ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999)
    : undefined;

  // Parse an expense date string (ISO or YYYY-MM-DD) as local date without TZ shifts
  const parseLocalDateOnly = (dateStr: string): Date => {
    const [y, m, d] = dateStr.split("T")[0].split("-").map((n) => Number(n));
    return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0); // noon to avoid DST issues
  };

  return expenses.filter((e) => {
    const expenseDate = parseLocalDateOnly(e.date);
    if (start && expenseDate < start) return false;
    if (end && expenseDate > end) return false;
    return true;
  });
}

export function getMonthlyTotal(expenses: Expense[], date = new Date()) {
  const month = date.getMonth();
  const year = date.getFullYear();
  return expenses
    .filter((e) => {
      const d = parseDateOnly(e.date);
      return d.getMonth() === month && d.getFullYear() === year;
    })
    .reduce((sum, e) => sum + e.amount, 0);
}

export function groupByCategory(expenses: Expense[]): Record<Category, number> {
  const result: Record<Category, number> = {} as Record<Category, number>;
  for (const e of expenses) {
    const key = (e.category as Category) || ("Outros" as Category);
    result[key] = (result[key] ?? 0) + e.amount;
  }
  return result;
}

export function groupByMethod(expenses: Expense[]): Record<PaymentMethod, number> {
  const base: Record<PaymentMethod, number> = { pix: 0, boleto: 0, credit: 0 };
  for (const e of expenses) base[e.method] += e.amount;
  
  // Filtrar apenas métodos com valores > 0
  const filtered: Record<PaymentMethod, number> = {} as Record<PaymentMethod, number>;
  for (const [method, amount] of Object.entries(base)) {
    if (amount > 0) {
      filtered[method as PaymentMethod] = amount;
    }
  }
  
  return filtered;
}
